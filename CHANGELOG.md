# Changelog

## 0.1.0 — Sprint 1

### Añadido

- Login real, validación RHF/Zod y errores con código de soporte.
- Sesión segura con access token en memoria y refresh token en SecureStore.
- Bootstrap, rotación, refresh single-flight y replay máximo una vez.
- Logout remoto best-effort con limpieza local obligatoria.
- Protected Routes, PermissionGate y estados ALUMNO/contraseña/acceso denegado.
- Adapters sobre OpenAPI generado y validación runtime de fronteras críticas.
- Sanitización de logs y pruebas unitarias, integración, componentes y Maestro.

### Cambiado

- Development/staging usan temporalmente el backend HTTPS de Render.
- OpenAPI tooling consume el JSON oficial 3.1.0.
- Se retiró la feature simulada de Fase 0.

### Limitaciones

- Staging real no está aprobado sin cuentas seed y pruebas autenticadas.
- El contrato no documenta seguridad ni errores.
- E2E y demo real quedan bloqueados hasta disponer de seeds/build.
