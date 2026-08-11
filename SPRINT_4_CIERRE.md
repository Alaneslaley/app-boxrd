# Cierre Sprint 4 — GymBox Mobile Fase 1

Fecha: 2026-08-10  
Rama: `main`  
Commit base: `c77e0de77b3f3fc2a85691c4cdb66b89dc8faac2`  
Versión conservada: `0.2.0`  
Estado: **CIERRE LOCAL APROBADO / CERTIFICACIÓN EXTERNA PENDIENTE**

No se hizo commit, push, merge, tag, build EAS remoto, publicación ni despliegue.
No se cambió metadata a `1.0.0-rc.1`.

## 1. Documentación revisada

Se revisaron los documentos canónicos del repositorio, el cierre/runbook/audit de
Sprint 3, el OpenAPI 3.1 y generated. Para SDK/tooling se consultaron las fuentes
oficiales vigentes, en particular:

- Expo SDK 57, Router, SecureStore, Crypto, Image, DevClient, ScreenCapture,
  Jest/Expo y EAS Build;
- React Native 0.86: AppState, AccessibilityInfo y accesibilidad;
- TanStack Query v5, NetInfo, React Hook Form 7, Zod 4, Jest 29.7,
  React Native Testing Library y Maestro.

La decisión de capturas se basó en ScreenCapture SDK 57 estable (`~57.0.1`): se
protege toda la experiencia interna sin pedir permisos de galería ni usar APIs
experimentales.

## 2. Baseline y Gate de entrada

| Dimensión | Entrada S4 | Resultado de cierre |
|---|---|---|
| Git | `c77e0de`, worktree limpio | cambios S4 sin commit, base preservada |
| versión | `0.2.0` | `0.2.0` |
| contrato | OpenAPI 3.1/GymBox 1.3, sin drift | verificado; 331 refs, 3 warnings backend |
| generated | sincronizado | 2 archivos iguales a generación temporal |
| tests | 39 suites/319 tests | 43 suites/343 tests |
| Doctor | 19/20, 9 patches | 20/20 |
| audit | 25 high/8 moderate/0 critical | 16 high/8 moderate/0 critical |
| CI remoto | rojo | último run `31452996436` rojo en `npm ci`; cambios actuales no enviados |
| Maestro | 14 flows S3 preparados | 8 S4 añadidos; 35 YAML totales válidos, cero ejecutados |
| staging | financiero pendiente | TLS/401 comprobado; funcional autenticado pendiente |
| Android | export local aprobado | export aprobado; build APK actual pendiente |
| iOS | sin evidencia | pendiente externo |
| seeds | ausentes | especificados, no entregados |

Diagnóstico de entrada: el producto financiero estaba cerrado sólo localmente;
faltaban toolchain, CI, E2E, staging y plataformas. Attendance no existía. La
arquitectura feature-first y los servicios de sesión/query/permissions eran
reutilizables sin reescribir finanzas.

## 3. Inventario contractual attendance

| Operación | Shape usado |
|---|---|
| `GET /api/v1/attendance/today?page&size` | `PageResponseAttendanceResponse` |
| `GET /api/v1/attendance/student/{studentId}?page&size` | `PageResponseAttendanceResponse` |
| `POST /api/v1/attendance/check-in` | body exacto `CheckInRequest { studentId }` |
| invalidación relacionada | `/instructor/today/summary` mediante query key pública |

`AttendanceResponse` conserva los snapshots reales: id/branch/student, fecha,
hora, status, edad/categoría/nivel y membresía al evento, además de nombre
opcional. `CheckInResponse.decision` llega como `string`; el adapter lo cierra a
cuatro literales. No se añadieron override, QR, cancel/delete ni payloads extra.

## 4. Arquitectura y diseño

```text
src/features/attendance/
├── api/             adapter runtime + pruebas
├── application/     queries, mutación, lock + pruebas
├── model/           tipos readonly
├── ui/              today/history/check-in + pruebas
└── index.ts          API pública
```

Rutas/UI no importan generated ni ejecutan HTTP. Attendance consume sólo los
índices públicos de instructor/students. `verify:boundaries` y `verify:cycles`
lo confirman.

## 5. Implementación S4-A..S4-L / MOB-0401..0410

