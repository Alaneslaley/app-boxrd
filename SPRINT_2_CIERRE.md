# Sprint 2 — cierre de desbloqueos

Fecha de corte: 28 de julio de 2026. No se realizó commit, push, build EAS ni despliegue.

## Diagnóstico y diff contractual

| Elemento | Anterior | Contrato 1.2.0 / staging | Acción móvil |
|---|---|---|---|
| Búsqueda | Sólo `page` y `size` | `search` opcional, mínimo 2, máximo 100, paginado | Búsqueda server-side con debounce, `AbortSignal`, `useInfiniteQuery` y `FlatList`. |
| Vencimiento | Sin clasificación | `expirationStatus` y `daysUntilExpiration` | Badge usa la clasificación backend; no recalcula los 5 días. |
| Summary | No había agregado | `GET /instructor/today/summary` | Home muestra los cinco conteos y datos de sucursal/fecha. |

El contrato local OpenAPI 3.1.0, versión 1.2.0, coincide estructuralmente con el contrato canónico de staging para estos endpoints y schemas. Staging responde `401` sin bearer para búsqueda y summary, lo esperado para endpoints protegidos.

## Implementación

- La búsqueda ya usa `GET /students?search=…&page=…&size=20`; no descarga ni filtra la base completa en cliente.
- La entrada se normaliza sólo para UX, tiene debounce de 350 ms, no consulta con menos de dos caracteres, propaga cancelación y deduplica por UUID.
- La ficha presenta `ACTIVE`, `EXPIRING_SOON`, `EXPIRED`, `INACTIVE` y valores desconocidos de forma segura. Para `EXPIRING_SOON` muestra “Vence hoy”, “Vence mañana” o “Vence en N días” a partir de `daysUntilExpiration` publicado por backend.
- El home consume el summary, valida conteos no negativos, conserva política de 30 s, permite refresco manual y muestra offline/stale/403/error.
- Las fotos protegidas usan bearer centralizado, placeholder de error y `expo-image` con caché sólo de memoria.

## Política de queries y privacidad

- Keys: alumnos por término normalizado y tamaño, detalle por UUID, membresías por alumno y summary estable.
- Los términos de búsqueda no se registran ni se persisten; tampoco se usan como logs o almacenamiento offline.
- TanStack Query recibe el `AbortSignal` hasta `GymboxHttpClient`; respuestas de un término anterior no reemplazan el término actual.
- El bridge existente de AppState/NetInfo conserva datos en memoria, pausa red y refetches stale al foreground.
- Tokens no entran en query keys, fotos no usan URL pública y la caché de foto no se persiste en disco.

## Pruebas y validaciones

| Validación | Resultado | Evidencia |
|---|---|---|
| Mappers de búsqueda, vencimiento y summary | APROBADO | 3 suites nuevas; 12 pruebas nuevas. |
| Suite Jest | APROBADO | 25 suites, 185 pruebas. |
| TypeScript, lint, contrato, límites, ciclos y ambientes | APROBADO | Scripts del repositorio ejecutados sin errores. |
| Expo Doctor | APROBADO | 20/20 comprobaciones. |
| Export Android | APROBADO | Bundle Android exportado. |
| Maestro / staging autenticado | PENDIENTE | No hay `GYMBOX_E2E_EMAIL`, credenciales seed ni binario Maestro en el entorno. |

Se añadieron los recorridos Maestro `sprint-2-search-detail-membership.yaml` y `sprint-2-expiring-soon.yaml`; no se declararon ejecutados.

## Gate G2

| Criterio | Estado |
|---|---|
| Contrato 1.2.0 y generación reproducible | APROBADO |
| Búsqueda server-side, mínimo, paginación y cancelación | APROBADO localmente |
| Detalle, foto protegida y membresía | APROBADO localmente |
| `expirationStatus`, `daysUntilExpiration` y badge accesible | APROBADO localmente |
| Summary y cinco conteos | APROBADO localmente |
| CI/local quality y export Android | APROBADO |
| Validación autenticada en staging | PENDIENTE |
| Maestro E2E | PENDIENTE |
| Release 0.2.0 | PENDIENTE |

G2 **no está aprobado** mientras falten las dos evidencias externas. Por esa razón `package.json`, `app.config.ts` y `eas.json` permanecen en `0.1.0`; no se preparó ni distribuyó una release `0.2.0`.

## Próximo paso bloqueante

Entregar por canal seguro una cuenta con `ALUMNOS_CONSULTAR` y `MEMBRESIAS_CONSULTAR`, nombres/teléfonos seed para resultados paginados, y alumnos de casos `EXPIRING_SOON` (0 y 5 días), `ACTIVE` (6 días), `EXPIRED` e `INACTIVE`. Con un build de preview instalado y Maestro disponible, ejecutar los flujos documentados, actualizar este Gate y entonces preparar la release interna 0.2.0 para instructores y recepción seleccionados.
