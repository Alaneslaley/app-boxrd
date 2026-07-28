# Diagnóstico para backend — GymBox Mobile Sprint 1

**Fecha:** 2026-07-27  
**Entorno observado:** `https://box-rd-backend.onrender.com/api/v1`  
**Propósito:** entregar al equipo/Codex de backend los ajustes necesarios para
cerrar la integración real de autenticación, sesión y permisos del móvil.

> Las cuentas seed se entregaron por un canal externo. Este documento no
> incluye correos, contraseñas, access tokens ni refresh tokens.

## Resumen ejecutivo

El backend responde por HTTPS y permite login + `GET /auth/me` para
las cuentas activas probadas. Sin embargo, existen bloqueos P0 para aprobar la
integración de Sprint 1:

1. El backend devuelve el estado `ACTIVO`; el móvil vigente interpreta
   `ACTIVE`. El contrato OpenAPI declara `status` como `string`, por lo que no
   existe una fuente de verdad para el catálogo.
2. La cuenta marcada como suspendida responde `401` en login. No se puede
   distinguir entre credenciales inválidas y una cuenta inactiva, ni probar la
   ruta móvil de usuario inactivo.
3. El OpenAPI no documenta la seguridad real, los errores estándar, la
   rotación, los campos requeridos ni el catálogo de autorización.
4. Falta evidencia real de refresh rotativo, logout autenticado e idempotencia,
   403 autenticado y expiración corta para E2E.

## Evidencia de cuentas seed

Las siguientes categorías se probaron con `POST /auth/login` seguido de
`GET /auth/me` usando bearer. Los nombres concretos de cuenta y secretos se
mantienen fuera de Git.

| Seed esperado | Login | `/auth/me` | Backend observado | Permisos |
|---|---:|---:|---|---:|
| ADMINISTRADOR | OK | OK | `status=ACTIVO`, rol `ADMINISTRADOR`, `mustChangePassword=false` | 22 |
| INSTRUCTOR | OK | OK | `status=ACTIVO`, rol `INSTRUCTOR`, `mustChangePassword=false` | 4 |
| RECEPCION | OK | OK | `status=ACTIVO`, rol `RECEPCION`, `mustChangePassword=false` | 15 |
| ALUMNO | OK | OK | `status=ACTIVO`, rol `ALUMNO`, `mustChangePassword=false` | 0 |
| Cambio obligatorio | OK | OK | `status=ACTIVO`, rol `INSTRUCTOR`, `mustChangePassword=true` | 4 |
| Suspendido | 401 | No aplica | No permite distinguir cuenta suspendida de credencial incorrecta | — |

### Permisos observados

| Rol/caso | Permisos reales observados |
|---|---|
| INSTRUCTOR | `ASISTENCIAS_CONSULTAR`, `ASISTENCIAS_REGISTRAR`, `MEMBRESIAS_CONSULTAR`, `ALUMNOS_CONSULTAR` |
| RECEPCION | `ASISTENCIAS_REGISTRAR`, `ASISTENCIAS_CONSULTAR`, `PAGOS_CONSULTAR`, `MEMBRESIAS_MODIFICAR`, `MEMBRESIAS_CREAR`, `CAJA_ABRIR`, `CAJA_CERRAR`, `PAGOS_REGISTRAR`, `MEMBRESIAS_CONSULTAR`, `ALUMNOS_CONSULTAR`, `REPORTES_DIARIOS_CONSULTAR`, `ALUMNOS_CREAR`, `ALUMNOS_MODIFICAR`, `PLANES_CONSULTAR`, `CAJA_CONSULTAR` |
| ALUMNO | Sin permisos |
| Cambio obligatorio | Mismos 4 permisos de INSTRUCTOR |
| ADMINISTRADOR | 22 permisos: usuarios, alumnos, planes, pagos, caja, membresías, asistencias y reportes |

## API observada y contrato actual

El archivo móvil `contracts/openapi/gymbox-openapi.json` es OpenAPI 3.1 válido,
pero contiene 14 advertencias contractuales. El runtime y el contrato difieren
en los puntos siguientes.

| Tema | OpenAPI actual | Backend observado | Ajuste solicitado |
|---|---|---|---|
| Bearer en `/auth/me` | No declara `security` | Sin bearer responde 401 | Declarar `bearerAuth` por operación o globalmente |
| Bearer en `/auth/logout` | No declara `security` | Sin bearer responde 401 | Declarar bearer y body de refresh |
| Login/refresh anónimos | Sólo por omisión | Login valida body sin bearer | Declarar `security: []` |
| Errores | No existe `ApiError` | Forma estándar con `code`, `message`, `details`, `timestamp`, `traceId` | Publicar schema y responses |
| 400/401/403/409/5xx | No documentados | 400/401 observados | Documentar por endpoint |
| `traceId` | No documentado | Visible en body/header de errores | Incluir en schema y headers |
| `AuthTokens` | Campos no requeridos | Login entrega tokens en runtime | Marcar `accessToken`, `refreshToken`, `tokenType`, `expiresIn` como required |
| `UserSnapshot` | Campos no requeridos | `/me` entrega roles, permisos y flags | Marcar campos necesarios como required |
| Estado de usuario | `string` libre | Usa `ACTIVO` | Definir enum y semántica |
| Roles/permisos | `string[]` libre | Usa permisos en MAYÚSCULAS con guion bajo | Publicar catálogo versionado |
| Refresh | Sin unidad/rotación | Sin prueba autenticada todavía | Definir segundos y rotación obligatoria |
| Logout | Sin idempotencia | Sin prueba autenticada todavía | Definir 204 y semántica idempotente |
| Cambio de contraseña | Sólo flag | `mustChangePassword=true` funciona | Publicar endpoint o proceso oficial |

