# Cierre reevaluado — Sprint 3 GymBox Mobile

Fecha: 2026-08-10  
Alcance: MOB-0301 a MOB-0309  
Base: `9d5c55614fdeb281c69cf0e39acfc2fcd76bcb37` (`main` = `origin/main`)  
Release conservada: `0.2.0`

## 1. Motivo de la reevaluación

`SPRINT_3_CIERRE.md` se conserva como documento histórico. Era un cierre
técnico provisional: aún entregaba DTO financieros demasiado cerca de UI, el
cierre usaba una frontera no terminal, la fecha dependía del dispositivo, la
intención incierta carecía de TTL/fingerprint/logout cleanup y no existían E2E
Sprint 3. El diagnóstico del 10-ago-2026 confirmó además Doctor 19/20 y el último
CI remoto rojo en `npm ci`.

La implementación financiera queda cerrada localmente y verificada, pero Gate
G3 no queda aprobado por evidencia externa ausente y por el parcheo SDK 57
aislado pendiente.

## 2. Fuentes y baseline

Se revisaron el diagnóstico vigente, Arquitectura, Blueprint, Dossier, Sprints,
informe de color, cierres Sprint 2/3, bloqueos Sprint 3, README, CHANGELOG,
configuración Expo/EAS/TypeScript/ESLint/Jest, contrato/generado, workflows,
árbol `src` y Maestro. Se consultó documentación oficial versionada Expo SDK 57,
Expo Router, Crypto, SecureStore/EAS, TanStack Query v5, React Hook Form, Zod y
Maestro antes de codificar.

Baseline confirmado: OpenAPI 3.1/GymBox 1.3.0 sincronizado, generated exacto,
27 suites/191 tests, release 0.2.0, sin E2E financiero y CI remoto rojo.

## 3. Arquitectura financiera final

```text
route/screen
  → application hook/use case (permiso + online + lock)
    → authorizedRequest
      → API adapter (única capa financiera que importa generated)
        → modelo interno inmutable y validado
```

- `CashRegister` representa exclusivamente OPEN.
- `ClosedCashRegister` exige el snapshot terminal completo y conserva la
  diferencia firmada del backend.
- `PaymentDraft`, `PaymentIntent`, `Payment`, `PendingReceipt`, `ReadyReceipt` y
  `FailedReceipt` separan contrato, intención y presentación.
- Un guard malformed produce `MALFORMED_FINANCIAL_RESPONSE`; ningún valor llega
  a `toFixed` sin validar.
- `FinancialOperationLock` revalida permiso/red de forma síncrona y bloquea una
  segunda mutación, sin debounce, cola ni retry automático.

## 4. Caja — MOB-0301/0302/0303

- Current sólo habilita la query con `CAJA_CONSULTAR`; deep links sin permiso no
  disparan HTTP. Sólo `404 CASH_REGISTER_NOT_OPEN` se transforma en `null`.
- Offline, 403, error, loading, open y not-open son estados distintos.
- Open usa confirmación en dos pasos, MXN fija y body exacto
  `{ openingAmount, currency }`.
- Close usa `ClosedCashRegisterSnapshot` y body exacto
  `{ cashRegisterId, countedAmount, currency, notes? }`.
- Expected, counted, difference, status, closedAt, closedBy y currency se toman
  del backend. Sólo la etiqueta visual deriva de `difference`: cero/cuadrada,
  positivo/sobrante, negativo/faltante.
- Open/close usan lock, `retry: 0`, `networkMode: always` con revalidación online
  al submit e invalidación únicamente tras éxito.

## 5. Pago — MOB-0304/0305/0306

- La ficha pasa membershipId, planId y studentId validados; el formulario carga
  el precio informativo del plan, no permite editarlo y nunca envía `amount`.
- CASH refresca caja en la confirmación final; TRANSFER y MANUAL_CARD no la
  requieren. No existen campos PAN, CVV, vencimiento, titular, banco, CLABE ni
  referencias.
- `ZonedBusinessDateProvider` resuelve `yyyy-MM-dd` en
  `America/Mexico_City`, fuera de UI y sin aritmética manual de offsets.
