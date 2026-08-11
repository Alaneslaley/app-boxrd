# Estado actual de GymBox Mobile — Fase 1

Fecha del diagnóstico: 10 de agosto de 2026

Repositorio: `C:\ESCUELA BOX RD\box-RD`

Rama/commit: `main` / `9d5c55614fdeb281c69cf0e39acfc2fcd76bcb37`

Política aplicada: diagnóstico sin implementar features, actualizar dependencias, editar generated, hacer commit, build EAS remoto ni despliegue.

## Resumen ejecutivo

```text
Sprint actual: Sprint 3 — EN PROGRESO
Último sprint realmente cerrado: Sprint 2 — cierre funcional/local; evidencia autenticada externa aún pendiente
Gate actual: G3 — PENDIENTE
Release actual: 0.2.0 en package.json, app.config.ts y eas.json
OpenAPI: 3.1.0 / 1.3.0, sincronizado semánticamente con backend local y staging; generated sin drift
Tests: 27 suites, 191 passed, 0 failed, 0 skipped
E2E: no ejecutado; no existe cobertura Maestro de Sprint 3
Staging: contrato público verificado; flujos autenticados financieros no verificados
Próximo paso: completar los P0 reales de Sprint 3 y su evidencia antes de reevaluar G3
```

Decisión canónica: **C — falta código y evidencia de Sprint 3**.

```text
Sprint 3: EN PROGRESO
G3: PENDIENTE
Próximo: finalizar Sprint 3
```

`SPRINT_3_CIERRE.md` existe, pero su declaración “APROBADO localmente” no es suficiente ni coincide con la Definition of Done y la auditoría actual. El contrato está listo; el bloqueo ya no es OpenAPI. Los bloqueos actuales son implementación financiera incompleta, pruebas ausentes, CI remoto fallido y falta de validación autenticada.

## Alcance y evidencia examinada

- Documentación obligatoria completa: arquitectura, blueprint, dossier, sprints, informe de color, README, changelog y ADR-MOB-001..007 embebidos en arquitectura/dossier.
- Cierres: `SPRINT_2_CIERRE.md`, `SPRINT_3_BLOQUEOS_Y_RESUMEN.md` y `SPRINT_3_CIERRE.md`.
- `SPRINT_3_BLOQUEOS_RESTANTES.md`: **no existe**.
- Configuración: package/lockfile, Expo, EAS, TypeScript, ESLint, Jest, Metro, ambientes y CI.
- Código completo de auth/sesión, query, estudiantes, instructor, caja, pagos, recibo, media protegida y rutas relacionadas.
- OpenAPI móvil, copia generada del backend local y OpenAPI desplegado en staging.
- Baseline local, dependencias, export Android local y estado público de GitHub Actions.
- Referencia oficial versionada de Expo SDK 57: SDK 57 usa React Native 0.86, React 19.2.3 y Node mínimo 22.13.x.

No se ejecutó `npm ci` real porque instalaría dependencias y la política del diagnóstico prohíbe instalaciones. `npm ci --dry-run --ignore-scripts --no-audit` sí pasó y no modificó dependencias.

## Estado Git

| Comprobación | Resultado |
|---|---|
| `git status --short` | Limpio |
| Rama | `main` |
| HEAD | `9d5c556` — `contrato actualizado` |
| `git diff --stat` | Sin cambios |
| `git diff --check` | Aprobado |
| `origin/main` | Apunta al mismo HEAD |
| Último CI para HEAD | Fallido; `npm ci` falló y el resto de los pasos fue omitido |
| Run público | `https://github.com/Alaneslaley/app-boxrd/actions/runs/31440452748` |

El detalle público confirma el paso fallido, pero GitHub no permite descargar el log sin autenticación; la causa concreta de `npm ci` no queda demostrada. El dry-run local pasa, por lo que no debe inventarse una causa.

## Stack real

