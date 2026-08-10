# Sprint 3 — cierre técnico

Fecha de corte: 29 de julio de 2026. No se realizó commit, push, build EAS ni
despliegue.

## Resultado

Sprint 3 queda **APROBADO localmente** contra el contrato OpenAPI 3.1.0,
versión 1.3.0. El cliente generado se regeneró desde
`contracts/openapi/gymbox-openapi.json` y se completó el flujo financiero
disponible en el contrato.

## Entregado

- Caja: consulta, apertura en MXN, cierre y presentación de `countedCash` y
  `difference` cuando el backend los devuelve.
- Pagos desde la membresía del alumno, sólo con `PAGOS_REGISTRAR`, métodos
  `CASH`, `TRANSFER` y `MANUAL_CARD`, y fecha efectiva local.
- Importe y concepto no se capturan en el cliente: son snapshots financieros
  autoritativos del backend.
- Idempotencia: UUID por confirmación, doble toque bloqueado, `retry: 0`,
  detección de resultado incierto y reintento manual con la misma clave.
- El registro incierto se guarda mínimamente en `expo-secure-store`, ligado al
  dispositivo; un dato corrupto se descarta sin enviar solicitudes.
- Detalle de pago y recibo con unión discriminada `PENDING` / `READY` /
  `FAILED`, 404 documentado y vista protegida para el archivo `READY` mediante
  la sesión vigente.
- Invalidación posterior sólo a éxito confirmado: pagos, caja, membresías y
  resumen operativo.
- Iconos, splash y metadatos de la app se mantienen como trabajo de Sprint 3;
  Expo SDK 57 se alineó a sus parches compatibles.

## Validación local

| Validación | Resultado |
|---|---|
| OpenAPI generado | APROBADO |
| Expo Doctor | 20/20 comprobaciones |
| Lint y TypeScript | APROBADO |
| Jest | 27 suites, 191 pruebas |
| Contrato, límites, ciclos y ambientes | APROBADO |
| Export Android | APROBADO; bundle generado en `dist/` |

## Evidencia externa aún necesaria

No es un bloqueo de implementación, pero queda pendiente para certificar G3
fuera del entorno local:

- credenciales y datos seed financieros de staging;
- validación autenticada de apertura, primer pago, replay idempotente, 409,
  422, detalle, recibo y cierre;
- ejecución Maestro sobre un binario instalado;
- build preview y revisión visual de icono/splash en Android; plan o evidencia
  equivalente para iOS;
- CI remoto en verde.

## Advertencias contractuales ajenas al flujo financiero

`npm run verify:contract` conserva tres advertencias preexistentes del área de
autenticación: `UserSnapshot` no exige `branchId`/`branchName`, y los endpoints
auth no documentan 403 ni 409. No afectan caja, pagos ni recibos de Sprint 3.

## Gate G3

| Criterio | Estado |
|---|---|
| Contrato financiero 1.3.0 y tipos generados | APROBADO |
| Caja y resultado de cierre | APROBADO localmente |
| Pago idempotente y estado incierto | APROBADO localmente |
| Detalle, recibo y media protegida | APROBADO localmente |
| Pruebas y export Android | APROBADO |
| Staging autenticado, Maestro y CI | PENDIENTE como evidencia externa |

G3 queda **APROBADO localmente**. No se declara distribución ni despliegue;
la aprobación operativa final requiere la evidencia externa anterior.
