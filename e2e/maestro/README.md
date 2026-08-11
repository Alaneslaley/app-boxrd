# Maestro — Sprints 1, 2, 3 y 4

Los flujos usan el binario real `mx.com.gymbox.mobile` y el backend de staging.
Las credenciales se inyectan al proceso; nunca se guardan en Git:

```bash
maestro test \
  -e GYMBOX_E2E_EMAIL=... \
  -e GYMBOX_E2E_PASSWORD=... \
  e2e/maestro/login-valid.yaml
```

Variables adicionales:

- `GYMBOX_E2E_STUDENT_EMAIL` y `GYMBOX_E2E_STUDENT_PASSWORD`;
- `GYMBOX_E2E_NO_PERMISSION_EMAIL` y `GYMBOX_E2E_NO_PERMISSION_PASSWORD`.
- `GYMBOX_E2E_SEARCH_NAME` y `GYMBOX_E2E_SEARCH_RESULT_NAME` para el recorrido
  búsqueda → ficha → membresía.
- `GYMBOX_E2E_EXPIRING_SOON_SEARCH` y `GYMBOX_E2E_EXPIRING_SOON_RESULT` para
  el alumno con una membresía publicada como `EXPIRING_SOON` a cinco días.

Los recorridos de Sprint 2 se encuentran en:

- `sprint-2-search-detail-membership.yaml`;
- `sprint-2-expiring-soon.yaml`.

No se ejecutaron en este corte porque las credenciales seed de staging no están
presentes en el entorno. No contienen bypasses ni datos personales en Git.

`logout-offline-android.yaml` sólo es fiable en Android porque Maestro no cambia
realmente el modo avión del simulador iOS.

El E2E de refresh permanece bloqueado hasta que backend entregue un access token
de vida corta o una cuenta/configuración de staging preparada. No existe bypass
de autenticación ni endpoint de prueba dentro de la app.

## Sprint 3

Variables nuevas, siempre inyectadas al proceso:

- `GYMBOX_E2E_RECEPTION_EMAIL` y `GYMBOX_E2E_RECEPTION_PASSWORD`;
- `GYMBOX_E2E_PAYMENT_SEARCH` y `GYMBOX_E2E_PAYMENT_RESULT`, para un alumno
  sintético con una sola membresía renovable;
- `GYMBOX_E2E_COUNTED_AMOUNT`;
- `GYMBOX_E2E_RECEIPT_PENDING_PAYMENT_ID`,
  `GYMBOX_E2E_RECEIPT_READY_PAYMENT_ID` y
  `GYMBOX_E2E_RECEIPT_FAILED_PAYMENT_ID`.

`GYMBOX_E2E_BASE_URL` se reserva al preparador externo del seed/proxy. La app
debe compilarse para ese entorno; el repositorio no contiene sus secretos.

Los `sprint-3-*.yaml` cubren caja sin apertura, apertura, los tres métodos de
pago, cierre, permisos y offline. Los sufijados `-external` requieren fixtures
de staging. Replay, uncertain y logout requieren un proxy de fallo de transporte
de un solo uso que corte la respuesta después del commit; Maestro no crea esa
condición. Los estados de recibo requieren IDs sintéticos presembrados.

Cada recorrido financiero necesita un seed aislado o reiniciado. `clearState`
limpia el dispositivo, pero no revierte la caja ni los pagos del backend. Hasta
ejecutarlos con esos prerrequisitos, la evidencia permanece `PENDIENTE EXTERNO`.

## Sprint 4

Se añadieron ocho flows ejecutables `sprint-4-*.yaml` y dos helpers. Las
variables adicionales son:

- `GYMBOX_E2E_ATTENDANCE_ALLOWED_SEARCH` / `RESULT`;
- `GYMBOX_E2E_ATTENDANCE_ALREADY_SEARCH` / `RESULT`;
- `GYMBOX_E2E_ATTENDANCE_EXPIRED_SEARCH` / `RESULT`;
- `GYMBOX_E2E_ATTENDANCE_INACTIVE_SEARCH` / `RESULT`;
- `GYMBOX_E2E_ATTENDANCE_FORBIDDEN_EMAIL` / `PASSWORD`;
- `GYMBOX_E2E_PHASE1_SEARCH` / `RESULT` para el seed reiniciable del recorrido
  vencida → pago → activa → check-in.

Cada alumno debe ser sintético y cada seed debe restaurarse antes de su flow.
El escenario `ALREADY_REGISTERED` comienza con asistencia del día existente;
`ALLOWED` comienza sin ella. `sprint-4-check-in-offline.yaml` es Android-only
porque usa `setAirplaneMode`.

`npm run validate:maestro` parsea todos los YAML, valida referencias y reglas
estáticas. No instala Maestro, no abre un dispositivo y no cuenta como E2E.
Hasta contar con CLI, binarios y seeds de staging, Sprint 4 permanece
`PREPARADO / PENDIENTE EXTERNO`.
