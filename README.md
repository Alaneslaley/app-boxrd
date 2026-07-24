# GymBox Mobile

Aplicación móvil operativa de GymBox para instructores, recepción y personal autorizado. Este repositorio contiene la **Fase 0 — Fundación técnica** sobre Expo SDK 57; todavía no implementa autenticación ni módulos del negocio.

La zona horaria de negocio canónica es `America/Mexico_City`; `core/time` la expone
como constante, mientras los instantes de transporte deben conservarse en UTC.

## Estado y alcance

Incluido en Fase 0:

- Expo Router en `src/app`, development client, CNG y perfiles EAS;
- arquitectura feature-first y verificaciones de límites/ciclos;
- configuración validada para local, development, staging y production;
- TanStack Query conectado a NetInfo y AppState;
- sesión, permisos y navegación exclusivamente simulados;
- design system inicial del instructor;
- cliente HTTP tipado y fakes;
- contrato OpenAPI mock mínimo y generación de tipos;
- Jest Expo, React Native Testing Library, Maestro smoke y CI.

No incluido: login/refresh real, alumnos, membresías, pagos, caja, asistencia, check-in, recibos, fotos, notificaciones, app de alumno ni sincronización offline. Esos módulos no deben iniciarse antes de aprobar G0.

## Documentación fuente

- [Arquitectura](docs/GymBox_Mobile_Fase1_Arquitectura.md)
- [Blueprint](docs/GymBox_Mobile_Fase1_Blueprint.md)
- [Dossier](docs/GymBox_Mobile_Fase1_Dossier.md)
- [Sprints](docs/GymBox_Mobile_Fase1_Sprints.md)
- [Informe de color](docs/Informe_de_color_para_la_app_box.md)

Prioridad ante contradicciones: Blueprint → Arquitectura → Sprints → Dossier → Informe de color. La documentación oficial define la forma técnica; estos documentos definen arquitectura y alcance.

## Versiones y requisitos

| Herramienta | Versión |
|---|---|
| Expo | SDK 57 (`~57.0.8`) |
| React Native | `0.86.0` |
| React | `19.2.3` |
| Node.js | `^22.13.0` o `>=24` (CI usa 24) |
| Java | 21 para build Android local |
| Android SDK | API/compile SDK compatibles con Expo 57 |
| iOS | macOS, Xcode compatible y cuenta/certificados según distribución |

Para EAS se necesita una cuenta Expo. Maestro CLI y un dispositivo/emulador son necesarios para E2E.

## Instalación

```bash
npm ci
cp .env.local.example .env.local
```

En PowerShell:

```powershell
Copy-Item .env.local.example .env.local
```

No use Expo Go como entorno oficial. El ciclo real utiliza development builds:

```bash
npm run start
```

## Ambientes

| Ambiente | Archivo de referencia | Transporte |
|---|---|---|
| local | `.env.local.example` | HTTP local permitido |
| development | `.env.development.example` | HTTP de red privada permitido |
| staging | `.env.staging.example` | HTTPS obligatorio |
| production | `.env.production.example` | HTTPS obligatorio |

Variables permitidas:

- `APP_ENV`;
- `APP_VERSION`;
- `APP_BUILD`;
- `APP_COMMIT`;
- `EXPO_PUBLIC_API_URL`;
- `EXPO_PUBLIC_ENABLE_DEMO_SESSION`.

`EXPO_PUBLIC_API_URL` contiene sólo host/base y **no** `/api/v1`; `GymboxHttpClient` agrega ese prefijo. Todo `EXPO_PUBLIC_*` queda visible en el binario: no guarde secretos, contraseñas, tokens ni claves de proveedor.

Valide los cuatro ejemplos con:

```bash
npm run validate:environments
```

## Development builds, preview y CNG

### Android local

```powershell
npx expo prebuild --clean --platform android
$env:NODE_ENV = "development"
Set-Location android
.\gradlew.bat assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
Set-Location ..
npm run start
```

La validación de Fase 0 generó además
`artifacts/android/gymbox-mobile-development-arm64.apk` (artefacto local ignorado
por Git), compilado para `arm64-v8a`, paquete `mx.com.gymbox.mobile`, min SDK 24 y
target SDK 36. Si Ninja informa que `build.ninja` permanece `dirty` en una carpeta
de OneDrive, copie el checkout a una ruta local corta antes de ejecutar `prebuild`
y Gradle; no versione `android/`.

### Android con EAS

