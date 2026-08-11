# Registro de defectos del piloto GymBox Mobile

Fecha de corte: 2026-08-10  
Estado del piloto: **NO EJECUTADO**

No se registran defectos de piloto porque todavía no hubo una ventana real. Un
registro vacío no demuestra P0 = 0 ni aceptación de P1/P2.

## Defectos observados durante piloto

| ID | Fecha | Severidad | Plataforma/build | Escenario | Evidencia segura | Estado | Fix/regresión | Aceptado por |
|---|---|---|---|---|---|---|---|---|
| — | — | — | — | Piloto no ejecutado | — | PENDIENTE | — | — |

## Bloqueos de readiness (no clasificados como defectos de producto)

| ID | Bloqueo | Evidencia | Estado | Salida requerida |
|---|---|---|---|---|
| RDY-001 | CI remoto no verde | run `31452996436`, commit `c77e0de`, falla en `npm ci`; log restringido | PENDIENTE EXTERNO | publicar commit candidato con autorización y obtener pipeline verde |
| RDY-002 | Staging autenticado sin ejecutar | sólo 401/TLS sin credenciales | PENDIENTE EXTERNO | credenciales/seeds y runbook firmado |
| RDY-003 | Maestro no ejecutado | CLI ausente, ADB sin dispositivo; YAML sólo parseado | PENDIENTE EXTERNO | binarios + dispositivo + seeds + evidencia |
| RDY-004 | Android preview no demostrado | `assembleDebug` agotó 604 s; APK anterior no se aceptó | PENDIENTE | build actual, instalación y smoke |
| RDY-005 | iOS preview ausente | host Windows sin `ios/`; EAS remoto no autorizado | PENDIENTE EXTERNO | preview iOS y smoke |
| RDY-006 | Dependencias transitivas | audit: 16 high, 8 moderate, 0 critical; fixes sugeridos incompatibles | PENDIENTE | aceptación de riesgo o parches compatibles futuros |
| RDY-007 | Aprobación humana ausente | sin firma Product Owner/operador | PENDIENTE EXTERNO | aceptación explícita |

## Reglas de uso

- P0: bloquea piloto/go-live por seguridad, duplicado, corrupción, acceso
  indebido o indisponibilidad esencial.
- P1: alto impacto; debe corregirse o aceptarse explícitamente.
- P2: impacto menor; puede diferirse con aceptación.
- Cada fix debe referenciar tests, CI, staging y plataforma revalidados.
- No incluir PII, secretos, tokens, capturas sensibles ni suposiciones.