| Elemento | Esperado | Instalado/resuelto | Estado |
|---|---|---|---|
| Expo | SDK 57 | `57.0.9`; Doctor espera `~57.0.12` | PARCIAL — SDK correcto, parche atrasado |
| React Native | 0.86 | `0.86.2` | APROBADO |
| React | 19.2.x | `19.2.3` | APROBADO |
| TypeScript | strict | `6.0.3`; `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride` | APROBADO |
| Expo Router | SDK 57 | `57.0.9`; Doctor espera `~57.0.12` | PARCIAL |
| TanStack Query | 5.x | `5.101.4` | APROBADO |
| expo-image | SDK 57 | `57.0.1`; Doctor espera `~57.0.2` | PARCIAL |
| SecureStore | SDK 57 | `57.0.1` | APROBADO |
| Jest/RNTL | Jest 29 / RNTL | Jest `29.7.0`, RNTL `14.0.1`, jest-expo `57.0.3` | PARCIAL — jest-expo espera `57.0.4` |
| Maestro | requerido para E2E | comando no instalado | PENDIENTE |
| EAS | perfiles development/preview/production | `eas.json` y wrapper CLI `21.2.0`; sin build remoto probado | PARCIAL |

Expo Doctor detectó además parches atrasados en `expo-constants`, `expo-dev-client`, `expo-linking`, `expo-splash-screen` y `expo-updates`. No se actualizó ningún paquete. React Native permanece en 0.86; no se recomienda ni se evaluó RN 0.87.

## Baseline técnico actual

| Validación | Resultado | Evidencia |
|---|---|---|
| JSON OpenAPI | APROBADO | Parse correcto |
| `npm run verify:contract` | APROBADO con 3 warnings | 331 refs locales; branchId/branchName opcionales y auth sin 403/409 documentados |
| Regeneración OpenAPI a temporal | APROBADO | Dos archivos idénticos por SHA-256 a `src/generated/api` |
| `npm run typecheck` | APROBADO | Exit 0 |
| `npm run lint` | APROBADO | Exit 0 |
| `npm test -- --ci` | APROBADO | 27 suites / 191 tests |
| `npm run doctor` | FALLIDO | 19/20; nueve parches incompatibles con la expectativa actual de SDK 57 |
| `npx expo config --type public` | APROBADO | SDK 57.0.0, staging, versión 0.2.0 |
| `npm run verify:boundaries` | APROBADO | Sin violaciones detectadas por el script |
| `npm run verify:cycles` | APROBADO | Sin ciclos |
| `npm run validate:environments` | APROBADO | local/development/staging/production |
| Export Android a temporal | APROBADO | Bundle Hermes, 1,488 módulos |
| `git diff --check` final | APROBADO | Sin cambios de código |
| CI remoto | BLOQUEADO | Último run falló en instalación |

Comparación histórica:

| Corte | Suites | Tests | Cambio real |
|---|---:|---:|---|
| 29-jul conocido | 26 | 187 | baseline previo al supuesto cierre |
| `SPRINT_3_CIERRE.md` | 27 | 191 | cierre documental |
| Diagnóstico actual | 27 | 191 | +1 suite/+4 tests, únicamente del store de reintento de pago |

No hay pruebas nuevas de hooks de caja/pago, pantallas financieras, respuestas 201/200, conflictos 409/422, recibos o invalidaciones.

## OpenAPI y drift

### Resultado

| Fuente | OpenAPI | `info.version` | Paths | Operaciones | Schemas | Resultado |
|---|---:|---:|---:|---:|---:|---|
| Móvil `contracts/openapi/gymbox-openapi.json` | 3.1.0 | 1.3.0 | 31 | 37 | 49 | Canónico local |
| Backend local `target/openapi/gymbox-openapi-v1.json` | 3.1.0 | 1.3.0 | 31 | 37 | 49 | Igual salvo URL del server local |
| Staging `/v3/api-docs/gymbox-v1` | 3.1.0 | 1.3.0 | 31 | 37 | 49 | Igual semánticamente al móvil |

Hashes:

| Artefacto | SHA-256 |
|---|---|
| OpenAPI móvil, archivo | `49E17A0F004AA6F3DD8B27D5456588B7DD167D2AAE19B1D0299645BD8CBD2E01` |
| OpenAPI backend local, archivo | `FBA0EE753DBCA88A00E5018DF044D91226638721B5859962A3978FD5AD40B031` |
| OpenAPI staging, archivo | `ED259D0F98C846E4089D53247BEF7CBA4FA4ECBD40D7DBD5D99E54EE8D8AA5F8` |
| Canonical JSON móvil/staging | `5036FA8D465C570EECAC1EE59E4832C0BCF8B31DCA6213F19F5AE821D0AACC23` |
| Generated `index.ts` | `93484EE689C659FC9A4C780CB9C01E4A3D3F06C42F98F985AF1213ADDC48CDAA` |
| Generated `types.gen.ts` | `5F25B9A005E18C38F71AC83E0F60980562A068DD05AA61BDE8936CF96A1EF579` |

