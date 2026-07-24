# GymBox Mobile

Aplicación móvil interna de Escuela de Box RD para personal autorizado. La
versión `0.1.0` implementa el Sprint 1: autenticación, sesión segura, permisos y
estados controlados. No contiene módulos operativos del Sprint 2.

## Estado actual

Implementado:

- Expo SDK 57, React Native 0.86, React 19 y TypeScript strict;
- Expo Router con grupos públicos/protegidos y `Stack.Protected`;
- login real mediante `POST /api/v1/auth/login`;
- access token exclusivamente en memoria;
- refresh token exclusivamente en `expo-secure-store`;
- restauración mediante refresh rotado y `GET /api/v1/auth/me`;
- refresh single-flight y replay máximo una vez;
- logout remoto best-effort y limpieza local obligatoria;
- permisos provenientes de `/auth/me`, `PermissionGate` y 403 sin refresh;
- errores seguros en español con código de soporte `traceId`;
- estados para ALUMNO, acceso denegado y `mustChangePassword`;
- pruebas unitarias, integración, componentes y flujos Maestro preparados.

Pendiente de infraestructura/backend:

- cuentas seed administradas por un canal seguro;
- catálogo estable de roles/permisos y owner técnico del contrato;
- confirmar con credenciales rotación, `/me`, logout y 403 reales;
- mecanismo de access token corto para E2E de refresh;
- corregir en OpenAPI los gaps de seguridad, errores y campos requeridos.

El backend temporal configurado para development/staging es:

```text
https://box-rd-backend.onrender.com/api/v1
```

La variable de ambiente guarda sólo el origen
`https://box-rd-backend.onrender.com`; el cliente agrega `/api/v1`. El host
declarado actualmente por el OpenAPI, `api.escuelaboxrd.com.mx`, está
inaccesible y no se usa temporalmente.

## Fuentes de verdad

- [Blueprint](docs/GymBox_Mobile_Fase1_Blueprint.md)
- [Arquitectura](docs/GymBox_Mobile_Fase1_Arquitectura.md)
- [Sprints](docs/GymBox_Mobile_Fase1_Sprints.md)
- [Dossier](docs/GymBox_Mobile_Fase1_Dossier.md)
- [Informe de color](docs/Informe_de_color_para_la_app_box.md)
- [OpenAPI oficial](contracts/openapi/gymbox-openapi.json)

No se modifican los archivos de `docs/` ni el contrato desde el frontend.

## Requisitos

| Herramienta | Versión |
|---|---|
| Node.js | `^22.13.0` o `>=24` |
| Expo | SDK 57 (`~57.0.8`) |
| React Native | `0.86.0` |
| React | `19.2.3` |
| Java | 21 para Android local |
| Maestro | Requerido sólo para E2E |

No se usa Expo Go como entorno oficial; el ciclo real utiliza development o
preview builds.

## Instalación y ambiente

```powershell
npm ci
Copy-Item .env.staging.example .env.local
npm run start
```

`.env.local` está ignorado por Git. No almacene allí contraseñas ni tokens.

Variables públicas permitidas:

- `APP_ENV`;
- `APP_VERSION`;
- `APP_BUILD`;
- `APP_COMMIT`;
- `EXPO_PUBLIC_API_URL`;
- `EXPO_PUBLIC_ENABLE_DEMO_SESSION` (se conserva por compatibilidad y debe ser
  `false`; la sesión demo fue retirada).

Todo valor `EXPO_PUBLIC_*` queda visible en el binario. No incluya secretos.

```bash
npm run validate:environments
```

## Expo y EAS

El proyecto Expo está vinculado como
`@escuela-de-box-rd/escuela-de-box-rd`, con project ID
`d41e8f3e-a692-43e0-ab5b-fd53b06de939`.

Use el wrapper del repositorio para evitar la incompatibilidad observada entre
EAS CLI latest y TypeScript 7:

```bash
npm run eas -- project:info
npm run eas -- build --platform android --profile development
npm run eas -- build --platform android --profile preview
```

Preview es distribución interna, usa APK en Android e incluye la URL temporal de
staging. No se publica aún en stores.

En SDK 57, `expo prebuild` limpia y regenera nativo de forma predeterminada.
`android/` e `ios/` no se versionan; cualquier cambio persistente debe expresarse
en `app.config.ts` o config plugins.