- La key UUID v4 nace después de la confirmación con `expo-crypto.randomUUID`.
- Fingerprint SHA-256 canónico:
  `membershipId|method|effectiveDate`; no incluye monto, PII ni timestamps.
- `POST /payments` valida únicamente `201 + false` como created y `200 + true`
  como replayed. Header ausente o combinaciones cruzadas son anomalía.
- Timeout/fallo de transporte sin response es uncertain; cualquier HTTP
  recibido no lo es. No hay auto retry ni auto resume.
- Pending v2 guarda sólo versión, estado, key, fingerprint, membershipId,
  método, fecha y timestamps; TTL exacto 24 h, schema/UUID/fecha/fingerprint
  revalidados, sin envío automático.
- El guard global restaura pending antes de habilitar otro formulario, incluso
  si pertenece a otra membresía. Retry reutiliza exactamente el mismo intent.
- Logout inyecta `SensitiveLocalStateCleanup`; limpia token, cache y pending sin
  crear dependencia `core → payments`.

## 6. Errores, permisos y offline — MOB-0306

Se mapearon sólo codes presentes en el contrato: caja ya abierta/cerrada/no
abierta/requerida, currency mismatch, idempotency conflict, fecha inválida,
membresía no renovable, plan inactivo y pago/recibo no encontrado. `traceId` se
conserva. 403 no se trata como 401 ni cierra sesión. Todas las rutas financieras
validan permiso y los UUID de navegación aplicables. Ninguna mutación se encola
offline o se persiste en TanStack.

## 7. Detalle, recibos y media — MOB-0307

- Payment detail muestra folio, monto/moneda autoritativos, método, concepto,
  effectiveDate, createdAt y studentName opcional desde modelo validado.
- PENDING no accede a media y sólo ofrece refresh manual.
- READY exige fileId/generatedAt y usa la infraestructura bearer centralizada
  con URL sin token y `cachePolicy="none"`.
- FAILED exige failureCode, no accede a media y no inventa regeneración.
- Fallos 403/404 de media degradan a un estado genérico seguro; no persisten el
  recibo, no muestran el fileId y no cierran sesión.

## 8. Invalidaciones — MOB-0308

Created y replay invalidan después del éxito: lista de payments, detalle exacto,
receipt, membresía actual, membresías del alumno y resumen instructor. CASH
añade cash current. El detalle confirmado se siembra con el snapshot del
servidor. No se invalida todo el QueryClient ni se altera expected localmente.

## 9. Pruebas — MOB-0309

Resultado final: **39 suites / 319 tests / 0 snapshots / 319 passed**. Son 12
suites y 128 tests más que el baseline, además de ampliar SessionService y el
pending store existentes.

Cobertura nueva:

- unit: cash/payment/receipt adapters, modelos, parsing, difference +/−/0,
  BusinessDate, UUID, intent, SHA-256, TTL/restore, error mapping y logout;
- application/integration: bodies/headers exactos, current/open/close,
  201/200, anomalies, uncertain, same key, locks, offline/permission e
  invalidaciones precisas;
- RNTL: caja/open/close, quote, confirmación, tres métodos, pending global,
  replay, uncertain, 409/422/traceId, detalle, receipts y media fallida.

## 10. Maestro

Se añadieron 14 flujos `sprint-3-*.yaml` y dos helpers. Los 25 YAML totales
parsean sin error. Cubren caja no-open/open/close, tres métodos, permisos,
offline, replay, uncertain, receipts PENDING/READY/FAILED y logout cleanup.

No se ejecutaron: no hay binario/dispositivo, credenciales, seed ni proxy one-shot
en este entorno. Los escenarios sufijados `-external` hacen explícito ese
prerrequisito; no contienen bypasses ni secretos. Estado: **PENDIENTE EXTERNO**.

## 11. Contrato y generated

`npm run verify:contract` pasó con 331 referencias y tres warnings históricos
de auth. La generación a temporal produjo dos archivos idénticos byte por byte.

```text
contract SHA-256: 49E17A0F004AA6F3DD8B27D5456588B7DD167D2AAE19B1D0299645BD8CBD2E01
index.ts SHA-256: 93484EE689C659FC9A4C780CB9C01E4A3D3F06C42F98F985AF1213ADDC48CDAA
types.gen.ts SHA-256: 5F25B9A005E18C38F71AC83E0F60980562A068DD05AA61BDE8936CF96A1EF579
```

