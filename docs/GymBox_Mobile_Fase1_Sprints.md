---
title: "Plan de sprints de GymBox Mobile"
subtitle: "Backlog, dependencias, criterios de aceptación, demos y gates de release para la Fase 1"
document_code: "GYMBOX-MOB-F1-SPRINTS"
version: "1.0"
date: "23 de julio de 2026"
lang: "es-MX"
---

# Resumen ejecutivo

La Fase 1 móvil se ejecutará en **cuatro sprints de dos semanas**, precedidos por un Sprint 0 de preparación de una semana. La duración de desarrollo funcional es de 8 semanas, consistente con el rango de 6 a 8 semanas del roadmap; la semana de preparación corresponde a la Fase 0 técnica.

El orden está alineado con el blueprint backend: identidad primero; después alumnos/media/membresías; luego caja mínima y pagos; finalmente asistencia, hardening y piloto. No se registra un pago en efectivo antes de que el contrato de caja mínima exista.

<div class="figure">
<img src="assets/sprint_timeline.svg" alt="Línea de tiempo de sprints de GymBox Mobile">
<div class="figure-caption">Figura 1. Secuencia propuesta: preparación y cuatro cortes verticales demostrables.</div>
</div>

<div class="callout decision">
<span class="callout-title">Criterio de planificación</span>
Cada sprint entrega una parte usable en development/preview build. No se acumula integración para el final. Backend, móvil y QA comparten el mismo recorrido E2E y el contrato OpenAPI.
</div>

# 1. Supuestos de planificación

## 1.1 Equipo de referencia

El plan supone una squad con disponibilidad coordinada de:

- desarrollo móvil React Native;
- desarrollo backend Spring/Java 21;
- QA;
- diseño/UX;
- Product Owner u operador del gimnasio para aceptación.

Si una sola persona ejecuta móvil y backend secuencialmente, deben conservarse el orden y los gates, pero no la duración calendario.

## 1.2 Cadencia

| Elemento | Decisión |
|---|---|
| Sprint 0 | 1 semana, preparación técnica. |
| Sprints 1 a 4 | 2 semanas cada uno. |
| Daily | 15 minutos; bloqueo de contrato se escala el mismo día. |
| Refinamiento | una vez por semana. |
| Demo | al cierre de cada sprint sobre preview build y staging. |
| Retrospectiva | después de la demo. |
| Release interna | al menos una por sprint. |

## 1.3 Estimación

Los puntos son relativos y sirven para detectar sobrecarga, no como compromiso fijo. Capacidad inicial de referencia: **24 puntos por sprint de dos semanas**, con 20% reservado para integración, bugs y soporte. Se recalibra al terminar Sprint 1.

## 1.4 Definition of Ready

Una historia entra al sprint cuando:

- tiene usuario, objetivo y valor;
- cuenta con criterios de aceptación verificables;
- el endpoint está definido en OpenAPI o existe un mock contractual aprobado;
- roles/permisos están identificados;
- estados loading, vacío, error, offline y sin permiso están definidos;
- diseño o wireframe está disponible;
- dependencias y datos seed están listos;
- no contiene una decisión de negocio pendiente del dueño/operador.

# 2. Objetivo de la Fase 1

Al finalizar, un usuario autorizado podrá:

1. iniciar sesión y mantener una sesión segura;
2. consultar su operación del día;
3. buscar un alumno y revisar identidad/membresía;
4. abrir o consultar caja mínima según permiso;
5. registrar un pago con folio, idempotencia y recibo;
6. verificar la membresía actualizada;
7. registrar check-in o recibir un bloqueo explícito;
8. consultar asistencia del día;
9. cerrar sesión sin dejar tokens o datos sensibles.

# 3. Dependencias backend

| Corte móvil | Módulos backend requeridos | Contratos mínimos |
|---|---|---|
| Sprint 1 | `shared`, `organization`, `identity` | login, refresh, logout, me, errores. |
| Sprint 2 | `media`, `students`, `memberships` | búsqueda/detalle, foto, planes, membresía por alumno. |
| Sprint 3 | `cash`, `payments`, `notifications`, `audit` mínimo | caja actual/abrir/cerrar, pago, recibo, idempotencia. |
| Sprint 4 | `attendance`, `reports`/instructor query | instructor today, check-in, asistencia de hoy. |

El backend debe publicar una especificación OpenAPI versionada. Móvil no bloquea la estructura interna de Spring, pero exige estabilidad de paths, códigos de error y DTO antes de integrar.