La diferencia de hash de archivo entre móvil y staging se debe a serialización/orden; la comparación profunda tiene **0 diferencias** y el hash canónico coincide. La copia backend local sólo difiere en `/servers/0/url`: `http://localhost` frente a staging HTTPS.

### Cobertura contractual por área

| Área | OpenAPI móvil | Backend final/desplegado | Código móvil | Prioridad | Acción |
|---|---|---|---|---|---|
| Auth | Sincronizado; 3 warnings no financieros | Igual | Implementado con guards runtime | P1 | Mantener warnings visibles |
| Estados de usuario | Enum ACTIVE/INACTIVE/SUSPENDED | Igual | Sólo ACTIVE permite sesión | OK | Ninguna para G3 |
| Students | Sincronizado | Igual | Búsqueda/detalle implementados | OK | Conservar evidencia externa pendiente |
| Memberships | `expirationStatus` y `daysUntilExpiration` | Igual | Usa clasificación backend | OK | Ninguna para G3 |
| Plans | type/status/MXN enum y precio backend | Igual | Pago no muestra precio informativo | P0 | Mostrar quote/importe autorizado antes de confirmar |
| Media | Binario protegido y 404 | Igual | Bearer en memoria; cache none para recibo | P1 | Pruebas de recibo/media |
| Instructor summary | `InstructorTodaySummary` | Igual | Mapper runtime y query | OK | Prueba staging pendiente |
| Cash current/open | MXN, 404 exacto, 409/422 | Igual | Parcial | P0 | Permisos, confirmación y tests |
| Cash close | Responde `ClosedCashRegisterSnapshot` | Igual | Usa erróneamente el tipo débil `CashRegisterSnapshot` | P0 | Consumir/mapear respuesta final exacta |
| Payments | 201/200/header/409/422, snapshot required | Igual | Parcial; sin mapper runtime | P0 | Completar intención/idempotencia/UX/tests |
| Receipts | Unión PENDING/READY/FAILED | Igual | Render parcial sin tests | P0 | Completar detalle y cobertura |
| Attendance | Endpoints existen; `decision` es string libre y schemas no required | Backend implementa cuatro decisiones | No implementado | P0 Sprint 4 | Endurecer contrato antes de Sprint 4 |

Conclusión OpenAPI: **SINCRONIZADO**. No hay resincronización P0 pendiente para Sprint 3.

## Estado por Sprint

| Sprint | Gate | Estado | Evidencia | Deuda |
|---|---|---|---|---|
| Sprint 0 — Fundación | G0 | APROBADO funcional/local | SDK 57, strict, feature-first, Query bridges, OpenAPI, FakeHttpClient, Jest/RNTL, Maestro preparado, CI definido | Doctor 19/20; CI rojo; sin evidencia iOS/development build actual |
| Sprint 1 — Auth/sesión/permisos | G1 | APROBADO funcional/local | Login, bootstrap, token en memoria/SecureStore, refresh single-flight, `/me`, protected routes, mustChangePassword, logout, traceId y tests | Maestro/staging real no ejecutados; README quedó stale |
| Sprint 2 — Instructor/alumnos/membresías | G2 | CERRADO funcional/local | Summary, búsqueda server-side paginada/debounce/cancelación, detalle, foto protegida, edad, nivel, membresía, estados y foreground | Maestro/staging autenticado no ejecutados |
| Sprint 3 — Caja/pagos/recibos | G3 | EN PROGRESO | Contrato y skeleton funcional presentes; 27/191 verde | P0 de código, tests, CI, staging y release |
| Sprint 4 — Asistencia/hardening/piloto | G4 | NO INICIADO | No existe feature/rutas de attendance | G3 pendiente y contrato attendance débil |

El último Sprint cerrado es **Sprint 2**. “Cerrado” aquí significa que el corte funcional/local está implementado y documentado; la evidencia externa de staging/Maestro no fue cerrada y se mantiene como deuda explícita. Sprint 3 no puede heredar esa etiqueta sólo porque exista `SPRINT_3_CIERRE.md`.

## Auditoría exhaustiva Sprint 3

