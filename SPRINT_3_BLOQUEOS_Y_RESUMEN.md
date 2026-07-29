# Sprint 3 — bloqueos y resumen general

Fecha de corte: 28 de julio de 2026. No se realizó commit, push, build EAS ni despliegue.

## Resumen ejecutivo

Se completó el trabajo no financiero que podía validarse sin inventar semántica de backend:

- integración de branding nativo para Android, iOS, splash y web;
- generación reproducible de assets derivados en `assets/branding/`;
- actualización funcional de G2 y metadata de repositorio a `0.2.0`;
- regeneración de tipos desde el OpenAPI local `1.3.0`;
- endurecimiento del logger para evitar exposición de claves idempotentes, montos,
  caja, referencias y datos de tarjeta;
- pruebas nuevas para branding y sanitización financiera.

No se implementaron caja, pagos ni recibos. El contrato canónico de staging y
la copia local `contracts/openapi/gymbox-openapi.json` coinciden, pero no
publican aún las garantías financieras necesarias para hacerlo de forma segura.

## Estado de G2

G2 queda **APROBADO funcionalmente**:

- búsqueda server-side, ficha, membresías, resumen y rutas protegidas están en
  código;
- typecheck y pruebas locales pasan;
- la evidencia autenticada de staging y Maestro permanece pendiente por falta
  de cuentas seed y un binario instalado.

La metadata del repositorio, EAS y los ejemplos de ambiente se alinearon a
`0.2.0`. Un `.env.local` existente todavía puede sobrescribir la versión para
una máquina local; no se modificó porque es configuración personal ignorada por
Git.

## Branding integrado

| Recurso | Fuente | Uso |
|---|---|---|
| `app-icon-square.png` | `assets/cuadrado.png` | icono general e iOS |
| `app-icon-legacy-android.png` | `assets/cuadrado.png` | Android anterior a adaptive icons |
| `adaptive-icon-foreground.png` | logo transparente, reducido con safe zone | foreground Android adaptive |
| `splash-logo-light.png` | `assets/circular.png` | splash claro |
| `splash-logo-dark.png` | logo transparente | splash oscuro |
| `favicon.png` | `assets/circular.png` | web |

No se usan archivos `.ico` para configuraciones nativas. `monochromeImage` se
omite intencionalmente: no hay una silueta monocromática del logotipo que pueda
derivarse sin alterar la identidad visual.

Los cambios de icono y splash requieren un build nuevo; no se validan por OTA
ni por Expo Go.

## Bloqueos contractuales de Sprint 3

| Área | Bloqueo observado en OpenAPI 1.3.0 y staging | Impacto |
|---|---|---|
| Caja actual | `GET /cash-register/current` no declara `404` ni `CASH_REGISTER_NOT_OPEN`. | No se puede distinguir de forma contractual la ausencia de caja. |
| Caja | La moneda se publica como string libre; no queda restringida a `MXN`. | La app no puede validar exclusivamente la moneda autorizada. |
| Caja | Apertura y cierre no declaran respuestas `409` o `422`. | No se pueden presentar conflictos y reglas de negocio de manera segura. |
| Pago | `POST /payments` sí declara UUID, 201, 200 replay y header `Idempotency-Replayed`; no declara `409` ni `422`. | Falta manejo contractual de conflicto de clave y errores de negocio. |
| Pago | `PaymentSnapshot` no marca como requeridos `id`, `folio`, `amount`, `currency` y demás campos críticos. | No se puede aceptar el resultado financiero como snapshot validado. |
| Recibo | `ReceiptSnapshot.status` y `deliveryStatus` son strings sin enum ni required. | No se pueden modelar de forma segura `PENDING`, `READY` y `FAILED`. |
| Recibo | `fileId` existe pero es opcional y no hay semántica de disponibilidad. | No se puede decidir cuándo acceder a media protegida. |

## Elementos contractuales que sí están disponibles

- OpenAPI 3.1.0, versión `1.3.0`.
- Rutas de apertura, cierre, pago, detalle, recibo y media protegida.
- Métodos `CASH`, `TRANSFER` y `MANUAL_CARD`.
- `effectiveDate` en formato `date`.
- Header `Idempotency-Key` requerido, UUID de 36 caracteres.
- `201` para primer pago y `200` para replay, con `Idempotency-Replayed`.
- `fileId` y `failureCode` en el schema de recibo.

## Validaciones ejecutadas

| Validación | Resultado |
|---|---|
| Generación OpenAPI | APROBADO |
| TypeScript | APROBADO |
| Jest | APROBADO: 26 suites y 187 pruebas |
| Lint normal | APROBADO |
| Expo Doctor | APROBADO: 20/20 comprobaciones |
| `npx expo config --type public` | APROBADO: rutas de branding resueltas |
| Límites arquitectónicos | APROBADO |
| Ciclos | APROBADO |
| Ambientes | APROBADO |
| `git diff --check` | APROBADO |
| E2E Maestro / staging autenticado | PENDIENTE: faltan seeds y build instalado |
| Preview build | PENDIENTE: no se solicitó ni ejecutó build EAS |

## Condición de desbloqueo

Para continuar con MOB-0301 a MOB-0309 y preparar la versión `0.3.0`, backend
debe publicar y desplegar un contrato que incluya:

1. `404 CASH_REGISTER_NOT_OPEN` para caja inexistente.
2. Moneda `MXN` formalizada.
3. Respuestas y códigos `409` y `422` para caja y pagos.
4. Campos requeridos de `CashRegisterSnapshot` y `PaymentSnapshot`, incluido
   folio, monto y moneda.
5. Estados requeridos y enumerados de recibo: `PENDING`, `READY`, `FAILED`.
6. Semántica de disponibilidad para `fileId` y media protegida.

Una vez publicado, se debe volver a generar `src/generated/api`, implementar
adapters y UI financieros, ejecutar pruebas unitarias/integración/E2E, validar
staging con cuentas seed y reevaluar Gate G3.

## Estado final

| Entregable | Estado |
|---|---|
| G2 funcional | APROBADO |
| Branding nativo | APROBADO localmente |
| Seguridad de logs financieros | APROBADO localmente |
| Sprint 3 financiero | BLOQUEADO por contrato backend |
| Gate G3 | BLOQUEADO |
| Release 0.3.0 | NO PREPARADA |