# 4. Sprint 0 - Fundación técnica

**Duración:** 1 semana.  
**Objetivo:** dejar el proyecto listo para construir cortes verticales sin deuda estructural.

## 4.1 Backlog

| ID | Historia/tarea | Prioridad | Puntos |
|---|---|---:|---:|
| MOB-0001 | Inicializar proyecto con template Expo SDK 57 y `src/app`. | P0 | 2 |
| MOB-0002 | Configurar TypeScript strict, aliases y ESLint de límites. | P0 | 3 |
| MOB-0003 | Configurar CNG, `expo-dev-client` y development build Android/iOS. | P0 | 3 |
| MOB-0004 | Crear `app.config.ts` y ambientes local/dev/staging/prod. | P0 | 2 |
| MOB-0005 | Configurar QueryClient, providers y bridges de red/AppState. | P0 | 3 |
| MOB-0006 | Crear design tokens y componentes de estado básicos. | P0 | 3 |
| MOB-0007 | Configurar generación OpenAPI y FakeHttpClient. | P0 | 3 |
| MOB-0008 | Configurar Jest Expo, Testing Library y estructura Maestro. | P0 | 2 |
| MOB-0009 | Pipeline quality: doctor, lint, typecheck, test, boundary check. | P0 | 3 |
| MOB-0010 | Documentar convenciones de commits, PR y Definition of Done. | P1 | 1 |

**Total de referencia:** 25 puntos. Por ser preparación, tareas pueden ejecutarse en paralelo.

## 4.2 Criterios de aceptación

- El proyecto se crea explícitamente con SDK 57.
- `npx expo-doctor`, lint, typecheck y tests están en verde.
- Existe development build instalable en al menos Android y un plan verificable para iOS.
- `src/app`, `src/core`, `src/features`, `src/shared` y `src/generated` existen.
- Una ruta de ejemplo no puede importar un adapter interno por regla de lint.
- El pipeline genera un preview o valida que puede hacerlo.
- La paleta del instructor y los estados base están disponibles.

## 4.3 Demo

Development build con una pantalla pública y una protegida simulada, navegación básica, estado offline y componentes del design system.

## 4.4 Gate de salida G0

No iniciar Sprint 1 sin:

- API base de identidad acordada;
- certificados/HTTPS o ruta segura de dev;
- cuentas seed;
- permisos iniciales;
- owner técnico del OpenAPI.

# 5. Sprint 1 - Autenticación, sesión y permisos

**Duración:** semanas 1 y 2 de Fase 1.  
**Objetivo:** liberar una app interna que inicia sesión, rota tokens y protege rutas de manera correcta.

## 5.1 Backlog

| ID | Historia | Prioridad | Puntos |
|---|---|---:|---:|
| MOB-0101 | Como usuario autorizado, quiero iniciar sesión para entrar a mi operación. | P0 | 5 |
| MOB-0102 | Como usuario, quiero que mi sesión se restaure de forma segura al abrir la app. | P0 | 5 |
| MOB-0103 | Como sistema, quiero rotar refresh token sin carreras concurrentes. | P0 | 5 |
| MOB-0104 | Como usuario, quiero cerrar sesión y eliminar datos locales. | P0 | 3 |
| MOB-0105 | Como usuario, quiero ver sólo rutas y acciones permitidas. | P0 | 3 |
| MOB-0106 | Como soporte, quiero ver `traceId` en errores sin exponer PII. | P1 | 2 |
| MOB-0107 | Como usuario ALUMNO, quiero una respuesta clara de que la experiencia aún no está habilitada. | P1 | 1 |
| MOB-0108 | Pruebas E2E de login válido, inválido, refresh y logout. | P0 | 3 |

**Total:** 27 puntos. Si excede capacidad, MOB-0107 puede simplificarse sin comprometer seguridad.

## 5.2 Dependencias

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- códigos `UNAUTHENTICATED` y `FORBIDDEN`;
- usuarios seed `ADMINISTRADOR`, `RECEPCION`, `INSTRUCTOR`.

## 5.3 Criterios de aceptación

### Login

```gherkin
Dado un usuario activo con credenciales válidas
Cuando envía el formulario de login
Entonces la app almacena sólo el refresh token en SecureStore
Y conserva el access token en memoria
Y consulta /auth/me
Y navega a la ruta permitida.
```