| ID | Requisito | Código | Tests | E2E | Estado |
|---|---|---|---|---|---|
| MOB-0301 | Caja actual | Maneja 200 y sólo `404 CASH_REGISTER_NOT_OPEN` como no-open; otros errores propagan. La query se dispara antes de validar permiso y la pantalla no tiene estado offline explícito. | AUSENTE | AUSENTE | PARCIAL |
| MOB-0302 | Apertura | Request `openingAmount` + `MXN`, online, retry 0 e invalidación. No hay confirmación/resumen real, guard propio de permiso ni lock probado contra doble toque. | AUSENTE | AUSENTE | PARCIAL |
| MOB-0303 | Cierre | Envía id/current, counted y MXN; backend calcula difference. No usa `ClosedCashRegisterSnapshot`, omite notes, no muestra expected en resultado ni clasifica diferencia +/-/0; guard de permiso ausente. | AUSENTE | AUSENTE | PARCIAL |
| MOB-0304 | Formulario de pago | Parte de una membresía/alumno y ofrece CASH/TRANSFER/MANUAL_CARD; no captura PAN/CVV/referencias. `effectiveDate` se calcula en timezone del dispositivo, no en zona de negocio; no muestra monto informativo ni resumen de confirmación. | AUSENTE | AUSENTE | PARCIAL |
| MOB-0305 | Idempotencia | UUID criptográfico, header, 201/200/header replay y retry 0. Backend posee fingerprint canónico. El móvil no modela fingerprint/intención, no muestra replay y no tiene prueba/lock síncrono de doble toque ni UX específica 409. | AUSENTE | AUSENTE | PARCIAL |
| MOB-0306 | Resultado incierto | Detecta transport/timeout, persiste key+request mínimo y permite retry manual con misma key; sin auto retry/resume. No hay máquina de estados explícita, TTL, fingerprint, resolución global ni limpieza en logout. | UNIT parcial: 4 tests del store | AUSENTE | PARCIAL |
| MOB-0307 | Detalle/recibo | Folio, monto/moneda, método, effectiveDate y unión PENDING/READY/FAILED con media protegida. Omite `createdAt` y studentName; usa DTO crudo sin validación runtime; 404 es genérico. | AUSENTE | AUSENTE | PARCIAL |
| MOB-0308 | Invalidaciones | Tras éxito invalida `payments` (incluye detail/receipt por prefijo), cash, memberships e instructor summary. No repite pago por refetch. | AUSENTE | AUSENTE | PARCIAL |
| MOB-0309 | Pruebas/E2E | No existe matriz financiera real. | Sólo store mínimo | No hay YAML Sprint 3, Maestro ni staging manual | PENDIENTE |

### Hallazgos P0 de código Sprint 3

1. `CloseCashRegister` consume `CashRegisterSnapshot` aunque el contrato final responde `ClosedCashRegisterSnapshot`; el tipo débil vuelve opcionales campos que son terminales y obligatorios.
2. El pago no presenta el monto autoritativo antes de confirmar. El contrato de planes sí publica precio/MXN; la pantalla sólo promete que el servidor decidirá.
3. `effectiveDate` se deriva del timezone del dispositivo en UI, no de `America/Mexico_City` ni de un reloj/adaptador de negocio.
4. No existe un modelo durable de intención/fingerprint móvil. El backend sí usa SHA del payload canónico, pero el cliente sólo guarda key+request.
5. El pending payment no tiene TTL y no se elimina al logout; contradice el criterio explícito de seguridad.
6. El registro incierto es global y puede quedar oculto indefinidamente si se abre otra membresía.
7. Los formularios de abrir/cerrar caja carecen de guard propio de permisos ante deep link.
8. Los DTO financieros llegan a UI sin mapper/guard runtime; una respuesta malformed puede producir crash (`toFixed`) en una pantalla financiera.
9. No hay pruebas unitarias/integración/componentes de caja, registro, replay, 409, 422, recibos o invalidación.

## Matriz de pruebas y E2E Sprint 3