No se editó OpenAPI ni `src/generated/api`.

## 12. Validaciones locales

| Comando | Resultado |
|---|---|
| `npm ci --dry-run` | APROBADO, 3 s |
| `npm ci` | APROBADO, 1,158 paquetes, 69.6 s |
| `npm run verify:contract` | APROBADO; tres warnings auth conocidos |
| generación OpenAPI temporal + hash/diff | APROBADO; 2/2 archivos exactos |
| `npm run typecheck` | APROBADO |
| `npm run lint` | APROBADO |
| `npm test -- --ci` | APROBADO; 39/39, 319/319 |
| `npm run verify:boundaries` | APROBADO |
| `npm run verify:cycles` | APROBADO; 0 ciclos |
| `npm run validate:environments` | APROBADO; 4 ambientes |
| `npm run export` | APROBADO; Android, 1,498 módulos, bundle 3.8 MB |
| YAML parse | APROBADO; 25 archivos |
| `git diff --check` | APROBADO; sólo avisos CRLF informativos |
| `npm run doctor` | PENDIENTE; 19/20, nueve patches SDK 57 |

Node local es 24.18.0 y npm 11.5.2; el workflow usa Node 24, superior al mínimo
22.13 documentado para SDK 57.

## 13. CI

El último run público es Mobile quality #12, commit base `9d5c556`, y falla en
“Install from lockfile”. Checkout y Node 24 pasan; todo lo posterior se omite.
La API sólo publica exit code 1; descargar logs exige permisos de administrador,
por lo que no hay causa remota demostrada.

Localmente `npm ci` y todas las etapas funcionales pasan. El workflow exacto aún
fallaría en Doctor 19/20. No se cambió workflow, lockfile ni package manager y no
se usó `--legacy-peer-deps`. Estado: **CI PENDIENTE** y **CI REMOTO PENDIENTE
EXTERNO**.

## 14. Expo Doctor y audit

Doctor espera nueve patches dentro de SDK 57 (`expo` 57.0.12 y módulos
asociados). No existe bloqueo de export/build y la política prohíbe mezclar una
actualización masiva con el cierre P0; deben alinearse en un PR posterior con
todos los gates.

Audit cambió a 33 entradas (25 high/8 moderate/0 critical). No hay explotación
runtime financiera demostrada y npm propone downgrades incompatibles a Expo 53
o RN 0.72. El detalle por paquete está en
`DEPENDENCY_AUDIT_TRIAGE_SPRINT_3.md`. No se ejecutó audit fix.

## 15. Staging

El contrato público está sincronizado. La matriz autenticada, seeds y variables
se documentan en `STAGING_SPRINT_3_RUNBOOK.md`; todas las filas permanecen
**PENDIENTE EXTERNO**. No se inventaron credenciales ni se desplegó nada.

## 16. Archivos afectados

```text
src/app/                              rutas payment + cleanup composition
src/core/financial/                   lock y presentación de errores
src/core/session/                     puerto cleanup + pruebas
src/core/time/                        BusinessDateProvider zonificado
src/core/validation/                  UUID runtime
src/features/cash/api|model|application|ui/
src/features/payments/api|model|application|ui/
src/features/students/                planId/ruta e invalidation key
e2e/maestro/                          14 flows + 2 helpers + README
STAGING_SPRINT_3_RUNBOOK.md
DEPENDENCY_AUDIT_TRIAGE_SPRINT_3.md
SPRINT_3_CIERRE_REEVALUADO.md
```

Se preservó el cierre histórico. No se modificaron backend, OpenAPI, generated,
package metadata, lockfile, workflow, attendance ni producción.

## 17. Gate G3

