# Runbook de soporte del piloto móvil GymBox

Estado: **PREPARADO / NO EJECUTADO**

## Triage inicial

1. Detén la repetición de la operación afectada.
2. Registra plataforma, versión/build, entorno, hora con zona y último paso.
3. Copia `traceId`, folio, paymentId o código funcional si la UI lo muestra.
4. Confirma conectividad y si el problema afecta a un usuario, sucursal o todos.
5. Clasifica el impacto con el registro de defectos; no prometas resolución ni
   marques P0/P1 aceptado sin dueño explícito.

No recopiles contraseña, token, Authorization, cookies, PAN/CVV, foto, teléfono,
correo o nombre real. Los logs de aplicación deben pasar por el logger
sanitizante.

## Pago incierto

- Síntoma: **No pudimos confirmar el resultado**.
- Acción: impedir un pago nuevo; usar sólo **Reintentar la misma operación**.
- Evidencia: hora, método, membresía sintética, traceId si existe y resultado del
  reintento.
- Escalación: backend/finanzas si no resuelve antes del cierre diario.
- Prohibido: cambiar método, generar otra llave o borrar el pending manualmente.

## Recibo FAILED o PENDING

- El pago confirmado no se revierte por un recibo pendiente o fallido.
- Usa **Actualizar recibo**; conserva folio, receiptNumber, estado y failureCode.
- Escala generación/media si persiste. No vuelvas a cobrar.

## Diferencia de caja

- Conserva monto contado, expected, difference, estado `CLOSED`, hora y traceId.
- No reabras ni edites la caja desde base de datos.
- Escala al responsable operativo para conciliación manual.

## 403 / acceso denegado

- Confirma que la cuenta y sucursal sean las asignadas.
- Registra pantalla/ruta y permiso esperado, sin copiar el token.
- No añadas permisos desde el cliente. Escala a administración/backend.

## Offline o backend no disponible

- Offline: caja, pagos y check-in permanecen bloqueados; lecturas pueden mostrar
  datos sólo en memoria y advertir que están desactualizados.
- Backend no disponible: verifica status público/TLS sin credenciales; pausa las
  mutaciones y activa rollback manual si supera la ventana acordada.
- Nunca presentes caché como estado autoritativo.

## Datos desactualizados

- Recupera conectividad y usa la acción **Actualizar** o pull-to-refresh.
- Verifica fecha operativa/sucursal y compara contra el backend.
- Si persiste, registra traceId y consulta afectada; no borres caché antes de
  preservar evidencia.

## Crash o pantalla bloqueada

- Registra plataforma, build, ruta anterior, acción y hora.
- Reinicia una vez. Si se reproduce, detén el flow y conserva logs sanitizados.
- Un crash en pago/check-in con resultado desconocido se trata como operación
  incierta: no repetir hasta reconciliar con backend.

## Severidades y escalación

| Nivel | Criterio | Respuesta del piloto |
|---|---|---|
| P0 | riesgo de duplicado, pérdida/corrupción, acceso indebido o piloto inutilizable | detener piloto y ejecutar rollback |
| P1 | operación principal bloqueada o decisión incorrecta con workaround controlado | pausar flow afectado y escalar de inmediato |
| P2 | defecto menor sin pérdida ni decisión incorrecta | registrar y continuar si el dueño acepta |

Canales, responsables y SLA deben completarse antes del piloto en
`PILOT_READINESS_CHECKLIST.md`; este repositorio no inventa personas ni contactos.
