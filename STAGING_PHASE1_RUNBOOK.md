# Runbook de staging — GymBox Mobile Fase 1

Estado: **PREPARADO / PENDIENTE EXTERNO**  
Entorno esperado: `APP_ENV=staging`, HTTPS antes de `/api/v1`, demo session
deshabilitada. Las credenciales y seeds se inyectan; nunca se guardan en Git.

## Gate previo

1. Registrar commit, versión/build, Android/iOS, backend y contrato desplegado.
2. Confirmar CI verde y Doctor 20/20.
3. Instalar preview actual (no Expo Go) en ambas plataformas.
4. Validar/resetear seeds sintéticos de cada flow.
5. Ejecutar `npm run validate:maestro`; esto sólo valida YAML.
6. Abrir un registro de evidencia sin PII y asignar responsable de rollback.

## Variables externas

Usar las variables documentadas en `e2e/maestro/README.md`, incluidas cuentas
generales, financieras, forbidden, alumnos de las cuatro decisiones y el seed
reiniciable de `full-phase1`. El custodio confirma valores por un canal seguro.

## Auth

| Caso | Acción | Resultado esperado | Evidencia |
|---|---|---|---|
| login válido | iniciar sesión interna | Operación de hoy, sucursal correcta | build/hora/rol sintético |
| inválido | credencial deliberadamente inválida | 401 y mensaje sin secretos | código/traceId |
| refresh | token corto/fixture | una coordinación, solicitudes se reanudan | conteo backend sanitizado |
| refresh concurrente | varias lecturas al expirar | un refresh; sin logout falso | log sanitizado |
| logout | online y luego back | token/cache/pending limpiados | pantalla pública |
| logout offline | modo avión Android | salida local; no vuelve con back | video/evidencia segura |
| 403 | cuenta sin permiso | Access denied; backend rechaza ruta | ruta/traceId |
| mustChangePassword | cuenta seed | experiencia de cambio obligatorio | estado visible |

## Students y membership

- Buscar server-side con paginación y término mínimo; comprobar deduplicación.
- Abrir detalle por selección y deep link UUID válido/inválido.
- Verificar foto autenticada sin token en URL ni caché persistente.
- Contrastar edad/nivel/estado y membresías ACTIVE, EXPIRING_SOON, EXPIRED e
  INACTIVE, incluidas 404/403.

## Caja, pago y recibo

Cada flow usa caja/seed aislado. `clearState` no revierte backend.

1. `current` sin caja → abrir con monto y confirmar `OPEN`.
2. CASH: exige caja actual abierta; body exacto y una sola confirmación.
3. TRANSFER y MANUAL_CARD: no pedir datos bancarios/PAN/CVV.
4. Creación 201 + `Idempotency-Replayed:false`.
5. Replay de misma intención: 200 + `Idempotency-Replayed:true`, misma key/body.
6. Conflicto 409 y validación 422: error explícito, sin retry automático.
7. Fallo de transporte post-commit: estado uncertain local y reintento idéntico.
8. Detalle/folio backend; recibos PENDING, READY y FAILED; media autenticada.
9. Cierre autoritativo con expected/counted/difference/CLOSED.
10. Logout elimina pending y caché sensible sin borrar datos del backend.

## Attendance

| Caso | Seed | Resultado esperado |
|---|---|---|
| today | registros sintéticos paginados | lista virtualizada, refresh y no duplicados |
| history | alumno con varias fechas | snapshots históricos sin recálculo |
| ALLOWED | activo, membresía válida, sin asistencia hoy | una asistencia y actualización today/history/summary |
| ALREADY_REGISTERED | asistencia ya existente | mensaje distinto y cero duplicados |
| BLOCKED_EXPIRED_MEMBERSHIP | membresía vencida | bloqueo; cero asistencia; pago sólo con permiso/plan |
| BLOCKED_INACTIVE_STUDENT | alumno inactivo | bloqueo; cero asistencia; sin override |
| offline | modo avión antes de confirmar | UI/application bloquean; cero POST/cola |
| 403 | permiso faltante/backend forbidden | acceso denegado, sin mutación |
| malformed | fixture controlado si backend lo ofrece | error contractual, no retry/éxito |

## Recorrido completo

Ejecutar `sprint-4-full-phase1.yaml` con seed reseteado: login → today → alumno
vencido → ficha → pago idempotente → recibo → membresía activa → ALLOWED →
today → logout. Ejecutar también las coberturas adicionales de Sprint 1–4.

## Evidencia y cierre

- Guardar comando/flow, timestamp, plataforma, build/commit, seed ID sintético,
  resultado y folio/traceId; nunca secretos/PII.
- Reconciliar caja, pagos uncertain y asistencia antes del cierre diario.
- Registrar defectos reales en `PILOT_DEFECT_REGISTER.md`.
- Si cualquier P0 aparece, ejecutar `docs/PILOT_ROLLBACK_PLAN.md`.
- Product Owner/operador firman el resultado; el repositorio no simula firma.

## Estado de este corte

Se verificó sin credenciales que `auth/me` y `attendance/today` responden 401 por
HTTPS con TLS válido. No hubo login, seeds, mutaciones ni ejecución Maestro; por
tanto staging funcional completo permanece `PENDIENTE EXTERNO`.