```bash
npx eas-cli@latest login
npx eas-cli@latest build --platform android --profile development
```

Descargue el APK desde el enlace de EAS e instálelo en el dispositivo. El perfil `development` incluye `expo-dev-client` y distribución interna.

### iOS

Build de simulador:

```bash
npx eas-cli@latest build --platform ios --profile development-simulator
```

Build interno para dispositivo:

```bash
npx eas-cli@latest build --platform ios --profile development
```

El segundo requiere registro/provisionamiento del dispositivo y credenciales Apple. El build local iOS requiere macOS:

```bash
npx expo run:ios
```

### Preview y producción

```bash
npx eas-cli@latest build --platform all --profile preview
npx eas-cli@latest build --platform all --profile production
```

Preview es distribución interna sin herramientas de desarrollo; production genera artefactos destinados a tiendas.

### Qué regenera CNG

`android/` e `ios/` no se versionan. `npx expo prebuild --clean` los reconstruye desde el template de SDK 57, `app.config.ts`, config plugins y dependencias nativas. No edite esos directorios manualmente: los cambios persistentes deben expresarse mediante app config o plugins.

## Arquitectura

```text
.
├── .github/workflows/quality.yml
├── assets/
├── contracts/gymbox-openapi.yaml
├── docs/
├── e2e/maestro/
├── scripts/
├── src/
│   ├── app/                    # rutas y layouts delgados
│   ├── core/                   # infraestructura técnica
│   ├── features/
│   │   └── phase-zero-demo/    # única feature demostrativa
│   ├── generated/api/          # salida OpenAPI; no editar
│   ├── shared/                 # tema, UI y utilidades puras
│   └── test/                   # helpers, fakes y fixtures
├── app.config.ts
├── eas.json
├── eslint.config.js
├── jest.config.js
├── metro.config.js
└── tsconfig.json
```

Reglas:

- `app` importa únicamente APIs públicas de features, core y shared;
- features pueden importar core/shared/generated;
- core y shared no importan features;
- una feature consume otra sólo mediante su `index.ts`;
- rutas no contienen fetch, SecureStore ni reglas de negocio;
- UI no consume DTO OpenAPI;
- `src/generated/api/` se regenera, nunca se edita;
- no se crean carpetas globales `screens`, `services`, `models`, `repositories` ni `controllers`.

```bash
npm run verify:boundaries
npm run verify:cycles
```

## Estado remoto, ciclo de vida y red

TanStack Query usa `NetworkQueryBridge` con NetInfo y `AppStateQueryBridge` con `focusManager`. Defaults de Fase 0:

- lecturas: `staleTime` 30 s, GC 5 min, un retry sólo para error desconocido/red/5xx;
- nunca retry automático para 401, 403, 409 o 422;
- todas las mutaciones: `retry: 0` y `networkMode: online`;
- pagos, caja y check-in futuros permanecerán online y sin retry automático.

No hay Redux ni Zustand.

## HTTP, sesión y seguridad

`GymboxHttpClient` es la puerta HTTP y agrega `/api/v1`. `ApiError` conserva `status`, `code`, `message`, `details`, `timestamp` y `traceId`. `FakeHttpClient` permite pruebas sin backend.

La sesión actual es un simulador en memoria. Para Sprint 1:

- access token sólo en memoria;
- refresh token rotativo sólo mediante `TokenVault`/SecureStore;
- backend autoritativo para roles y permisos;
- logout limpia tokens, query cache e historial protegido;
- nunca registrar contraseñas, tokens, PII o payloads financieros.

## OpenAPI

`contracts/gymbox-openapi.yaml` está marcado `0.0.0-mock` y `x-gymbox-contract-status: mock`. Define únicamente `ApiError`; deliberadamente no inventa endpoints.

```bash
npm run verify:contract
npm run generate:api
```

Cuando backend entregue el contrato oficial:

1. acordar owner y versionado;
2. sustituir el mock;
3. retirar la marca mock;
4. generar `src/generated/api/`;
5. adaptar DTO en gateways/mappers de cada feature;
6. agregar contract tests antes de integrar.

## Pruebas

```bash
npm test
npm run test:watch
npm run test:unit
npm run test:components
```

Las pruebas cubren configuración, retry policies, NetInfo, AppState, FakeHttpClient, render público/protegido, bloqueo sin sesión, AccessDenied y estados Loading/Empty/Error/Offline. No se usan snapshots extensos.

Smoke E2E:

```bash
npm run e2e
```

