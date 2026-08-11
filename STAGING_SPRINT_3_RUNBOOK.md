# Runbook de staging — Sprint 3 GymBox Mobile

Fecha de preparación: 2026-08-10  
Release bajo prueba: `0.2.0`  
Estado de ejecución autenticada: **PENDIENTE EXTERNO**

Este runbook valida MOB-0301 a MOB-0309 contra staging sin guardar credenciales,
PII ni claves idempotentes en Git. El contrato público ya fue verificado; las
operaciones autenticadas requieren cuenta de recepción, sucursal y seeds
sintéticos administrados fuera del repositorio.

## Precondiciones

1. Compilar un artefacto interno SDK 57 con `APP_ENV=staging`, HTTPS y demo
   deshabilitado. No usar un build de producción.
2. Inyectar al proceso Maestro, nunca al YAML:
   `GYMBOX_E2E_RECEPTION_EMAIL`, `GYMBOX_E2E_RECEPTION_PASSWORD`,
   `GYMBOX_E2E_NO_PERMISSION_EMAIL`, `GYMBOX_E2E_NO_PERMISSION_PASSWORD`,
   `GYMBOX_E2E_PAYMENT_SEARCH`, `GYMBOX_E2E_PAYMENT_RESULT`,
   `GYMBOX_E2E_COUNTED_AMOUNT` y los tres IDs sintéticos de recibo documentados
   en `e2e/maestro/README.md`.
3. Preparar una sucursal aislada. Reiniciar su caja y sus pagos antes de cada
   recorrido. `clearState` sólo limpia el dispositivo.
4. Preparar un alumno sintético con una sola membresía renovable y un plan
   ACTIVO en MXN. No usar alumnos reales.
5. Para uncertain/replay, configurar un proxy de una sola ejecución que permita
   el commit del primer `POST /payments` y corte únicamente su respuesta.
6. Sembrar pagos/recibos sintéticos independientes en PENDING, READY y FAILED.
7. Conservar como evidencia únicamente: run URL, fecha, build, estado, HTTP,
   header replay, folio sintético y traceId sanitizado. Nunca registrar tokens.

## Matriz de ejecución

| Caso | Preparación | Procedimiento/evidencia esperada | Estado |
|---|---|---|---|
| open | Caja inexistente; `CAJA_ABRIR` | Ejecutar `sprint-3-cash-open.yaml`; revisión previa, MXN y una sola caja OPEN | PENDIENTE EXTERNO |
| current | Caja abierta y luego inexistente | GET muestra snapshot OPEN; sólo `404 CASH_REGISTER_NOT_OPEN` muestra no-open; red/500 no se convierten | PENDIENTE EXTERNO |
| CASH | Caja OPEN; membresía renovable | `sprint-3-payment-cash.yaml`; quote informativa, body exacto sin amount/cashRegisterId y caja refrescada | PENDIENTE EXTERNO |
| TRANSFER | Caja no requerida | `sprint-3-payment-transfer.yaml`; body con membershipId/method/effectiveDate únicamente | PENDIENTE EXTERNO |
| MANUAL_CARD | Caja no requerida | `sprint-3-payment-manual-card.yaml`; no PAN/CVV/titular/vencimiento/referencia | PENDIENTE EXTERNO |
| 201 | Intención nueva | HTTP 201 + `Idempotency-Replayed: false`; resultado created y folio único | PENDIENTE EXTERNO |
| 200 replay | Proxy one-shot y primer commit confirmado | `sprint-3-payment-replay-external.yaml`; HTTP 200 + header true y banner de replay | PENDIENTE EXTERNO |
| same key | Captura segura del proxy, no logs de app | Comparar el header de ambos intentos; misma UUID, mismo body y mismo fingerprint local | PENDIENTE EXTERNO |
| 409 | Reusar key con payload contractual distinto desde harness externo | `IDEMPOTENCY_KEY_CONFLICT`, sin éxito, sin key nueva y con traceId | PENDIENTE EXTERNO |
| 422 | Seeds para plan inactivo, membresía no renovable y fecha inválida | Mensaje específico por code; sin corrección silenciosa ni invalidación de éxito | PENDIENTE EXTERNO |
| uncertain | Proxy corta respuesta posterior al commit | `sprint-3-payment-uncertain-external.yaml`; aviso “No registres otro cobro” y pending seguro | PENDIENTE EXTERNO |
| detail | ID sintético válido y otro inexistente | Folio, monto, moneda, método, concepto, fechas y alumno opcional; 404 seguro | PENDIENTE EXTERNO |
| receipt PENDING | ID presembrado | `sprint-3-receipt-pending-external.yaml`; sin solicitud de media y refresh manual | PENDIENTE EXTERNO |
| receipt READY | ID/file sintéticos autorizados | `sprint-3-receipt-ready-external.yaml`; bearer en header, sin token en URL y cache `none` | PENDIENTE EXTERNO |
| receipt FAILED | failureCode presembrado | `sprint-3-receipt-failed-external.yaml`; failureCode visible y sin media/regeneración inventada | PENDIENTE EXTERNO |
| media | READY propio y file ajeno/inexistente | 200 protegido; 403/404 degradan a no disponible, no cierran sesión ni persisten archivo | PENDIENTE EXTERNO |
| membership refresh | Pago created y replay | La membresía y lista del alumno se reconcilian después del éxito, nunca antes | PENDIENTE EXTERNO |
| cash refresh | Pago CASH confirmado | Caja current y resumen instructor se invalidan; no se suma saldo en cliente | PENDIENTE EXTERNO |
| close | Caja OPEN | `sprint-3-cash-close.yaml`; expected/count/difference/status/closedAt/closedBy vienen del backend | PENDIENTE EXTERNO |
| 403 | Cuenta sin permisos financieros | `sprint-3-permission-denied.yaml`; endpoint no se consulta cuando guard local lo evita y sesión continúa | PENDIENTE EXTERNO |
| offline | Android; sesión autenticada | `sprint-3-offline-blocked-android.yaml`; no POST, no cola persistida y estado explícito | PENDIENTE EXTERNO |
| logout cleanup | Pending uncertain creado por proxy | `sprint-3-logout-cleanup-external.yaml`; logout borra pending y el siguiente login no lo restaura | PENDIENTE EXTERNO |

## Evidencia por corrida

| Campo | Valor |
|---|---|
| Fecha/hora y zona | |
| Commit/build | |
| Plataforma/dispositivo | |
| Base URL sanitizada | |
| Seed reset confirmado | |
| Flujo Maestro | |
| Resultado | |
| HTTP/header replay sanitizado | |
| Folio sintético | |
| TraceId sanitizado | |
| Enlace a evidencia restringida | |
| Incidencia/bloqueo | |

## Cierre

No se declara staging aprobado mientras alguna fila permanezca pendiente. No se
debe ejecutar EAS remoto, desplegar backend, cambiar producción ni versionar
capturas que contengan PII. Tras completar todos los recorridos, adjuntar la
matriz firmada al Gate G3 y volver a ejecutar CI sobre el mismo commit.