| Caso requerido | UNIT | COMPONENT | INTEGRATION | MAESTRO MOCK | MAESTRO REAL | STAGING MANUAL |
|---|---|---|---|---|---|---|
| current/open/close | AUSENTE | AUSENTE | AUSENTE | AUSENTE | AUSENTE | AUSENTE |
| CASH | AUSENTE | AUSENTE | AUSENTE | AUSENTE | AUSENTE | AUSENTE |
| TRANSFER | AUSENTE | AUSENTE | AUSENTE | AUSENTE | AUSENTE | AUSENTE |
| MANUAL_CARD | AUSENTE | AUSENTE | AUSENTE | AUSENTE | AUSENTE | AUSENTE |
| 201 inicial | AUSENTE | AUSENTE | AUSENTE | AUSENTE | AUSENTE | AUSENTE |
| 200 replay/header | AUSENTE | AUSENTE | AUSENTE | AUSENTE | AUSENTE | AUSENTE |
| misma key | Store únicamente | AUSENTE | AUSENTE | AUSENTE | AUSENTE | AUSENTE |
| 409 conflicto | AUSENTE | AUSENTE | AUSENTE | AUSENTE | AUSENTE | AUSENTE |
| 422 negocio | AUSENTE | AUSENTE | AUSENTE | AUSENTE | AUSENTE | AUSENTE |
| uncertain/TTL | Store parcial, sin TTL | AUSENTE | AUSENTE | AUSENTE | AUSENTE | AUSENTE |
| receipt PENDING/READY/FAILED | AUSENTE | AUSENTE | AUSENTE | AUSENTE | AUSENTE | AUSENTE |
| membership refresh | AUSENTE | AUSENTE | AUSENTE | AUSENTE | AUSENTE | AUSENTE |
| doble toque | AUSENTE | AUSENTE | AUSENTE | AUSENTE | AUSENTE | AUSENTE |
| 403 | Core genérico, no financiero | AUSENTE | AUSENTE | AUSENTE | AUSENTE | AUSENTE |
| offline | Query bridge genérico | AUSENTE | AUSENTE | AUSENTE | AUSENTE | AUSENTE |
| logout limpia pending | AUSENTE y código no lo hace | AUSENTE | AUSENTE | AUSENTE | AUSENTE | AUSENTE |

Entorno E2E actual:

- `maestro`: no instalado.
- Dispositivo ADB conectado: ninguno.
- Variables `GYMBOX_E2E_*`: ausentes.
- YAML disponibles: sólo Sprint 1 y Sprint 2.
- APK debug local: existe uno del 28-jul, anterior al cierre documental de Sprint 3.
- iOS build/evidencia: ausente.

## Arquitectura

| Criterio | Estado | Evidencia/deuda |
|---|---|---|
| `src/app` compone rutas | APROBADO | Rutas delgadas para caja/pagos |
| Core no importa features | APROBADO | boundary check |
| Shared no importa features | APROBADO | boundary check |
| UI no importa generated directamente | APROBADO literal | ESLint/boundary; sin embargo recibe DTO crudo desde hooks |
| Adapters traducen contrato | PARCIAL | auth/students/instructor sí; cash/payments no |
| DTO no llega a UI | BLOQUEADO | Cash/Payment/Receipt snapshots llegan sin modelo interno |
| No DTO duplicados | PARCIAL | `PaymentRequest` duplica la forma de `RegisterRequest` en UI |
| No ciclos | APROBADO | script verde |
| No `any` de producción | APROBADO | búsqueda sin usos de `any` TypeScript |
| No fetch en rutas/UI | APROBADO | cliente centralizado |
| Reglas financieras fuera de UI | BLOQUEADO | businessDate y construcción de intención viven en `PaymentScreens.tsx` |
| Generated actualizado | APROBADO | hashes idénticos a generación temporal |

## Seguridad y privacidad

| Control | Estado | Evidencia/deuda |
|---|---|---|
| Access token sólo memoria | APROBADO | `SessionService.accessToken` |
| Refresh token SecureStore | APROBADO | `ExpoSecureTokenVault`, device-only |
| Authorization centralizado | APROBADO | cliente HTTP y protected media |
| 403 sin logout | APROBADO | sólo 401 participa en refresh/invalidation |
| Pending payment mínimo | PARCIAL | key, membershipId, método y fecha; sin PII directa, pero sin TTL |
| Logout limpia pending attempt | BLOQUEADO | sólo limpia token y QueryClient; no borra `gymbox.payment.pending.v1` |
| Logs redactan Idempotency-Key | APROBADO | logger y test específico |
| Logs redactan PII/tokens/finanzas | APROBADO local | logger sanitizado; delegate actual es null |
| AsyncStorage | APROBADO | no se usa |
| Persistencia de mutations | APROBADO | no hay queue/persister |
| PAN/CVV/referencias no contractuales | APROBADO | no existen campos de captura |
| Media protegida | APROBADO en código | Bearer de memoria; recibo sin cache persistente |
| Passwords | APROBADO en código | RHF/Zod, sin log/persistencia |
| Capturas de pantalla | PENDIENTE | no hay control ni decisión aplicada |
| Clipboard | NO APLICA actual | no existe uso |
| Deep links | PARCIAL | protected routes; studentId valida UUID, paymentId no |