| Bloque / MOB | Resultado local |
|---|---|
| S4-A | docs, contrato, gate, diagnóstico, diseño y plan completados antes del cambio funcional |
| S4-B / MOB-0401 | today/history paginados, dedupe y snapshots históricos |
| S4-C / MOB-0402/0403 | selección desde ficha, revisión, POST exacto y cuatro decisiones |
| S4-D / MOB-0404/0405 | invalidaciones precisas, lock por alumno y doble defensa offline |
| S4-E | 4 suites/24 pruebas nuevas de attendance |
| S4-F / S3-X1 | 9 patches SDK 57; Doctor 20/20 |
| S4-G / MOB-0407/0408 | FlatList, accesibilidad, PII/logs y screen capture |
| S4-H / MOB-0406 | 8 flows + helpers + validación YAML; ejecución pendiente |
| S4-I / S3-X3/X4 | workflow reforzado y staging no-auth verificado; remoto/autenticado pendiente |
| S4-J | perfil preview listo; Android/iOS instalados pendientes |
| S4-K / MOB-0409 | manual, soporte, rollback, incidentes, readiness y defect register |
| S4-L / MOB-0410 | gates locales verdes; defectos de piloto pendientes porque no hubo piloto |

## 6. Matriz de decisiones

| Decisión | UI | Mutación/invalidation | Pago |
|---|---|---|---|
| `ALLOWED` | éxito confirmado + hora si existe | invalida today, history del alumno y summary | no |
| `ALREADY_REGISTERED` | mensaje explícito “ya registrada”, nunca éxito nuevo | mismas lecturas se reconcilian; no repite POST | no |
| `BLOCKED_EXPIRED_MEMBERSHIP` | warning, “no se registró” | no crea ni inventa asistencia | CTA sólo con `PAGOS_REGISTRAR` y membership/plan reales |
| `BLOCKED_INACTIVE_STUDENT` | danger, “no se registró” | sin override ni asistencia | no |
| desconocida/malformed | `ATTENDANCE_CONTRACT_INVALID` 502 | sin retry ni invalidación de éxito | no |

Si el backend omite metadata de siguiente página, el adapter falla cerrado con
`last=true`; no adivina páginas. Si llega attendance, su `studentId` debe
coincidir con el alumno solicitado.

## 7. Matriz offline y duplicación

| Riesgo | Defensa UI | Defensa application/HTTP | Prueba |
|---|---|---|---|
| check-in offline | botón deshabilitado + banner/explicación | `onlineManager`, error local, networkMode always, cero HTTP | UI + lock |
| doble toque | botón loading/disabled | lock síncrono por studentId antes de promise | lock concurrente |
| auto retry | no acción automática | `retry: 0` | request exacto/una llamada |
| 401 durante POST | confirmación única | `allowRefresh:false`; no replay automático | request exacto |
| cola/persistencia | mensaje “no se encola” | no storage/pending para attendance | inspección + tests |
| datos offline | banner; lectura sólo si ya existe memoria | Query cache sólo en memoria; logout limpia | suite previa |

## 8. Matriz de permisos

| Pantalla/acción | Permiso cliente | Backend sigue autoritativo |
|---|---|---|
| today/history | `ASISTENCIAS_CONSULTAR` | sí |
| check-in | `ASISTENCIAS_REGISTRAR` + ficha visible con `ALUMNOS_CONSULTAR` | sí |
| membresía en confirmación | `MEMBRESIAS_CONSULTAR` | sí; si falta, servidor decide |
| CTA pago vencido | `PAGOS_REGISTRAR` + plan/membership reales | sí |
| alumno/foto | `ALUMNOS_CONSULTAR` + media autenticada | sí |

Deep links validan UUID; un guard de UI nunca sustituye el 403 del servidor.

## 9. Pruebas y gates finales