## Arquitectura

```text
src/
├── app/
│   ├── (public)/sign-in.tsx
│   └── (protected)/
│       ├── (instructor)/index.tsx
│       ├── access-denied.tsx
│       ├── experience-not-available.tsx
│       └── must-change-password.tsx
├── core/
│   ├── app/
│   ├── http/
│   ├── observability/
│   ├── permissions/
│   ├── query/
│   └── session/
├── features/auth/
│   ├── api/
│   ├── application/
│   ├── model/
│   ├── ui/
│   └── __tests__/
├── generated/api/
├── shared/
└── test/
```

Reglas:

- rutas y layouts no ejecutan HTTP ni acceden a SecureStore;
- UI no manipula tokens ni consume DTO generados;
- `AuthRemoteGateway` adapta OpenAPI a modelos internos;
- `core` y `shared` no importan features;
- los guards móviles no sustituyen autorización backend;
- no hay Redux, Zustand ni stores persistidos de sesión.

```bash
npm run verify:boundaries
npm run verify:cycles
```

## Sesión y seguridad

Flujo de login:

1. React Hook Form y Zod validan y normalizan sólo el email.
2. Login obtiene tokens.
3. SecureStore guarda únicamente el refresh token rotado.
4. El access token permanece en `SessionService`.
5. `/auth/me` valida usuario, roles, permisos y estado.
6. Protected Routes selecciona la experiencia permitida.

El login móvil omite por ahora el campo opcional `device`: el contrato no
define un identificador estable ni una política de privacidad para poblarlo. El
adapter lo soporta para cuando backend formalice esa decisión.

El logout intenta la revocación con bearer + refresh token, pero siempre invalida
refresh en curso y limpia access token, SecureStore, QueryClient, estado e
historial protegido, incluso sin red.

Nunca se registran passwords, tokens, `Authorization`, cookies ni payloads con
PII. `SanitizingLogger` redacta claves y valores sensibles.

## OpenAPI

El contrato oficial es OpenAPI 3.1 JSON:

```bash
npm run verify:contract
npm run generate:api
```

`src/generated/api` es salida automática de `@hey-api/openapi-ts` y no se edita
manualmente. Los adapters validan en runtime porque `AuthTokens` y
`UserSnapshot` no tienen `required` en el contrato.

Gaps vigentes:

- `bearerAuth` existe, pero ninguna operación aplica `security`;
- no hay `ApiError`, responses 400/401/403/409/5xx ni `traceId`;
- logout requiere bearer en el backend observado, pero no en el contrato;
- no se documentan unidades de `expiresIn`, rotación ni idempotencia;
- no hay endpoint para `mustChangePassword`;
- roles, permisos y estados son strings sin catálogo.

El backend temporal sí devolvió en pruebas públicas el formato estándar con
`traceId`; esto no elimina la deuda del OpenAPI.

## Pruebas y calidad

```bash
npm run doctor
npm run lint
npm run typecheck
npm test
npm run test:unit
npm run test:components
npm run verify:contract
npm run generate:api
npm run validate:environments
npm run verify:boundaries
npm run verify:cycles
npm run export
npm run quality
```

La CI ejecuta instalación reproducible, Doctor, lint, TypeScript, pruebas,
contrato/generación y diff, límites, ciclos, ambientes y export Android.

## Maestro

Los flujos están en [`e2e/maestro`](e2e/maestro/README.md). Las credenciales se
inyectan al proceso:

```bash
maestro test \
  -e GYMBOX_E2E_EMAIL=... \
  -e GYMBOX_E2E_PASSWORD=... \
  e2e/maestro/login-valid.yaml
```

No existen credenciales ni bypasses en Git. La ejecución real permanece
bloqueada hasta recibir seeds y un build instalado. El logout offline por modo
avión se limita a Android.

## Límites de la versión 0.1.0

No incluye alumnos, búsqueda, membresías, caja, pagos, recibos, asistencia,
check-in, módulo deportivo, notificaciones, recuperación/cambio ficticio de
contraseña, registro, biometría, OAuth ni operación offline compleja.

Consulte [RELEASE_NOTES_0.1.0.md](RELEASE_NOTES_0.1.0.md) para el Gate G1,
limitaciones, pruebas y rollback.