## Offline y resiliencia

| Regla | Estado | Evidencia |
|---|---|---|
| Sin financial mutation offline | PARCIAL | botones bloqueados por NetInfo; sin pruebas y mutations usan `networkMode: 'always'` |
| Sin persisted mutation queue | APROBADO | no existe persister/queue |
| Sin automatic replay | APROBADO | no auto-resume; retry 0 |
| Retry manual misma key | PARCIAL | código presente; sin TTL/tests de flujo |
| Sin check-in offline | NO APLICA todavía | attendance no implementado |

`networkMode: 'always'` evita que TanStack encole/pausa una mutación financiera, lo cual es coherente con “no queue”; la seguridad offline depende totalmente del botón/UI y requiere tests de carrera y cambios de red.

## Dependencias y vulnerabilidades

`npm outdated --json` encontró 20 paquetes con versión posterior. No se actualizó ninguno.

Parches Expo señalados por Doctor:

- `expo` 57.0.9 → 57.0.12
- `expo-constants` 57.0.8 → 57.0.10
- `expo-dev-client` 57.0.10 → 57.0.11
- `expo-image` 57.0.1 → 57.0.2
- `expo-linking` 57.0.4 → 57.0.5
- `expo-router` 57.0.9 → 57.0.12
- `expo-splash-screen` 57.0.5 → 57.0.6
- `expo-updates` 57.0.11 → 57.0.13
- `jest-expo` 57.0.3 → 57.0.4

`npm audit --json`:

| Clase | Directas | Transitivas | Severidad reportada |
|---|---|---|---|
| Runtime directas | `expo`, `react-native`, `expo-splash-screen` | Expo/Metro/RN toolchain y utilidades | Parte de 21 high + 8 moderate |
| Dev directas | `@hey-api/openapi-ts`, `@testing-library/react-native` | parser/YAML y test toolchain | Parte de 21 high + 8 moderate |
| Total | 5 directas afectadas | 24 transitivas afectadas | 29 total: 21 high, 8 moderate, 0 critical |

`npm audit --omit=dev` reportó 28 entradas (20 high, 8 moderate), aunque npm conservó paquetes marcados como dev/peer en el grafo. Las sugerencias automáticas incluyen downgrades incompatibles (por ejemplo Expo 53 o RN 0.72), por lo que **no debe ejecutarse `npm audit fix`**. Requiere triage controlado dentro de Expo SDK 57 después de cerrar el diagnóstico.

## Gate G3

| Criterio | Estado | Evidencia | Bloqueo |
|---|---|---|---|
| OpenAPI sincronizado | APROBADO | Canonical hash móvil=staging | — |
| Generated actualizado | APROBADO | Hashes exactos contra temporal | — |
| Caja current | PARCIAL | 200/404 exacto | Permiso/offline/tests |
| Apertura | PARCIAL | Request MXN y retry 0 | Confirmación, permiso, tests |
| Cierre | PARCIAL | Request correcto | Tipo final incorrecto, resultado incompleto |
| Difference backend | APROBADO | No se calcula en cliente | Falta test/UX +/-/0 |
| MXN | APROBADO | Enum contrato y payload fijo | Falta E2E |
| CASH | PARCIAL | Selector y backend autoritativo | Sin precheck/quote/test |
| TRANSFER | PARCIAL | Selector | Sin test |
| MANUAL_CARD | PARCIAL | Selector, sin PAN/CVV | Sin test |
| effectiveDate | PARCIAL | Se envía | Timezone de dispositivo y sin test |
| Monto backend | PARCIAL | Backend determina snapshot | No se muestra antes de confirmar |
| UUID | PARCIAL | `expo-crypto.randomUUID` | Sin test de factory/intención |
| Fingerprint | PARCIAL | Backend hashea payload canónico | Cliente no lo modela ni prueba end-to-end |
| 201 inicial | PARCIAL | Código acepta respuesta | Sin prueba/staging |
| 200 replay | PARCIAL | Código detecta status | Resultado replay ignorado en UI; sin prueba |
| Header replay | PARCIAL | Código lee header | Sin prueba |
| Uncertain | PARCIAL | Transport/timeout persiste intento | Sin estado explícito/TTL |
| Retry misma key | PARCIAL | Implementado | Sin integración/E2E |
| Sin auto retry | APROBADO | `retry: 0`, mutaciones no se reejecutan | Falta test financiero |
| Sin mutación offline | PARCIAL | UI bloquea | `networkMode: always`, sin test de carrera |
| Doble toque | PARCIAL | loading/disabled | Sin lock síncrono ni prueba |
| 409 | PENDIENTE | Error genérico | Sin UX/test/staging |
| 422 | PENDIENTE | Error genérico | Sin UX/test/staging |
| Detalle | PARCIAL | Pantalla existente | Falta createdAt, mapper y tests |
| Receipt PENDING | PARCIAL | Render existente | Sin test |
| Receipt READY | PARCIAL | Media protegida | Sin test |
| Receipt FAILED | PARCIAL | failureCode | Sin test |
| Media protegida | PARCIAL | Bearer en memoria, cache none | Sin staging/E2E |
| Invalidaciones | PARCIAL | payments/cash/memberships/instructor | Sin prueba |
| Unit | PARCIAL | 4 tests de store | Cobertura financiera insuficiente |
| Component | PENDIENTE | Ninguna financiera | — |
| Integration | PENDIENTE | Ninguna financiera | — |
| Maestro | PENDIENTE | No hay flujos Sprint 3 ni CLI | — |
| Staging | PENDIENTE | Sólo contrato público validado | Sin credenciales/seeds/flujo autenticado |
| CI | BLOQUEADO | Último run falló en `npm ci` | Causa exacta no disponible públicamente |
| Release 0.3.0 | PENDIENTE | Metadata sigue en 0.2.0 | G3 y evidencia |