### Refresh

```gherkin
Dadas varias solicitudes que reciben 401 al mismo tiempo
Cuando la sesión puede refrescarse
Entonces se ejecuta una sola llamada de refresh
Y se guarda el nuevo refresh token
Y cada solicitud original se reproduce como máximo una vez.
```

### Logout

- La app intenta revocar el refresh token.
- Limpia tokens, query cache e historial protegido incluso si no hay red.
- Una vuelta atrás no abre una pantalla protegida.
- No hay tokens ni credenciales en logs.

## 5.4 Pruebas obligatorias

- credenciales inválidas;
- usuario inactivo;
- 401 concurrente;
- refresh revocado;
- 403 de ruta/acción;
- arranque sin token;
- arranque con token válido;
- logout offline.

## 5.5 Demo

Login real contra staging, cierre/reapertura de app, restauración de sesión, expiración forzada, refresh y logout.

## 5.6 Incremento/release

**Development release 0.1.0** para equipo interno.

# 6. Sprint 2 - Operación del instructor, alumnos y membresías

**Duración:** semanas 3 y 4.  
**Objetivo:** permitir que el instructor/recepción encuentre al alumno correcto y conozca su estado antes de cualquier acción.

## 6.1 Backlog

| ID | Historia | Prioridad | Puntos |
|---|---|---:|---:|
| MOB-0201 | Ver resumen operativo de hoy y accesos rápidos. | P0 | 5 |
| MOB-0202 | Buscar alumnos por nombre/teléfono con paginación. | P0 | 5 |
| MOB-0203 | Ver ficha operativa con foto, edad, nivel y estado. | P0 | 5 |
| MOB-0204 | Ver membresía, plan y vencimiento del alumno. | P0 | 3 |
| MOB-0205 | Cargar fotos protegidas con placeholder y error. | P0 | 3 |
| MOB-0206 | Mostrar badges accesibles activo/por vencer/vencido. | P0 | 2 |
| MOB-0207 | Manejar vacío, 403, 404, red y datos stale. | P0 | 2 |
| MOB-0208 | E2E búsqueda -> detalle -> membresía. | P0 | 3 |

**Total:** 28 puntos. El endpoint agregado de instructor reduce complejidad; si no está listo, el home se entrega con skeleton y datos disponibles sin acoplarse a múltiples DTO inestables.

## 6.2 Dependencias

- `GET /api/v1/instructor/today`
- `GET /api/v1/students`
- `GET /api/v1/students/{id}`
- `GET /api/v1/memberships/student/{studentId}`
- `GET /api/v1/plans`
- `GET /api/v1/media/{fileId}`
- datos seed con alumno activo, vencido, inactivo y sin foto.

## 6.3 Criterios de aceptación

- La búsqueda no descarga todos los alumnos.
- Las solicitudes previas se cancelan al cambiar el término.
- Cada resultado muestra identidad suficiente para evitar confusión.
- La foto no usa una URL pública fija.
- Edad proviene del backend o de un contrato inequívoco; la app no guarda un campo mutable.
- Vencimiento incluye fecha y texto, no sólo color.
- Un usuario sin permiso no puede abrir la ficha por deep link.
- Al volver de background, los datos stale se refrescan.

## 6.4 Demo

Instructor inicia sesión, ve el día, busca tres alumnos con estados distintos y abre su ficha/membresía.

## 6.5 Incremento/release

**Alpha operativa 0.2.0** para instructores seleccionados, sin pagos habilitados.

# 7. Sprint 3 - Caja mínima, pagos y recibos

**Duración:** semanas 5 y 6.  
**Objetivo:** registrar pagos de manera segura, transaccional e idempotente.

<div class="callout danger">
<span class="callout-title">Orden obligatorio</span>
El pago CASH no entra a producción si caja mínima no está integrada. La validación visual del móvil no sustituye la validación transaccional del backend.
</div>

## 7.1 Backlog

| ID | Historia | Prioridad | Puntos |
|---|---|---:|---:|
| MOB-0301 | Consultar caja actual y estado operativo. | P0 | 3 |
| MOB-0302 | Abrir caja con monto inicial y confirmación. | P0 | 3 |
| MOB-0303 | Cerrar caja básica según permiso. | P0 | 3 |
| MOB-0304 | Crear formulario de pago por alumno/plan/método. | P0 | 5 |
| MOB-0305 | Registrar pago con `Idempotency-Key`. | P0 | 5 |
| MOB-0306 | Manejar timeout con resultado incierto y misma clave. | P0 | 3 |
| MOB-0307 | Mostrar folio, detalle y recibo. | P0 | 3 |
| MOB-0308 | Refrescar membresía, caja e inicio tras éxito. | P0 | 2 |
| MOB-0309 | E2E caja -> pago -> recibo -> membresía. | P0 | 5 |

