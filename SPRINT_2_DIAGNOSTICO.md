# Sprint 2 — diagnóstico contractual

Fecha: 28 de julio de 2026. No se habilitó despliegue ni se inició Sprint 3.

## G1

G1 queda verificado en el código: acceso en memoria, refresh en SecureStore, refresh single-flight, logout, rutas protegidas, permisos, `traceId` y cambio de contraseña permanecen cubiertos. La regeneración de OpenAPI reveló fixtures obsoletos de Sprint 1; se corrigieron y `typecheck` y las 173 pruebas pasan.

## Contrato

El contrato local es OpenAPI 3.1.0, versión 1.1.2. Se comparó contra `https://box-rd-backend.onrender.com/v3/api-docs/gymbox-v1`: coinciden las rutas y schemas de Sprint 2. El hash difiere por representación del archivo, no por los endpoints o modelos relevantes.

| Requisito | OpenAPI / backend | Estado | Acción móvil |
|---|---|---|---|
| Búsqueda nombre/teléfono | `/students` sólo tiene `page`, `size` | Bloqueado | No descarga ni filtra datos locales; muestra bloqueo contractual. |
| Paginación | `page`, `size`, página de resultados | Disponible | Pendiente del filtro server-side. |
| Detalle de alumno | `GET /students/{id}` | Disponible | Implementado con UUID, 403/404/error. |
| Edad, categoría, nivel, estado | DTO los publica como opcionales y sin enums | Disponible con datos incompletos posibles | Mapper defensivo y estado no disponible. |
| Foto protegida | `GET /media/{fileId}` | Disponible | `expo-image`, bearer centralizado y placeholder. |
| Membresía y plan | `GET /memberships/student/{studentId}`; incluye nombre/tipo de plan | Disponible | Implementado como colección; no asume una vigente. |
| Vencimiento | Fecha y estado, sin regla `por vencer` | Parcial | Se muestra fecha/estado; no se inventa umbral. |
| Instructor today | Página de asistencias, no resumen agregado | Parcial | Home con quick action, sin conteos inventados. |
| 403 y ApiError/traceId | Respuestas normalizadas | Disponible | Cliente y estados existentes; 403 no cierra sesión. |

## G2 y release

G2 no está aprobado: MOB-0202 y MOB-0208 requieren el parámetro de búsqueda server-side; MOB-0201 necesita un DTO de resumen si se requieren conteos. En consecuencia no se cambió la versión a 0.2.0 ni se creó build o despliegue.

## Validaciones ejecutadas

`npm run verify:contract`, `npm run generate:api`, `npm run typecheck`, `npm test -- --runInBand`, `npm run lint`, `npm run verify:boundaries`, `npm run verify:cycles` y `git diff --check`.
