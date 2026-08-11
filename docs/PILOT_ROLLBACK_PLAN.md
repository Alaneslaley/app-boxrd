# Plan de rollback del piloto móvil GymBox

Estado: **BORRADOR OPERATIVO / REQUIERE APROBACIÓN**

## Disparadores

Ejecutar rollback ante un P0, duplicados, decisión de check-in insegura, acceso
indebido, pérdida de trazabilidad, backend inestable sin reconciliación, o por
orden del dueño/operador.

## Procedimiento

1. El coordinador declara **PAUSA DE PILOTO** con hora y alcance.
2. Detén caja, pagos y check-in en la app; no cierres una pantalla incierta hasta
   capturar folio/traceId seguro.
3. Vuelve al proceso manual vigente de la sucursal. El proceso y responsable
   concretos deben aprobarse antes del piloto.
4. Preserva evidencia: build, plataforma, hora, flow, decisión, folio, traceId y
   códigos, sin PII ni secretos.
5. Reconcilia pagos inciertos con backend antes de aceptar otro cobro.
6. Reconcilia asistencia del día; no registres un segundo check-in para “probar”.
7. Cierra sesión en los dispositivos y retira el binario del grupo de prueba si
   el dueño lo ordena.
8. Abre incidente usando `docs/PILOT_INCIDENT_TEMPLATE.md`.

## Prohibiciones

- No editar ni borrar filas en base de datos manualmente.
- No eliminar pagos, recibos o asistencias desde la app: esos endpoints no
  existen en Fase 1.
- No cambiar de método, llave idempotente o alumno al reconciliar.
- No limpiar SecureStore/caché antes de preservar la evidencia necesaria.
- No desplegar, publicar, taggear ni cambiar a producción como parte del rollback.

## Criterios de reanudación

- causa y alcance identificados;
- P0 en cero con evidencia y regresión;
- P1 corregido o aceptado explícitamente;
- pagos/asistencias/caja reconciliados;
- CI, staging y smoke de plataformas exigidos vuelven a verde;
- dueño/operador autoriza por escrito la nueva ventana.

La reversión de binario/OTA sólo puede ejecutarla el responsable autorizado. Este
plan no concede permiso para EAS Update, build remoto o publicación.