**Total:** 32 puntos. Es el sprint más riesgoso. Se recomienda dividir el trabajo en cortes: caja, formulario, pago idempotente y recibo. El scope P0 no incluye cancelaciones ni conciliación.

## 7.2 Dependencias

- `POST /api/v1/cash-register/open`
- `GET /api/v1/cash-register/current`
- `POST /api/v1/cash-register/close`
- `POST /api/v1/payments`
- `GET /api/v1/payments/{id}`
- `GET /api/v1/payments/{id}/receipt`
- soporte de `Idempotency-Key`;
- folio generado en servidor;
- outbox/recibo mínimo;
- permisos de caja y pago definidos.

## 7.3 Criterios de aceptación

### Efectivo

- Sin caja abierta, la app bloquea el submit y el backend también.
- Caja se refresca antes de confirmar si el dato está stale.
- El monto esperado no se calcula como autoridad en el móvil.

### Idempotencia

```gherkin
Dado un borrador de pago confirmado
Cuando la primera solicitud termina en timeout
Y el usuario decide reintentar
Entonces la app reutiliza la misma Idempotency-Key
Y el backend devuelve el mismo resultado o evita un segundo cobro.
```

### Resultado

- El botón se desactiva durante el envío.
- No existe retry automático.
- El éxito muestra folio, método, monto, alumno y recibo.
- Un 409/422 no se interpreta como error genérico.
- El `traceId` se puede copiar para soporte.
- No existe acción móvil de borrar/cancelar pago en Fase 1.

## 7.4 Pruebas obligatorias

- doble toque;
- timeout antes/después de commit simulado;
- misma clave repetida;
- nueva clave para pago realmente distinto;
- efectivo sin caja;
- transferencia con referencia faltante;
- 403 de pago;
- 422 de negocio;
- recibo pendiente/listo;
- logout después de un pago.

## 7.5 Demo

Recepción abre caja, busca alumno vencido, registra pago en efectivo, ve un solo folio, abre recibo y confirma membresía renovada.

## 7.6 Incremento/release

**Beta operativa 0.3.0** para uso controlado con datos de staging.

# 8. Sprint 4 - Asistencia, hardening y piloto

**Duración:** semanas 7 y 8.  
**Objetivo:** cerrar el recorrido operativo, elevar calidad y ejecutar un piloto real controlado.

## 8.1 Backlog

| ID | Historia | Prioridad | Puntos |
|---|---|---:|---:|
| MOB-0401 | Consultar asistencia del día. | P0 | 3 |
| MOB-0402 | Registrar check-in desde alumno seleccionado. | P0 | 5 |
| MOB-0403 | Presentar las cuatro decisiones de check-in. | P0 | 3 |
| MOB-0404 | Actualizar inicio y asistencia sin duplicados. | P0 | 2 |
| MOB-0405 | Bloquear check-in offline en Fase 1. | P0 | 2 |
| MOB-0406 | Recorrido E2E completo de Fase 1. | P0 | 5 |
| MOB-0407 | Accesibilidad, rendimiento y pruebas en movimiento. | P0 | 3 |
| MOB-0408 | Revisión de seguridad/logs/PII/permisos. | P0 | 3 |
| MOB-0409 | Preparar preview de piloto, manual y soporte. | P0 | 3 |
| MOB-0410 | Corregir defectos P0/P1 del piloto. | P0 | 5 |

**Total:** 34 puntos, incluidos hardening y defectos. Se reserva capacidad explícita; no se agregan nuevas features durante la segunda mitad.

## 8.2 Dependencias

- `POST /api/v1/attendance/check-in`
- `GET /api/v1/attendance/today`
- `GET /api/v1/attendance/student/{studentId}`
- `GET /api/v1/instructor/today`
- decisiones `ALLOWED`, `ALREADY_REGISTERED`, `BLOCKED_EXPIRED_MEMBERSHIP`, `BLOCKED_INACTIVE_STUDENT`;
- staging con datos de casos límite.

## 8.3 Criterios de aceptación