**Resultado del Gate: G3 PENDIENTE.** No puede aprobarse con criterios P0 parciales, MOB-0309 pendiente y CI bloqueado.

## Readiness Sprint 4

| Dependencia | Estado | Evidencia/bloqueo |
|---|---|---|
| G3 | PENDIENTE | Bloqueo principal |
| OpenAPI attendance | PARCIAL | Endpoints existen; decision/status no enum/required |
| Permisos | APROBADO en catálogo | ASISTENCIAS_CONSULTAR/REGISTRAR presentes |
| Seeds | PENDIENTE | Existen docs/seeder backend; no evidencia de activación/credenciales staging |
| Maestro | BLOQUEADO | CLI ausente, sin flujo Sprint 3/4, sin dispositivo |
| Development build | PARCIAL | APK debug antiguo; no iOS/preview actual |
| Staging | PARCIAL | Contrato disponible; autenticación no validada |
| CI | BLOQUEADO | Último run rojo |
| MOB-0401..0409 | NO INICIADO | No existe feature/rutas attendance |

Conclusión única: **SPRINT 4 NO LISTO**.

No debe comenzar implementación de attendance hasta cerrar G3. En paralelo, backend puede endurecer el contrato attendance sin abrir alcance móvil: enum de cuatro decisiones, campos required, responses de negocio y seeds documentados/activos.

## Deuda priorizada

### P0 — rompe Gate G3/release

| ID | Deuda | Acción requerida |
|---|---|---|
| P0-01 | Close usa snapshot equivocado y resultado incompleto | Mapear `ClosedCashRegisterSnapshot`, mostrar expected/counted/difference y estados +/-/0 |
| P0-02 | Pago sin quote/monto informativo y fecha de negocio segura | Obtener/presentar importe autoritativo y resolver effectiveDate con timezone de negocio |
| P0-03 | Intención/idempotencia cliente incompleta | Modelar intención/fingerprint, una key por intención y lock de submit |
| P0-04 | Pending sin TTL ni limpieza de logout | Añadir timestamps/TTL, resolución segura y cleanup inyectado en logout |
| P0-05 | Permisos/confirmación de caja incompletos | Guards propios y resumen de confirmación |
| P0-06 | DTO financieros crudos en UI | Mappers/guards runtime para cash/payment/receipt |
| P0-07 | 409/422 y replay sin UX verificable | Estados explícitos, traceId y acciones seguras |
| P0-08 | MOB-0309 ausente | Unit/component/integration + Maestro financiero |
| P0-09 | CI remoto rojo | Reproducir/obtener log de `npm ci`, corregir y ejecutar pipeline completo |
| P0-10 | Staging financiero no certificado | Activar seeds seguros, build actual y matriz autenticada |

