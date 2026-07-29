# Maestro — Sprint 1 y Sprint 2

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