| Comando | Resultado |
|---|---|
| `npm ci` | PASS, 1,159 paquetes |
| `npm run verify:contract` | PASS, 331 refs; 3 warnings conocidos |
| `npm run verify:generated` | PASS, 2 archivos byte-identical en temporal |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm test -- --ci` | PASS, 43/43 suites, 343/343 tests |
| `npm run verify:boundaries` | PASS |
| `npm run verify:cycles` | PASS |
| `npm run validate:environments` | PASS |
| `npm run doctor` | PASS, 20/20 |
| `npm run validate:maestro` | PASS estático, 35 YAML/8 S4 |
| `npm run export` | PASS, Android 1,510 módulos, Hermes 3.8 MB |
| `git diff --check` | PASS; sólo warnings informativos LF→CRLF |

Las 24 pruebas attendance cubren adapters, decisiones, response malformed,
payload, paginación fail-closed, rutas, dedupe, invalidaciones, lock/offline,
permisos, confirmación, resultado replay y CTA vencido.

## 10. Hardening, seguridad y dependencias

- Patches aplicados sin salir de Expo 57/RN 0.86/React 19.2.3:
  `expo 57.0.12`, constants 57.0.10, dev-client 57.0.11, image 57.0.2,
  linking 57.0.5, router 57.0.12, splash 57.0.6, updates 57.0.13 y
  jest-expo 57.0.4.
- `expo-screen-capture 57.0.1` protege todo el stack interno con la clave
  `gymbox-internal`; no se solicitaron permisos para listeners.
- `js-yaml` se corrigió de 4.3.0 a 4.3.1 mediante override compatible.
- Audit final: 16 high, 8 moderate, 0 critical, 24 total. Permanecen en
  Expo CLI/Metro/RN/tooling y sus fixes sugeridos implican downgrades/majors
  incompatibles. No se ejecutó `npm audit fix`.
- No hay `console.*` de producto. El logger sanitiza tokens, Authorization,
  email, teléfono y errores; tests de observabilidad siguen verdes.
- Tokens/fotos/recibos conservan las defensas de Sprints previos.

La aceptación temporal del audit sigue pendiente de Product Owner/seguridad.

## 11. Accesibilidad y rendimiento

- touch targets heredados de `AppButton` tienen mínimo 48 px;
- botones, radio, badges, alerts y estados exponen roles/labels/state;
- el resultado de check-in usa `accessibilityRole=alert`, anuncio y foco;
- offline/loading/error/empty son explícitos;
- today/history usan `FlatList`, paginación, dedupe y refresh, sin ScrollView
  anidado;
- consultas tienen query keys precisas, staleTime y no retry para attendance;
- foto protegida mantiene `expo-image` sin caché persistente.

No se midieron los objetivos de 5 s/10 s ni se ejecutó TalkBack/VoiceOver; esos
datos requieren previews/dispositivos.

## 12. Maestro y full E2E

Se conservaron los flows existentes y se añadieron:

1. `sprint-4-attendance-today`
2. `sprint-4-check-in-allowed`
3. `sprint-4-check-in-already-registered`
4. `sprint-4-check-in-expired`
5. `sprint-4-check-in-inactive`
6. `sprint-4-check-in-offline`
7. `sprint-4-check-in-forbidden`
8. `sprint-4-full-phase1`

Los YAML no tienen secretos/PII real, sleeps ni dependencia de orden y usan
seeds variables/helpers. Estado: **PREPARADOS / NO EJECUTADOS**. `maestro` no
está instalado y `adb devices` está vacío.

## 13. CI

El workflow usa Node 24 y conserva `npm ci`, Doctor, lint, typecheck, unit,
components, contrato, generated temporal, boundaries, cycles, ambientes,
validación Maestro y export. No tiene `continue-on-error` ni
`--legacy-peer-deps`.

El último run público real es `31452996436` sobre `c77e0de`: falló en
**Install from lockfile**. La API de GitHub expone el paso, pero el endpoint de
logs devuelve 403 “Must have admin rights”. El lockfile actual pasa localmente;
sin commit/push autorizado no existe evidencia remota de esta revisión.

Estado CI: **LOCAL VERDE / REMOTO PENDIENTE EXTERNO**.

## 14. Staging

`https://box-rd-backend.onrender.com/api/v1/auth/me` y
`/api/v1/attendance/today` respondieron 401 sin token, TLS verify 0 e IP
`216.24.57.7`, demostrando endpoint/rechazo básico. No se usaron credenciales.

Auth, students, caja, pagos, recibos y attendance autenticados permanecen
pendientes de las cuentas/seeds enumerados en `STAGING_PHASE1_RUNBOOK.md`.

## 15. Android/iOS y previews

- Perfil `preview` interno/staging existente y válido; demo session false.
- Export Android local PASS.
- `android/gradlew assembleDebug` se intentó; agotó 604 s sin stdout final ni
  APK nuevo. Los procesos Gradle del árbol confirmado fueron detenidos.
- No hay dispositivo ADB; no hubo instalación/smoke.
- Host Windows sin `ios/`; preview EAS iOS no se ejecutó por falta de
  autorización remota.

Android/iOS preview: **PENDIENTE / PENDIENTE EXTERNO**.

## 16. Piloto y MOB-0410

Se crearon manual de operación, soporte, rollback, incidente, readiness y
registro de defectos. El objetivo documentado es una sucursal, 2–4 usuarios,
datos sintéticos/ventana controlada, soporte presente, rollback manual y reporte
diario.