## P0: decisiones y cambios requeridos

### 1. Estados de cuenta

Definir un catálogo único en OpenAPI y backend. Dos opciones válidas:

- Estandarizar en inglés, por ejemplo `ACTIVE`, `SUSPENDED`, `INACTIVE`; o
- Mantener los valores en español, por ejemplo `ACTIVO`, `SUSPENDIDO`, pero
  documentarlos como enum y avisar al móvil para adaptar su mapper.

Actualmente el móvil espera `ACTIVE`; mientras el backend devuelve `ACTIVO`,
una sesión válida puede ser rechazada por el guard de usuario activo. Esta
incompatibilidad debe resolverse antes de probar el APK.

Además, decidir y documentar uno de estos comportamientos para suspendidos:

- **Opción A:** login responde error estándar `403 USER_INACTIVE` con
  `traceId`; el móvil muestra una pantalla segura de cuenta inactiva.
- **Opción B:** login responde 401 genérico para no revelar estado; en ese
  caso no existirá una prueba móvil basada en `/me.status` para suspendidos y
  debe documentarse explícitamente.

### 2. Contrato de autenticación

Actualizar el OpenAPI canónico del backend, no editar manualmente los tipos
generados del móvil. Debe incluir:

```yaml
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
  schemas:
    ApiError:
      type: object
      required: [code, message, timestamp, traceId]
      properties:
        code: { type: string }
        message: { type: string }
        details: { type: object, additionalProperties: true }
        timestamp: { type: string, format: date-time }
        traceId: { type: string }
```

Y por operación:

- `POST /auth/login`: `security: []`; 200, 400, 401, 5xx.
- `POST /auth/refresh`: `security: []`; 200, 400, 401, 5xx.
- `GET /auth/me`: `security: [{ bearerAuth: [] }]`; 200, 401, 403, 5xx.
- `POST /auth/logout`: `security: [{ bearerAuth: [] }]`; 204, 400, 401, 5xx.

### 3. Tokens y refresh

Documentar y garantizar:

- `tokenType` siempre es `Bearer`.
- `expiresIn` está expresado en segundos.
- Cada refresh exitoso emite un **nuevo** refresh token e invalida el anterior.
- Refresh inválido/revocado responde un error estándar sin filtrar detalles.
- Logout invalida la sesión/refesh token y es idempotente o documenta su
  respuesta repetida.
- Existe una configuración de staging con access token de 1–2 minutos para
  ejecutar el E2E de refresh sin bypasses móviles.

### 4. Catálogo de autorización

Publicar en OpenAPI, documentación backend o endpoint versionado:

- Roles: `ADMINISTRADOR`, `RECEPCION`, `INSTRUCTOR`, `ALUMNO`.
- Estados de cuenta y semántica.
- Todos los permisos de `/auth/me`, incluidos los observados en MAYÚSCULAS.
- Regla de cuándo el móvil puede mostrar una acción y cuándo backend la debe
  rechazar con 403.

El backend siempre es la autoridad. Los permisos móviles son sólo una mejora
de UX y no sustituyen la verificación del servidor.

### 5. Flujo de cambio obligatorio de contraseña

La seed con `mustChangePassword=true` ya permite comprobar el flag. Falta una
decisión contractual:

- Publicar un endpoint de cambio de contraseña y su schema; o
- Documentar el canal administrativo externo y mantener el acceso a módulos
  bloqueado hasta completar el cambio.

## Seeds requeridas para cerrar Sprint 1

Mantener fuera de Git y entregar por canal seguro:

1. ADMINISTRADOR activo con permisos amplios.
2. RECEPCION activa con permisos intermedios.
3. INSTRUCTOR activo con permisos de instructor.
4. ALUMNO activo sin permisos.
5. Usuario que autentique y permita validar un estado no activo, **si esa es la
   semántica elegida**.
6. INSTRUCTOR con `mustChangePassword=true`.
7. Cuenta o configuración de staging para access token corto.

## Pruebas de aceptación para backend

Ejecutar con variables locales no versionadas; no colocar valores en scripts ni
en salidas de CI:

```powershell
$env:GYMBOX_TEST_EMAIL = '...'
$env:GYMBOX_TEST_PASSWORD = '...'
```

Casos obligatorios:

1. Login activo devuelve `AuthTokens` completo.
2. `/auth/me` sin bearer devuelve 401 estándar con `traceId`.
3. `/auth/me` con bearer devuelve `UserSnapshot` completo y campos required.
4. Refresh rota refresh token y el token anterior deja de funcionar.
5. Cinco requests protegidas con access expirado producen un refresh efectivo.
6. Logout con bearer + refresh responde 204 y no deja restaurar sesión.
7. Petición autorizada sin permiso devuelve 403 estándar, no 401.
8. ALUMNO devuelve permisos vacíos.
9. `mustChangePassword=true` sigue el flujo oficial definido.
10. Suspendido sigue la semántica elegida y documentada.

## Entregable esperado del backend

1. Pull request con implementación y pruebas backend.
2. OpenAPI 3.1 actualizado desde su fuente canónica.
3. URL/version del contrato publicada para sincronizarlo en móvil.
4. Evidencia de los casos anteriores, sin secretos ni tokens.
5. Confirmación del valor canónico de estados (`ACTIVE`/`ACTIVO`) para ajustar
   el móvil en una sola dirección.

