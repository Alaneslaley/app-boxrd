# Manual de operación del piloto móvil GymBox

Estado: **PREPARADO / NO EJECUTADO**  
Versión de implementación: `0.2.0`  
Objetivo eventual: `1.0.0-rc.1` (metadata todavía no aplicada)

Este manual cubre el recorrido del personal interno durante un piloto controlado.
No sustituye las reglas del backend ni autoriza overrides, cancelaciones o edición
manual de datos.

## Inicio y cierre de turno

1. Abre el binario preview asignado; no uses Expo Go como evidencia.
2. Confirma que la pantalla diga **GymBox** y que no muestre un entorno de
   producción si el piloto corresponde a staging.
3. Inicia sesión con la cuenta sintética o controlada entregada fuera del
   repositorio.
4. Verifica sucursal y fecha operativa en **Operación de hoy**.
5. Si aparece **Sin conexión**, no registres caja, pagos ni check-in.
6. Al finalizar, vuelve al inicio y toca **Cerrar sesión**. Confirma que aparece
   de nuevo **GymBox**.

## Alumno y membresía

1. En **Operación de hoy**, toca **Buscar alumnos**.
2. Escribe al menos dos caracteres de nombre o teléfono.
3. Selecciona el resultado esperado y contrasta nombre, foto protegida, edad,
   nivel y estado.
4. Revisa la membresía publicada por el servidor:
   **Activa**, **Próxima a vencer**, **Vencida** o **Inactiva**.
5. No recalcules edad, categoría, vencimiento ni clases restantes.

## Caja

1. En el inicio toca **Consultar caja**.
2. Si no existe caja abierta, usa **Abrir caja**, captura el monto inicial,
   revisa el resumen y confirma una sola vez.
3. Para efectivo, confirma siempre que la caja actual esté abierta.
4. Para cerrar, captura el monto contado. La diferencia final es autoritativa
   del servidor; conserva el folio/traceId si existe discrepancia.

## Pago y recibo

1. Desde una membresía con plan visible, toca **Registrar pago**.
2. Elige **Efectivo**, **Transferencia** o **Tarjeta manual**. La app nunca debe
   solicitar PAN, CVV, CLABE ni datos bancarios.
3. Revisa monto de referencia, método y fecha; confirma una sola vez.
4. No vuelvas a tocar ni inicies otro pago mientras haya una operación pendiente.
5. Si aparece **No pudimos confirmar el resultado**, no crees otro cobro. Usa
   **Reintentar la misma operación**; conserva la misma intención protegida.
6. En el detalle, registra el folio del servidor. El recibo puede estar:
   **PENDING**, **READY** o **FAILED**. Usa **Actualizar recibo** sin crear otro
   pago.

## Check-in y asistencia

1. Desde la ficha toca **Registrar check-in**.
2. Contrasta identidad y membresía; el servidor sigue siendo autoritativo aunque
   la membresía no sea visible por permisos.
3. Toca **Revisar check-in**, relee el alumno y confirma con
   **Registrar check-in ahora** una sola vez.
4. Interpreta la decisión:

   - **Check-in registrado**: `ALLOWED`; quedó confirmado.
   - **Asistencia ya registrada**: `ALREADY_REGISTERED`; no se creó otra.
   - **Membresía vencida**: `BLOCKED_EXPIRED_MEMBERSHIP`; no hubo asistencia.
     Sólo usa **Registrar pago** si el botón está disponible por permiso y plan.
   - **Alumno inactivo**: `BLOCKED_INACTIVE_STUDENT`; no hubo asistencia ni
     override móvil.

5. Usa **Ver asistencia de hoy** o **Ver historial** para confirmar el registro.
6. Sin conexión, el botón queda deshabilitado. No existe cola offline.

## Evidencia diaria segura

Registra fecha, sucursal sintética/controlada, plataforma, versión/build, flow,
resultado, folio o traceId y hora. No adjuntes tokens, contraseñas, teléfono,
correo, foto, recibo completo ni nombre real. Usa los IDs sintéticos definidos
por el coordinador del piloto.

## Qué no hacer

- No repetir pagos o check-in por ansiedad ante un timeout.
- No editar base de datos ni “corregir” decisiones del backend.
- No usar datos personales reales fuera de la ventana autorizada.
- No compartir capturas: la experiencia interna las bloquea deliberadamente.
- No aprobar el piloto ni el RC desde este manual.