Requiere Maestro, un development build instalado y un dispositivo/emulador activo. El flujo está en `e2e/maestro/phase-zero-smoke.yaml`.

## Comandos

| Comando | Función |
|---|---|
| `npm run start` | Metro para development client |
| `npm run android` / `npm run ios` | CNG + build local |
| `npm run doctor` | compatibilidad Expo |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript estricto |
| `npm test` | Jest/RNTL |
| `npm run verify:contract` | contrato mock/oficial |
| `npm run generate:api` | tipos OpenAPI |
| `npm run verify:boundaries` | límites de imports |
| `npm run verify:cycles` | ciclos |
| `npm run validate:environments` | cuatro ambientes |
| `npm run export` | bundle Android de producción |
| `npm run quality` | pipeline local completo |

## CI

`.github/workflows/quality.yml` ejecuta, en orden: `npm ci`, Expo Doctor, lint, typecheck, unit tests, component tests, verificación y generación OpenAPI, diff del generado, boundaries, ciclos, ambientes y export Android.

Maestro no se ejecuta en el runner estándar porque necesita binario y dispositivo; debe añadirse como job EAS/Maestro cuando exista el build de preview y credenciales.

## Flujo Git

- ramas: `main` protegida, `develop` para integración y `feature/MOB-####-descripcion`;
- commits Conventional Commits, por ejemplo `feat(core): add query bridges`;
- PR pequeña, vinculada a MOB, con criterio de aceptación, pruebas, evidencia visual y riesgos;
- no mezclar cambios de contrato con UI no relacionada;
- merge sólo con CI verde y revisión;
- secretos en EAS/GitHub Environments, nunca en Git o `EXPO_PUBLIC_*`.

## Problemas conocidos y Gate G0

| Dependencia | Estado | Evidencia | Acción pendiente |
|---|---|---|---|
| API base de identidad | BLOQUEADO | El contrato mock no contiene endpoints | Acordar login/refresh/logout/me |
| Backend de desarrollo | BLOQUEADO | No se proporcionó URL ni health check | Publicar backend dev |
| HTTPS o conexión segura | PENDIENTE | Schemas exigen HTTPS en staging/prod | Entregar host/certificados |
| Usuarios seed | BLOQUEADO | Sólo existe usuario UI simulado | Crear seeds no productivos |
| Roles iniciales | PENDIENTE | Documentados, no verificados contra backend | Confirmar catálogo |
| Permisos iniciales | BLOQUEADO | Sólo existe permiso demo local | Publicar códigos y matriz |
| Contrato OpenAPI | BLOQUEADO | `0.0.0-mock`, sin endpoints | Sustituir por contrato oficial |
| Responsable del contrato | BLOQUEADO | No hay owner identificado | Nombrar owner backend |
| Auditoría npm | DEUDA ACEPTADA | 0 altas/críticas; 11 moderadas transitivas de Expo 57 | Revisar con cada parche SDK, sin `audit fix --force` |

No comenzar Sprint 1 mientras estos bloqueos críticos sigan abiertos.

## Pasos exactos para iniciar Sprint 1

1. Resolver y documentar cada fila de G0 con evidencia.
2. Recibir y versionar el OpenAPI oficial de identidad.
3. Generar tipos y aprobar el diff contractual.
4. Acordar manejo exacto de login, refresh rotativo, logout, `/auth/me`, 401 y 403.
5. Verificar seeds/roles/permisos en backend development mediante HTTPS o ruta segura.
6. Crear la feature `auth` según Blueprint, sin cambiar los límites existentes.
7. Implementar refresh single-flight y access token en memoria.
8. Añadir contract, unit, component y Maestro tests de Sprint 1.
9. Validar Android/iOS preview antes de declarar el gate de sesión.

## Fuentes técnicas oficiales

- [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/)
- [Expo Router](https://docs.expo.dev/versions/v57.0.0/sdk/router/)
- [Directorio `src/app`](https://docs.expo.dev/router/reference/src-directory/)
- [Protected routes](https://docs.expo.dev/router/advanced/protected/)
- [Development builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [Continuous Native Generation](https://docs.expo.dev/workflow/continuous-native-generation/)
- [EAS profiles](https://docs.expo.dev/build/eas-json/)
- [TanStack Query en React Native](https://tanstack.com/query/latest/docs/framework/react/react-native)
- [Jest con Expo](https://docs.expo.dev/develop/unit-testing/)
- [Maestro Flows](https://docs.maestro.dev/maestro-flows)