| Criterio | Estado | Evidencia | Bloqueo |
|---|---|---|---|
| OpenAPI sincronizado | APROBADO | verify + SHA | — |
| Generated actualizado | APROBADO | temporal exacto 2/2 | — |
| Caja current | APROBADO | unit/application/RNTL | — |
| Apertura | APROBADO | confirmación/body/lock tests | — |
| Cierre final snapshot | APROBADO | adapter terminal + UI | — |
| Difference backend | APROBADO | +/−/0 y sin recálculo | — |
| MXN | APROBADO | adapters/requests/UI | — |
| CASH | APROBADO | caja final + request exacto | — |
| TRANSFER | APROBADO | RNTL/integration | — |
| MANUAL_CARD | APROBADO | sin PAN/CVV + tests | — |
| Business effectiveDate | APROBADO | zona México + 6 tests | — |
| Monto informativo | APROBADO | quote/UI; no amount body | — |
| UUID | APROBADO | crypto + guard + 5 tests | — |
| Fingerprint | APROBADO | SHA-256 canónico | — |
| 201 inicial | APROBADO | 201/false test | Staging pendiente |
| 200 replay | APROBADO | 200/true test + UI | Staging pendiente |
| Header replay | APROBADO | cuatro combinaciones | Staging pendiente |
| Uncertain | APROBADO | clasificación/store/UI | Proxy externo pendiente |
| TTL 24h | APROBADO | restore/expiry tests | — |
| Retry misma key | APROBADO | intent restaurado/integration | E2E pendiente |
| Logout cleanup | APROBADO | SessionService tests | E2E pendiente |
| Sin auto retry | APROBADO | queries/mutations retry false/0 | — |
| Sin mutación offline | APROBADO | race/precondition tests | E2E pendiente |
| Doble toque | APROBADO | lock síncrono, una request | E2E pendiente |
| 409 | APROBADO | mappings/RNTL | Staging pendiente |
| 422 | APROBADO | mappings/RNTL | Staging pendiente |
| Detalle | APROBADO | adapter/RNTL | Staging pendiente |
| Receipt PENDING | APROBADO | unión/RNTL sin media | Staging pendiente |
| Receipt READY | APROBADO | file requerido/media segura | Staging pendiente |
| Receipt FAILED | APROBADO | failureCode/sin media | Staging pendiente |
| Media protegida | APROBADO | bearer, no URL token, cache none | Dispositivo/staging pendiente |
| Invalidaciones | APROBADO | keys exactas integration | — |
| Unit | APROBADO | 39 suites/319 total | — |
| Component | APROBADO | cash/payment/receipt RNTL | — |
| Integration | APROBADO | API/adapters/use cases | — |
| Maestro | PENDIENTE EXTERNO | 14 flows preparados/YAML válido | binario, seeds, credenciales, proxy |
| Staging | PENDIENTE EXTERNO | runbook completo | credenciales/seeds |
| CI | PENDIENTE EXTERNO | local funcional verde; run #12 rojo | log remoto/corrida sobre cambios |
| Expo Doctor | PENDIENTE | 19/20 | nueve patches SDK 57 en PR separado |
| Release 0.3.0 | PENDIENTE | metadata sigue 0.2.0 | Gate completo |

Clasificación honesta:

- Sprint 3: **FUNCIONALMENTE CERRADO LOCALMENTE**.
- `G3 LOCAL APROBADO`: **no se declara** mientras Doctor sea 19/20.
- `G3 EXTERNO PENDIENTE`: **sí**, por Maestro real, staging y CI remoto.
- `G3 APROBADO`: **no**.

## 18. Release

Se mantiene `0.2.0` en package, app config y EAS. No se prepara 0.3.0 hasta que
Doctor/CI/Maestro/staging estén verdes sobre el mismo commit. No se creó build
EAS, tag, release ni artefacto de producción.

## 19. Deuda P1/P2

- P1 capturas sensibles: **DOCUMENTADO**, sin solución experimental. Evaluar en
  hardening con prueba Android/iOS y documentación oficial SDK 57.
- Alinear nueve patches Expo 57 y volver a ejecutar Doctor/gates.
- Remediar audit en PR separado, empezando por js-yaml/brace-expansion sin
  downgrades incompatibles.
- Ejecutar matrices Maestro/staging con fixtures sintéticos y proxy one-shot.
- Obtener log administrativo o nueva corrida CI para demostrar la causa remota.

## 20. Readiness de Sprint 4

No se avanzó a attendance. Aunque los P0 financieros están corregidos y la
evidencia local funcional está verde, las reglas originales exigen CI, E2E
financiero y staging autenticado antes del siguiente sprint.

**SPRINT 4 NO LISTO**