- `ALLOWED` crea una asistencia y actualiza conteos.
- `ALREADY_REGISTERED` no crea una segunda asistencia.
- `BLOCKED_EXPIRED_MEMBERSHIP` muestra vencimiento y acceso a pago sólo si existe permiso.
- `BLOCKED_INACTIVE_STUDENT` no ofrece bypass.
- Sin red, el botón de check-in está bloqueado con explicación.
- No existe override en Fase 1.
- Pull-to-refresh y foreground no duplican mutaciones.
- El recorrido completo pasa en Android e iOS preview.

## 8.4 Hardening

### Seguridad

- tokens sólo en ubicaciones definidas;
- 401/403/409/422 revisados;
- logs sanitizados;
- deep links protegidos;
- ninguna URL de media pública persistente;
- cache y sesión se limpian en logout.

### Accesibilidad

- labels y roles;
- orden de foco;
- contraste;
- target 48 dp;
- error de formulario anunciado;
- estado no comunicado sólo por color.

### Rendimiento

- listas paginadas/virtualizadas;
- imágenes con tamaño y placeholder;
- no renderizar listas completas;
- evitar refetch loops;
- medir tiempos de inicio y flujo crítico en dispositivos objetivo.

## 8.5 Piloto

- 1 sucursal;
- 2 a 4 usuarios operativos;
- conjunto de alumnos de prueba o ventana controlada;
- soporte presente durante los primeros turnos;
- plan de rollback a proceso manual;
- reporte diario de incidencias.

## 8.6 Demo final

```text
login
→ instructor today
→ búsqueda de alumno vencido
→ apertura/consulta de caja
→ pago idempotente
→ recibo
→ membresía activa
→ check-in permitido
→ asistencia del día
→ logout
```

## 8.7 Incremento/release

**Release candidate 1.0.0-rc.1** para piloto. El salto a 1.0.0 requiere gates de Fase 1.

# 9. Gates de release

## G1 - Seguridad de sesión

- login, refresh y logout E2E en verde;
- refresh concurrente probado;
- sin tokens en logs/storage no autorizado;
- 403 probado.

## G2 - Identidad correcta

- búsqueda paginada;
- foto protegida;
- membresía visible con fecha/estado;
- 404/403/deep link resueltos.

## G3 - Seguridad financiera

- caja requerida para CASH;
- idempotencia demostrada;
- no retry automático;
- folio único del servidor;
- recibo consultable;
- no existe delete/cancel mobile.

## G4 - Operación y piloto

- decisiones de check-in correctas;
- E2E completo en Android/iOS;
- cero defectos P0 abiertos;
- defectos P1 aceptados/corregidos;
- manual operativo y rollback;
- aprobación del dueño/operador.

# 10. Backlog explícitamente diferido

| Item | Fase prevista | Razón |
|---|---:|---|
| Override de vencido | Fase 2 | Requiere auditoría y permisos reforzados. |
| Cancelación/reversa de pago | Fase 2 | Riesgo financiero; conservar historial. |
| Descuentos | Fase 2 | Autorizador y motivo auditado. |
| Evidencia y handover de caja | Fase 2 | Conciliación completa. |
| Observaciones, RPE y dolor | Fase 3 | Módulo deportivo. |
| Evaluaciones y progreso | Fase 3 | Ciclos y criterios deportivos. |
| Home del alumno | Fase 4 | Experiencia final, no shell incompleto. |
| Mutaciones offline | No planificadas para finanzas | Requieren rediseño de consistencia/auditoría. |
| QR check-in | backlog posterior | Primero estabilizar búsqueda y reglas. |
| Push notifications | Fase 4/5 | Requiere device tokens y estrategia de mensajes. |

# 11. Métricas objetivo del piloto

Son objetivos de producto/operación a validar, no garantías:

| Métrica | Objetivo inicial |
|---|---:|
| Sesiones sin crash | >= 99.5% |
| Login exitoso con credenciales válidas | >= 99% |
| Pagos duplicados por reintento | 0 |
| Check-in vencido aceptado sin permiso | 0 |
| Tiempo mediano búsqueda -> ficha | <= 5 s en red operativa |
| Tiempo mediano ficha -> check-in | <= 10 s |
| Pagos con resultado incierto sin resolución | 0 al cierre diario |
| Defectos P0 abiertos al go-live | 0 |
| Usuarios piloto capacitados | 100% |

# 12. Riesgos y respuesta