No hubo piloto. No se inventaron defectos ni métricas. P0=0, P1/P2 aceptados,
crash-free, login %, latencias y capacitación quedan **SIN DATO**. MOB-0410 está
pendiente de ejecución real.

## 17. Revalidación G1/G2/G3

| Gate | Local | Evidencia faltante |
|---|---|---|
| G1 auth/session | APROBADO LOCAL: refresh coordinado, tokens, 403, logout/cleanup por tests | E2E staging/plataformas |
| G2 students/membership | APROBADO LOCAL: search, detail, foto, membership, deep link/permissions | E2E staging/plataformas |
| G3 cash/payment/receipt | APROBADO LOCAL: caja, idempotencia, replay, uncertain, receipt, cleanup | staging financiero/Maestro/plataformas |

Ninguno se declara aprobado globalmente sin la evidencia externa.

## 18. Gate G4

| Criterio | Estado | Evidencia | Bloqueo |
|---|---|---|---|
| MOB-0401 today | APROBADO | código + tests + export | E2E externo |
| MOB-0402 check-in | APROBADO | confirmación/request exacto | E2E externo |
| MOB-0403 decisiones | APROBADO | union/adapter/UI/tests | seeds/staging |
| MOB-0404 invalidaciones | APROBADO | query keys/tests | backend E2E |
| MOB-0405 offline | APROBADO | UI + lock/tests | dispositivo |
| MOB-0406 E2E | PENDIENTE EXTERNO | flows preparados | CLI/binarios/seeds |
| MOB-0407 accesibilidad | PENDIENTE EXTERNO | revisión local | VoiceOver/TalkBack |
| MOB-0407 rendimiento | PENDIENTE EXTERNO | diseño virtualizado | mediciones |
| MOB-0408 seguridad/PII | PENDIENTE | hardening local | aceptación/audit |
| MOB-0409 preview | PENDIENTE EXTERNO | perfil/export | Android+iOS smoke |
| manual/soporte/rollback | APROBADO LOCAL | 4 docs + checklists | revisión humana |
| MOB-0410 P0/P1 | PENDIENTE EXTERNO | sin piloto | ventana real |
| Doctor | APROBADO | 20/20 | — |
| dependencies | PENDIENTE | 24 transitivas | aceptación/parches |
| CI local/remoto | PENDIENTE EXTERNO | local verde, remoto rojo previo | run candidato |
| staging financiero/attendance | PENDIENTE EXTERNO | TLS/401 únicamente | credenciales/seeds |
| Android/iOS | PENDIENTE EXTERNO | export sólo | builds/smoke |
| G1/G2/G3 | PENDIENTE EXTERNO | local verde | E2E global |
| Product Owner/operador | PENDIENTE EXTERNO | sin firma | aprobación explícita |

**G4 NO APROBADO**.

## 19. Definition of Done Fase 1

- [ ] cuatro sprints aceptados por Product Owner/operador;
- [ ] E2E completo staging;
- [x] login/refresh/logout robustos localmente;
- [ ] roles/permisos UI + backend en staging;
- [x] alumno/foto/edad/nivel/membresía localmente;
- [x] CASH exige caja; idempotencia/no auto retry/folio/recibo localmente;
- [x] check-in duplicado/vencido/inactivo explícito;
- [x] sin override/cancelación escondida;
- [x] traceId/logs sin PII por pruebas;
- [x] logout limpia sesión/cache/pending por pruebas;
- [ ] accesibilidad/contraste en dispositivos;
- [ ] Android preview;
- [ ] iOS preview;
- [ ] P0=0 y P1/P2 aceptados con piloto;
- [x] manual/soporte/rollback preparados;
- [ ] aprobación humana.

## 20. Release candidate y deuda

No se cumplen CI remoto, Maestro, staging, Android, iOS, piloto, G4 ni
aprobación humana. Se conserva `0.2.0`; no corresponde tocar metadata.

Deuda prioritaria:

1. publicar cambios sólo con autorización y obtener CI verde;
2. entregar credenciales/seeds sintéticos y ejecutar runbook;
3. producir Android/iOS preview y ejecutar Maestro Sprints 1–4/full-phase1;
4. aceptar o remediar audit compatible;
5. medir accesibilidad/rendimiento/métricas y registrar defectos reales;
6. aprobar G1–G4/DoD y sólo entonces generar `1.0.0-rc.1`.

## 21. Decisión final

**FASE 1 MÓVIL LISTA LOCALMENTE / PENDIENTE EVIDENCIA EXTERNA**

**`1.0.0-rc.1` NO LISTO**
