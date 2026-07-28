# Cierres y estado actual — PR-0 a PR-4

Fecha de corte: 28 de julio de 2026.

## Alcance y evidencia

Este repositorio no contiene pull requests, enlaces a PR, plantillas de cierre ni documentos titulados `PR-0` a `PR-4`. Por ello, este documento no afirma aprobaciones o merges que no estén registrados. Resume los cierres documentados disponibles (`Sprint 0`, `Sprint 1`, release `0.1.0` y diagnóstico de Sprint 2) y el estado verificable del árbol actual.

| PR | Cierre/documentación localizada | Estado actual verificable |
|---|---|---|
| PR-0 | No hay documento ni referencia explícita a PR-0. El historial contiene `pre fase 0`, `ajuste git ignore` y `sprint 0`. | Base Expo SDK 57, TypeScript estricto, Expo Router, configuración de ambientes, EAS, lint, Jest, generación OpenAPI y estructura feature-first presentes. |
| PR-1 | No hay documento ni referencia explícita a PR-1. La documentación `README.md` y `RELEASE_NOTES_0.1.0.md` describen el cierre de Sprint 1. | Login, restauración de sesión, refresh rotativo single-flight, logout local/remoto best-effort, SecureStore y rutas protegidas están implementados. |
| PR-2 | No hay documento ni referencia explícita a PR-2. | Permisos desde `/auth/me`, `PermissionGate`, manejo de 403 sin refresh, `traceId`, experiencias de alumno/acceso denegado/cambio obligatorio y pruebas de sesión están implementados. |
| PR-3 | No hay documento ni referencia explícita a PR-3. | Contrato OpenAPI 3.1 local, verificación, generación de tipos y CI de calidad están configurados. Los tipos fueron regenerados contra el contrato vigente. |
| PR-4 | No hay documento ni referencia explícita a PR-4. El único cierre posterior es `SPRINT_2_DIAGNOSTICO.md`. | Se agregó la porción habilitada del Sprint 2: home operativo, rutas de alumnos, ficha, membresías y foto protegida con `expo-image`. G2 y release `0.2.0` no están aprobados. |

## PR-0 — Fundación del proyecto

### Cierre disponible

No existe un cierre formal identificable como PR-0. Los commits de referencia son `ef001bf` (`sprint 0`) y los cambios previos de inicialización.

### Estado actual

- Expo SDK 57 con React Native 0.86 y React 19.2.3.
- `src/app` para rutas y una arquitectura feature-first en `src/features`, `src/core`, `src/shared` y `src/generated`.
- Ambientes validados mediante configuración Expo y perfiles EAS.
- ESLint, TypeScript estricto, Jest Expo, React Native Testing Library, Maestro y GitHub Actions configurados.
- OpenAPI como fuente de tipos de transporte mediante `@hey-api/openapi-ts`.

### Pendiente de formalización

Crear o localizar el enlace, título, alcance, revisión y decisión de merge de PR-0 si se requiere trazabilidad de GitHub.

## PR-1 — Autenticación y sesión

### Cierre disponible

El equivalente documental es [RELEASE_NOTES_0.1.0.md](RELEASE_NOTES_0.1.0.md), junto con el apartado de seguridad de [README.md](README.md). No existe evidencia de un PR numerado.

### Estado actual

- Login con backend, validación de credenciales y consulta de `/auth/me`.
- Access token sólo en memoria; refresh token sólo en `expo-secure-store`.
- Restauración de sesión, refresh rotativo, coordinación single-flight y replay GET único.
- Logout con revocación remota best-effort y limpieza local obligatoria.
- Rutas públicas y protegidas por `Stack.Protected`.

### Deuda vigente

La documentación de release reporta que faltaban cuentas seed, prueba E2E de access token corto y definiciones formales de backend para rotación/errores. Esas limitaciones no deben interpretarse como cierre de infraestructura.

## PR-2 — Autorización, errores y experiencias protegidas

### Cierre disponible

No existe un documento de cierre PR-2. La evidencia está distribuida en `README.md`, pruebas de `src/core` y `src/features/auth`, y el contrato regenerado.

### Estado actual

- Los permisos efectivos provienen de la sesión y se validan con `can` y `PermissionGate`.
- Un 403 se presenta como falta de permiso; no provoca refresh ni cierre de sesión.
- El cliente normaliza errores e incluye `traceId` cuando backend lo proporciona.
- Se contemplan las experiencias de usuario alumno, acceso denegado y cambio obligatorio de contraseña.
- Las pruebas actuales cubren sesión, permisos, rutas protegidas, mapeo de errores y formularios de autenticación.

### Deuda vigente

El contrato backend sigue siendo la autoridad pendiente para completar la semántica de permisos y respuestas de error en todas las operaciones.

## PR-3 — Contrato, CI y calidad

### Cierre disponible

No existe un cierre PR-3. El contrato y sus scripts son la evidencia disponible.

### Estado actual

- `contracts/openapi/gymbox-openapi.json` declara OpenAPI 3.1.0.
- `npm run verify:contract` valida el contrato y `npm run generate:api` actualiza `src/generated/api`.
- La CI ejecuta instalación reproducible, Doctor, lint, typecheck, pruebas, contrato, generación, límites, ciclos, ambientes y export Android.
- El contrato local fue contrastado con el endpoint canónico; las rutas y esquemas necesarios para Sprint 2 coinciden estructuralmente.

### Deuda vigente

Los tipos de negocio de alumnos y membresías contienen varios campos opcionales y enums no cerrados. Los mappers de UI deben seguir siendo defensivos.

## PR-4 — Sprint 2 parcial y diagnóstico G2

### Cierre disponible

El documento vigente es [SPRINT_2_DIAGNOSTICO.md](SPRINT_2_DIAGNOSTICO.md). No equivale a un cierre aprobado de PR-4: declara explícitamente el bloqueo de G2.

### Estado actual

- Home operativo con acceso rápido a alumnos sin inventar conteos.
- Rutas protegidas para alumnos, búsqueda y ficha por UUID.
- Ficha de alumno con foto protegida, edad, categoría, nivel, estado y manejo de carga/error.
- Membresías como colección, usando plan, fecha de vencimiento y estado publicados por API.
- `expo-image` instalado mediante Expo SDK 57 y configurado en `app.config.ts`.

### Bloqueos de cierre

1. `GET /students` sólo declara `page` y `size`; no existe filtro server-side por nombre o teléfono. Por privacidad y alcance, la app no descarga la base para filtrarla localmente.
2. `GET /instructor/today` devuelve registros paginados de asistencia, no un DTO de resumen operativo agregado.
3. No existe regla contractual para el estado “por vencer”.
4. El E2E búsqueda → detalle → membresía no puede declararse integrado hasta que exista búsqueda server-side.

Por estos motivos, la versión permanece en `0.1.0`; no se creó release `0.2.0`, APK ni despliegue.

## Validación de estado actual

En el corte se ejecutaron con éxito:

```text
npx expo-doctor                 # 20/20 comprobaciones
npm run lint
npm run typecheck
npm test -- --runInBand         # 173 pruebas aprobadas
npm run verify:contract
npm run generate:api
npm run verify:boundaries
npm run verify:cycles
npm run validate:environments
npm run export                  # bundle Android exportado
git diff --check
```

## Próximo cierre necesario

Para convertir esta matriz en cierres reales de PR, cada PR debe enlazar su revisión, SHA de merge, alcance, resultados de CI, evidencia manual/E2E, riesgos aceptados y decisión de release. Para PR-4, el requisito previo es que backend y OpenAPI publiquen un parámetro de búsqueda server-side y la semántica de resumen operativo.
