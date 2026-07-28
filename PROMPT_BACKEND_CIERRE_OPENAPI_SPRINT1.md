# Prompt para Codex — Backend GymBox: cierre de contrato Sprint 1

Trabaja únicamente en el repositorio backend de GymBox. No implementes Sprint
2, no modifiques la app móvil y no incluyas cuentas seed, contraseñas o tokens
en Git, logs ni resultados de CI.

## Objetivo

Cerrar las discrepancias entre el runtime de staging y el OpenAPI 3.1 que
consume GymBox Mobile. La meta es validar login, sesión, permisos, refresh,
logout y cambio obligatorio de contraseña de forma real.

## Contexto ya comprobado

- Backend temporal: https://box-rd-backend.onrender.com/api/v1.
- Login y GET /auth/me funcionan con seeds activas.
- Roles observados: ADMINISTRADOR, RECEPCION, INSTRUCTOR y ALUMNO.
- Los permisos reales usan MAYÚSCULAS y guion bajo, por ejemplo
  ASISTENCIAS_CONSULTAR.
- Existe una cuenta con mustChangePassword=true.
- Una cuenta marcada suspendida responde 401 al login; no se puede distinguir
  suspensión de credenciales inválidas.
- P0: el runtime observado devolvía status ACTIVO; el OpenAPI actualizado
  declara ACTIVE, INACTIVE y SUSPENDED. El valor debe coincidir en base de
  datos, DTO, serialización, pruebas y contrato.

## Reglas

1. Backend es la fuente de verdad: el OpenAPI se actualiza desde su fuente
   canónica.
2. No documentes una respuesta HTTP que no pueda ocurrir realmente.
3. No reveles si una cuenta existe mediante errores de login.
4. No agregues bypasses de autenticación ni desactives TLS.
5. Si una advertencia del móvil exige un comportamiento no válido para el
   negocio, documenta la decisión en el PR; no inventes una respuesta sólo para
   silenciar un verificador.

## Trabajo requerido

### 1. Estados de cuenta — P0

Adopta un catálogo único y aplícalo de extremo a extremo:

~~~
ACTIVE
INACTIVE
SUSPENDED
~~~

- GET /api/v1/auth/me debe devolver exactamente esos valores.
- UserSnapshot.status debe usar el mismo enum.
- Migra o adapta valores persistidos en español sin romper datos existentes.
- Recomendación: login conserva 401 genérico; /auth/me con bearer válido de
  usuario no activo devuelve 403 USER_INACTIVE con traceId.
- Entrega una seed no activa para validar la semántica, fuera de Git.

### 2. UserSnapshot estable

El móvil consume estos campos:

~~~
id, branchId, email, firstName, lastName, branchName, status,
mustChangePassword, authzVersion, roles, permissions
~~~

Si todo usuario autenticable tiene sucursal, marca branchId y branchName como
required en OpenAPI y garántizalos en runtime. Si no es así, define una
representación explícita y solicita el ajuste coordinado en móvil antes de
publicar el contrato.

Publica un catálogo versionado de roles, permisos y estados; debe coincidir con
los valores reales de /auth/me.

### 3. Seguridad del OpenAPI

Usa seguridad global y excepciones explícitas:

~~~yaml
security:
  - bearerAuth: []
~~~

- POST /auth/login y POST /auth/refresh: security: [].
- GET /auth/me, POST /auth/logout y POST /auth/change-password: bearerAuth.
- Conserva bearerAuth como HTTP bearer con formato JWT.

### 4. Errores y responses

Todos los errores públicos deben tener:

~~~json
{
  "code": "STRING_ESTABLE",
  "message": "Mensaje seguro",
  "details": {},
  "timestamp": "ISO-8601",
  "traceId": "..."
}
~~~

Incluye también X-Trace-Id en errores.

Documenta y prueba los códigos que realmente aplica cada operación auth:

- 400: petición inválida.
- 401: credenciales, bearer o refresh no válidos.
- 403: usuario no activo o autorización rechazada.
- 500 o default: error interno. Sustituye la clave 5XX por una de estas
  opciones para interoperar con el verificador móvil.
- 409: añádelo sólo si existe un conflicto real y estable, por ejemplo un
  refresh token ya rotado. Si no existe, no lo inventes: documenta la decisión
  para que el verificador móvil se ajuste.

### 5. Refresh, logout y contraseña

Garantiza y documenta:

1. tokenType = Bearer.
2. expiresIn está en segundos.
3. Refresh exitoso rota el refresh token e invalida el anterior.
4. Refresh revocado devuelve error estándar con traceId.
5. Logout exige bearer y refresh, invalida sesión y responde 204.
6. Logout repetido tiene semántica documentada; se prefiere idempotencia.
7. POST /auth/change-password, si se publica, requiere bearer, valida
   contraseña actual/nueva, revoca sesiones y responde 204.
8. mustChangePassword=true impide acceder a módulos operativos.

### 6. Staging y seeds

Prepara, fuera de Git:

- ADMINISTRADOR activo.
- RECEPCION activa.
- INSTRUCTOR activo.
- ALUMNO activo sin permisos.
- Usuario no activo bajo la semántica definida.
- Usuario con mustChangePassword=true.
- Configuración temporal de access token de 1–2 minutos, limitada a staging,
  para probar refresh E2E.

## Pruebas obligatorias backend

1. Login activo devuelve AuthTokens completos.
2. /auth/me sin bearer devuelve 401 estándar con traceId.
3. /auth/me con bearer devuelve todos los campos required y el estado
   canónico.
4. Usuario no activo aplica la semántica acordada.
5. Refresh rota el token; el refresh anterior deja de funcionar.
6. Logout autenticado devuelve 204; la restauración posterior falla.
7. Un 403 autenticado no se transforma en 401.
8. Cambio de contraseña, si existe, revoca sesiones.
9. El OpenAPI exportado coincide con rutas, schemas, seguridad y responses
   implementadas.

Usa variables locales o secret manager para pruebas. No imprimas passwords,
tokens ni bodies de login.

## Definition of Done

Entrega un PR backend con:

1. Runtime y pruebas backend verdes.
2. OpenAPI 3.1 exportado desde la fuente canónica y versión incrementada.
3. Evidencia de despliegue a staging/Render.
4. Catálogo de estados, roles, permisos y códigos de error.
5. Seeds entregadas por canal seguro.
6. Confirmación de que runtime y OpenAPI devuelven el mismo estado canónico.

Al finalizar, informa URL del contrato, commit o versión desplegada, casos
probados y cualquier cambio que requiera sincronización en móvil.