| Riesgo | Señal temprana | Respuesta |
|---|---|---|
| OpenAPI cambia durante sprint | regeneración rompe tipos | freeze de contrato, versionado y cambio formal. |
| Backend llega tarde | mocks divergen | demo parcial sólo si fixture es contractual; no declarar integración terminada. |
| Pago duplicado | dos folios para misma intención | bloquear release, prueba idempotente y revisión backend. |
| Red inestable | timeouts frecuentes | mismo idempotency key, estado incierto y soporte operativo. |
| Permisos incompletos | 403 inesperados | matriz de rol/permiso y seed validado antes de demo. |
| Fotos lentas | scroll/render degradado | thumbnails, `expo-image`, dimensiones y placeholder. |
| Scope creep deportivo | historias nuevas en Sprint 4 | diferir al backlog de Fase 3. |
| QA concentrado al final | bugs sistémicos tardíos | QA desde Sprint 0 y E2E incremental. |

# 13. Ceremonia de demo por sprint

Cada demo debe mostrar:

1. build/version/ambiente visibles;
2. recorrido sobre dispositivo real o simulador representativo;
3. escenario exitoso;
4. error de permiso o regla de negocio;
5. evidencia de tests/CI;
6. lista de deuda aceptada;
7. decisión de Product Owner: aceptado, aceptado con observaciones o rechazado.

No se acepta una demo basada únicamente en capturas o mocks cuando el objetivo del sprint era integración real.

# 14. Definition of Done de Fase 1

- [ ] Los cuatro sprints fueron aceptados.
- [ ] El recorrido E2E completo pasa en staging.
- [ ] Login/refresh/logout son robustos.
- [ ] Roles y permisos se aplican en UI y backend.
- [ ] Alumno, foto, edad, nivel y membresía se muestran correctamente.
- [ ] Pago CASH exige caja abierta.
- [ ] Todo pago usa una `Idempotency-Key`.
- [ ] No hay retry automático de mutaciones financieras.
- [ ] El folio y recibo provienen del backend.
- [ ] Check-in duplicado/vencido/inactivo se resuelve explícitamente.
- [ ] No existe override ni cancelación escondida.
- [ ] Errores muestran `traceId` sin PII.
- [ ] Logout limpia sesión y caches.
- [ ] Accesibilidad y contraste fueron revisados.
- [ ] Android e iOS preview fueron probados.
- [ ] Cero P0 abiertos y plan aceptado para P1/P2.
- [ ] Manual de operación, soporte y rollback disponible.
- [ ] Product Owner y operador aprueban piloto/go-live.

# 15. Roadmap de releases

| Versión | Corte | Audiencia |
|---|---|---|
| `0.1.0` | auth/sesión | equipo técnico. |
| `0.2.0` | instructor/alumnos/membresías | instructores seleccionados. |
| `0.3.0` | caja/pagos/recibo | QA y operadores en staging. |
| `1.0.0-rc.1` | asistencia + hardening | piloto de sucursal. |
| `1.0.0` | gates aprobados | producción controlada. |

# 16. Trazabilidad con roadmap y blueprint backend

| Fuente | Ajuste aplicado al plan móvil |
|---|---|
| Roadmap: auth -> alumnos -> membresías -> pagos -> asistencia | Se conserva el orden funcional. |
| Blueprint backend: caja mínima requerida por efectivo | Caja se integra dentro de Sprint 3 antes del pago CASH. |
| Arquitectura: app rápida y por roles | Inicio, búsqueda y acciones de uno o dos pasos. |
| Arquitectura: pagos/caja online | Mutaciones críticas bloqueadas offline. |
| Backend: idempotencia | Historia P0 y gate financiero. |
| Backend: check-in con decisión explícita | Sprint 4 cubre los cuatro resultados. |
| Roadmap: app alumno fuera de Fase 1 | Se evita construir una experiencia incompleta. |
| Color report: estados inequívocos | Accesibilidad y semántica desde Sprint 0. |

# 17. Fuentes técnicas oficiales

- <https://expo.dev/changelog/sdk-57>
- <https://docs.expo.dev/more/create-expo/>
- <https://docs.expo.dev/develop/development-builds/introduction/>
- <https://docs.expo.dev/router/advanced/protected/>
- <https://docs.expo.dev/versions/v57.0.0/sdk/router/>
- <https://reactnative.dev/blog/2026/06/23/react-native-0.86>