### P1 — calidad/compatibilidad antes de release

| ID | Deuda | Acción requerida |
|---|---|---|
| P1-01 | Expo Doctor 19/20 | Alinear sólo parches compatibles de SDK 57 en cambio separado y verificado |
| P1-02 | Audit 29 vulnerabilidades | Triage de advisories; evitar fixes/downgrades automáticos incompatibles |
| P1-03 | README/changelog stale | Actualizar estado real sólo después de cerrar G3 |
| P1-04 | paymentId no valida UUID | Rechazo local seguro antes de query |
| P1-05 | Capturas de pantalla sin decisión aplicada | Evaluar y documentar vistas financieras/PII |
| P1-06 | Auth OpenAPI warnings | Decidir branch opcional y documentar 403/409 |

### P2 — limpieza

| ID | Deuda | Acción requerida |
|---|---|---|
| P2-01 | Código financiero muy comprimido en una línea | Refactor legible sin alterar conducta, acompañado de tests |
| P2-02 | Invalidación global de memberships | Afinar a alumno/membresía tras tener tests |
| P2-03 | Documentos de cierre contradictorios | Añadir adenda factual; no borrar historia |

## Plan recomendado

Orden exacto, sin implementar en este diagnóstico:

1. Reabrir formalmente Sprint 3 y registrar que `SPRINT_3_CIERRE.md` es un cierre técnico provisional, no Gate G3.
2. Congelar el OpenAPI 1.3.0 actual para Sprint 3; ya está sincronizado y no debe tocarse salvo defecto demostrado.
3. Corregir primero el modelo de cierre: `ClosedCashRegisterSnapshot`, mapper runtime y resultado expected/counted/difference.
4. Diseñar una intención de pago inmutable con payload canónico, fingerprint, UUID único, timestamp/TTL y estado terminal/uncertain.
5. Integrar la limpieza de pending payment en logout sin violar límites de módulos, mediante puerto/callback de cleanup.
6. Corregir `effectiveDate` con `America/Mexico_City`, presentar monto/plan autoritativo y añadir resumen de confirmación.
7. Añadir guards propios de permisos para open/close y estados explícitos para 403/409/422/replay.
8. Introducir mappers/guards runtime financieros; impedir DTO crudo en UI.
9. Crear unit tests de mappers, intención, UUID, fingerprint, TTL, misma key, replay, 409, 422 e invalidaciones.
10. Crear component/integration tests de current/open/close, tres métodos, double tap, offline, uncertain y tres estados de recibo.
11. Crear flujos Maestro Sprint 3 con variables seguras y sin datos personales en Git.
12. Resolver el fallo `npm ci` de GitHub Actions y obtener pipeline completo en verde; después alinear los nueve parches SDK 57 en un cambio aislado si sigue siendo necesario.
13. Preparar build preview actual Android y evidencia equivalente iOS; instalar Maestro y usar dispositivo/simulador controlado.
14. Activar/confirmar seeds financieros de staging por canal seguro y ejecutar la matriz: open, 201, 200 replay/header, misma key, 409, 422, CASH/TRANSFER/MANUAL_CARD, uncertain, receipt PENDING/READY/FAILED, media, close, offline, 403 y logout.
15. Reejecutar baseline completo y confirmar `git diff --check`, Doctor 20/20, CI verde y cero P0.
16. Sólo entonces actualizar metadata/changelog a `0.3.0`, emitir evidencia de release interna y aprobar G3.
17. Antes de iniciar Sprint 4, endurecer OpenAPI attendance y verificar seeds/permisos; después reevaluar readiness.

## Respuestas directas

1. Último Sprint realmente cerrado: **Sprint 2**, funcional/localmente.
2. Sprint 3: **EN PROGRESO**; existe implementación parcial y un cierre documental no sustentado por su DoD.
3. MOB-0301..0308 existen parcialmente; MOB-0309 está pendiente. Ninguna historia 0301..0309 queda aprobada end-to-end.
4. OpenAPI móvil: **sí, sincronizado** con backend final local y staging; generated actualizado.
5. Gate G3: **no puede aprobarse**.
6. Release 0.3.0: **no está lista**; la metadata sigue en 0.2.0.
7. Sprint 4: **no se puede iniciar**; `SPRINT 4 NO LISTO`.
8. Trabajo siguiente: ejecutar el plan P0 anterior, obtener CI/staging/Maestro y reevaluar G3.
