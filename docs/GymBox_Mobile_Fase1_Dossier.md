---
title: "Dossier de arquitectura GymBox Mobile"
subtitle: "Arquitectura, blueprint y plan de sprints de la Fase 1"
document_code: "GYMBOX-MOB-F1-DOSSIER"
version: "1.0"
date: "23 de julio de 2026"
lang: "es-MX"
---

# Parte I - Arquitectura

## Resumen ejecutivo

La app móvil de GymBox será una sola aplicación React Native construida con **Expo SDK 57, React Native 0.86, React 19.2 y TypeScript estricto**. En la Fase 1 su función principal será habilitar la operación diaria de **instructores, recepción y administradores autorizados**: iniciar sesión, consultar la clase del día, localizar alumnos, revisar su membresía, abrir o consultar la caja mínima, registrar pagos, obtener el recibo y realizar check-in.

La arquitectura adopta un modelo **feature-first con capas internas**, no una estructura global de `screens/services/repositories`. Las rutas de Expo Router sólo componen pantallas y aplican guards; cada capacidad de negocio vive en un módulo vertical con su API, modelo, casos de uso/hooks y UI. El estado remoto se administra con TanStack Query; los tokens se protegen mediante SecureStore; el backend Spring Boot bajo `/api/v1` conserva toda regla crítica, autorización, transacción y auditoría.

<div class="callout decision">
<span class="callout-title">Decisión de alcance</span>
El alta y edición administrativa completa de alumnos permanece en la web Angular de Fase 1. La app móvil consume alumnos en modo operativo y sólo habilita acciones según permisos. La experiencia final del rol ALUMNO se reserva para la Fase 4 del roadmap.
</div>

<div class="callout danger">
<span class="callout-title">Regla financiera no negociable</span>
Pagos, caja y check-in no se encolan para sincronización offline. Ante pérdida de red, la app bloquea la operación, conserva únicamente el borrador no sensible y obliga a reintentar contra el servidor. Los reintentos de pago reutilizan la misma `Idempotency-Key`.
</div>

<div class="figure">
<img src="assets/architecture_context.svg" alt="Contexto de arquitectura de GymBox Mobile">
<div class="figure-caption">Figura 1. La app móvil es un cliente del monolito modular; PostgreSQL sigue siendo la fuente única de verdad.</div>
</div>

## 1. Propósito, alcance y fuentes

### 1.1 Propósito

Este documento establece la arquitectura objetivo de la aplicación móvil para convertir el roadmap y el blueprint backend en una solución implementable. Define:

- tecnologías y decisiones obligatorias;
- módulos, dependencias y límites;
- navegación por sesión y permisos;
- acceso a API, estado, persistencia y tratamiento offline;
- controles de seguridad para pagos, caja, alumnos y archivos;
- estrategia de pruebas, builds, releases y observabilidad;
- decisiones de evolución más allá de la Fase 1.

### 1.2 Fuentes del Drive

| Fuente | Versión/fecha | Decisiones incorporadas |
|---|---:|---|
| `arquitectura_aplicacion_gimnasio_box.pdf` | 1.0 - 2 julio 2026 | Una app por roles; uso rápido en clase; backend como autoridad; offline limitado; pagos y caja en línea; REST `/api/v1`; auditoría y archivos protegidos. |
| `roadmap_aplicacion_gimnasio_box.pdf` | 1.0 - 2 julio 2026 | Fase 1 de 6 a 8 semanas; auth, alumnos, membresías, pagos, comprobante, asistencia y panel básico de instructor. |
| `GymBox_Backend_Fase1_Blueprint_IA.pdf` | 1.1 - 13 julio 2026 | Contratos móviles; caja mínima antes de efectivo; JWT y refresh rotativo; idempotencia; decisiones explícitas de check-in; errores con `traceId`. |
| `Informe de color para la app y web del gimnasio de box.pdf` | 10 julio 2026 | Paleta de instructor, semántica de estados, contraste, uso de icono + texto y rojo reservado a riesgo/bloqueo. |

### 1.3 Validación tecnológica vigente

La propuesta se actualizó con documentación oficial disponible al 23 de julio de 2026:

- Expo SDK 57 integra React Native 0.86 y React 19.2.
- El template oficial de SDK 57 incluye Expo Router y TypeScript.
- Expo recomienda development builds para aplicaciones destinadas a producción.
- Expo Router permite `src/app`, rutas protegidas y navegación basada en archivos.
- Spring Boot 4.1 es compatible con Java 21; el contrato móvil continúa desacoplado de la versión interna del backend.

## 2. Alcance funcional de la Fase 1 móvil

### 2.1 Capacidades incluidas

| Capacidad | Usuario principal | Resultado |
|---|---|---|
| Autenticación y sesión | Todos los roles móviles permitidos | Login, restauración de sesión, refresh rotativo, usuario actual y logout. |
| Inicio del instructor | Instructor/recepción | Resumen operativo de hoy, alertas y accesos rápidos. |
| Consulta de alumnos | Instructor/recepción/admin | Búsqueda, foto, edad, nivel inicial, estado y datos operativos autorizados. |
| Consulta de membresía | Instructor/recepción/admin | Estado, plan, fecha de vencimiento y clases disponibles cuando aplique. |
| Caja mínima | Recepción/admin/instructor autorizado | Abrir, consultar y cerrar caja básica según permiso. |
| Pago | Recepción/admin/instructor autorizado | Registrar efectivo, transferencia o tarjeta manual con folio e idempotencia. |
| Recibo | Operador autorizado | Mostrar y compartir/consultar el comprobante generado por backend. |
| Asistencia | Instructor/recepción | Check-in y consulta de asistencias del día. |
| Estados operativos | Todos | Loading, vacío, error, sin permiso, offline y resultado de regla de negocio. |

### 2.2 Fuera de alcance

- Alta y edición administrativa completa de alumnos desde el móvil.
- Cancelación de pagos, descuentos, reversas y conciliación avanzada.
- Evidencia fotográfica y entrega física de caja.
- Override de check-in vencido.
- Ciclos, evaluaciones, RPE, bienestar, lesiones y progreso deportivo.
- Aplicación final del alumno.
- Operación financiera offline.
- Integración real con terminal bancaria o WhatsApp.
- Microservicios, gateway, Kafka o sincronización distribuida.

### 2.3 Roles y permisos

La navegación se decide por **sesión + permisos**, no por nombre de rol codificado en componentes. Los roles de la migración inicial son `ADMINISTRADOR`, `RECEPCION`, `INSTRUCTOR` y `ALUMNO`.

- `ADMINISTRADOR`: puede acceder a todas las funciones móviles de Fase 1 si el backend concede los permisos.
- `RECEPCION`: alumnos, membresías, caja, pagos y asistencia según permisos.
- `INSTRUCTOR`: inicio operativo, alumnos, membresías y check-in; pagos/caja sólo con permiso explícito.
- `ALUMNO`: no recibe la experiencia incompleta de instructor. En Fase 1 se muestra una pantalla informativa o el backend limita el acceso móvil hasta la Fase 4.

<div class="callout decision">
<span class="callout-title">Autoridad</span>
Los guards móviles mejoran la experiencia, pero no protegen datos por sí solos. Cada endpoint sensible debe responder 403 cuando el permiso no existe. La app siempre trata al backend como autoridad.
</div>

## 3. Decisiones de plataforma

### 3.1 Base del proyecto

| Elemento | Decisión |
|---|---|
| Framework | Expo SDK 57 sobre React Native 0.86. |
| Lenguaje | TypeScript con `strict: true`. |
| UI | React Native; componentes funcionales y hooks. |
| Navegación | Expo Router del SDK 57; rutas en `src/app`. |
| Build de desarrollo | `expo-dev-client`; no depender de Expo Go para el ciclo real. |
| Generación nativa | Continuous Native Generation (CNG); `android/` e `ios/` regenerables. |
| Estado servidor | TanStack Query. |
| Formularios | React Hook Form + Zod. |
| HTTP | `fetch`/`expo/fetch` detrás de un cliente propio tipado. |
| Contrato | OpenAPI del backend como fuente de tipos de transporte. |
| Tokens | Access token en memoria; refresh token en `expo-secure-store`. |
| Imágenes | `expo-image` y endpoint autorizado `/api/v1/media/{fileId}`. |
| Identificadores idempotentes | UUID generado con API criptográfica disponible en Expo. |
| Pruebas | Jest Expo, React Native Testing Library y recorridos E2E con Maestro. |
| Distribución | EAS Build con perfiles development, preview y production. |

### 3.2 Inicialización canónica

```bash
npx create-expo-app@latest gymbox-mobile --template default@sdk-57
cd gymbox-mobile
npx expo install expo-dev-client expo-secure-store expo-sqlite expo-image expo-crypto expo-constants
npx expo install @react-native-community/netinfo
npm install @tanstack/react-query react-hook-form zod @hookform/resolvers openapi-fetch
npm install -D openapi-typescript jest-expo @testing-library/react-native
npx expo-doctor
```

Las librerías administradas por Expo se instalan con `npx expo install` para resolver versiones compatibles con SDK 57. El lockfile se versiona y CI usa instalación reproducible.

### 3.3 Identidad de aplicación

| Campo | Valor propuesto |
|---|---|
| Nombre de repositorio | `gymbox-mobile` |
| Slug Expo | `gymbox-mobile` |
| Android package | `mx.com.gymbox.mobile` |
| iOS bundle identifier | `mx.com.gymbox.mobile` |
| Scheme de deep link | `gymbox` |
| Zona horaria de negocio | `America/Mexico_City` |
| API base | Configurable por ambiente, siempre terminando antes de `/api/v1`. |

## 4. Estilo arquitectónico

### 4.1 Feature-first con capas internas

La app se divide por capacidades del negocio. Cada feature puede incluir:

- `api/`: adapter remoto, DTO generados y validación de frontera;
- `application/`: query hooks, mutation hooks y orquestación del caso de uso;
- `model/`: tipos internos, mappers, claves de caché y reglas de presentación;
- `ui/`: pantalla y componentes específicos;
- `index.ts`: API pública del feature.

No todos los módulos necesitan todas las carpetas. Una feature pequeña puede comenzar con tres o cuatro archivos y crecer sólo cuando la complejidad lo justifique.

<div class="figure">
<img src="assets/module_boundaries.svg" alt="Límites entre paquetes de la app">
<div class="figure-caption">Figura 2. Dependencias permitidas y prácticas expresamente prohibidas.</div>
</div>

### 4.2 Capas de nivel superior

#### `src/app`

Responsable de layouts, rutas, tabs, modales, deep links, guards y composición de providers. No contiene reglas de negocio, llamadas HTTP ni formularios completos.

#### `src/features`

Contiene los cortes verticales. Una feature conoce su contrato remoto, modelo interno, consultas/mutaciones y UI. Su `index.ts` es la única superficie importable por otras áreas.

#### `src/core`

Infraestructura técnica compartida: configuración, HTTP, sesión, query client, storage, permisos, reloj, observabilidad y bridges de ciclo de vida/red. No depende de features.

#### `src/shared`

Design system, componentes reutilizables y utilidades puras. No sabe qué es un pago, membresía o check-in.

#### `src/generated`

Código generado desde OpenAPI. No se edita manualmente. Los componentes nunca importan directamente estos DTO.

### 4.3 Reglas de dependencias

1. `app` puede importar APIs públicas de `features`, `core` y `shared`.
2. `features` puede importar `core`, `shared` y `generated`.
3. `core` no importa features.
4. `shared` no importa features ni reglas de negocio.
5. Una feature no importa carpetas internas de otra; usa únicamente su `index.ts` o un contrato pequeño.
6. Ningún componente llama `fetch` directamente.
7. Ninguna entidad de transporte llega a la UI sin mapper.
8. No existe una carpeta global `services/` o `models/` para todo el producto.
9. Los imports relativos que atraviesen la raíz de una feature se bloquean con ESLint.
10. Los ciclos de dependencias fallan en CI.

### 4.4 Clases frente a funciones

React y TypeScript no requieren modelar todo como clases. La guía es:

- **clases** para objetos con ciclo de vida o estado técnico: `GymboxHttpClient`, `RefreshCoordinator`, `SessionService`;
- **interfaces** para puertos: `TokenVault`, `Telemetry`, `IdempotencyKeyFactory`;
- **tipos readonly** para modelos: `StudentSummary`, `MembershipSnapshot`, `PaymentReceipt`;
- **funciones puras** para mappers, formatters y reglas de presentación;
- **hooks** para integrar casos de uso con React y TanStack Query.

## 5. Arquitectura de navegación

### 5.1 Árbol de rutas de Fase 1

```text
src/app/
├── _layout.tsx
├── +not-found.tsx
├── (public)/
│   ├── _layout.tsx
│   └── sign-in.tsx
└── (protected)/
    ├── _layout.tsx
    └── (instructor)/
        ├── _layout.tsx
        ├── (tabs)/
        │   ├── _layout.tsx
        │   ├── index.tsx                  # Hoy
        │   ├── students/index.tsx         # Alumnos
        │   ├── attendance/index.tsx       # Asistencia
        │   └── cash/index.tsx             # Caja
        ├── students/[studentId].tsx
        ├── payments/new.tsx
        ├── payments/[paymentId].tsx
        ├── receipts/[paymentId].tsx
        └── access-denied.tsx
```

### 5.2 Guards

- Guard 1: bootstrap de sesión terminado.
- Guard 2: usuario autenticado.
- Guard 3: rol móvil habilitado.
- Guard 4: permiso requerido para una pantalla o acción.
- Guard 5: prerequisito operativo, por ejemplo caja abierta para efectivo.

El root layout espera a que `SessionProvider` determine `booting`, `authenticated` o `anonymous`. Los protected routes de Expo Router controlan el historial de navegación, mientras cada botón sensible usa `PermissionGate` y el endpoint valida nuevamente.

### 5.3 Deep links

Deep links permitidos inicialmente:

- `gymbox://students/{studentId}`
- `gymbox://payments/{paymentId}`
- `gymbox://receipts/{paymentId}`

La app nunca confía en el identificador recibido. La pantalla solicita el recurso al backend y maneja 403/404 sin revelar datos.

## 6. Estado y flujo de datos

### 6.1 Categorías de estado

| Estado | Herramienta | Ejemplos |
|---|---|---|
| Estado remoto | TanStack Query | alumno, membresía, caja, asistencia, dashboard del instructor. |
| Sesión | Context + reducer + `SessionService` | usuario actual, permissions, estado de bootstrap. |
| Formulario | React Hook Form | login, apertura/cierre de caja, pago. |
| UI efímera | `useState`/`useReducer` local | filtro, modal, selección, expansión. |
| Configuración | módulo inmutable validado | API URL, ambiente, versión. |
| Persistencia sensible | SecureStore | refresh token y metadatos mínimos de sesión. |
| Persistencia no sensible | opcional y explícita | preferencias de UI; no pagos ni autorizaciones. |

No se incorpora un store global adicional en Fase 1. Zustand/Redux sólo se evalúa si aparece estado cliente compartido que no corresponda a sesión ni a datos remotos.

### 6.2 Claves de query

Cada feature define una factoría estable:

```ts
export const studentKeys = {
  all: ['students'] as const,
  search: (filters: StudentSearchFilters) => ['students', 'search', filters] as const,
  detail: (studentId: string) => ['students', 'detail', studentId] as const,
};
```

Las mutaciones invalidan únicamente los recursos afectados. Un pago exitoso invalida pago, recibo, membresía del alumno, caja actual e inicio del instructor.

### 6.3 Ciclo de vida y red

- `NetworkQueryBridge` conecta NetInfo con `onlineManager`.
- `AppStateQueryBridge` conecta `AppState` con `focusManager`.
- Las consultas de lectura pueden refrescar al volver a foreground.
- Las mutaciones financieras tienen `retry: 0`.
- Las consultas pueden usar retry acotado con backoff para errores de red/5xx; nunca para 401, 403, 409 o 422.

## 7. Integración HTTP y contratos

### 7.1 Cliente HTTP

`GymboxHttpClient` es la única puerta de salida hacia la API. Sus responsabilidades:

- construir la URL bajo `/api/v1`;
- añadir `Authorization: Bearer`;
- asignar timeout y `Accept: application/json`;
- serializar JSON y multipart;
- adjuntar `Idempotency-Key` cuando aplica;
- convertir el error estándar a `ApiError`;
- conservar `traceId`;
- coordinar un solo refresh cuando varias solicitudes reciben 401;
- reintentar la solicitud original una sola vez después del refresh;
- cancelar solicitudes cuando la pantalla deja de necesitarlas.

No decide si una membresía permite acceso ni si una caja puede abrirse; esas reglas pertenecen al backend.

### 7.2 Modelo de error

```ts
export type ApiErrorDto = Readonly<{
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  traceId: string;
}>;
```

| HTTP | Tratamiento móvil |
|---:|---|
| 400 | Marcar campos o mostrar validación general. |
| 401 | Intentar refresh una vez; si falla, cerrar sesión local. |
| 403 | Mostrar “Sin permiso” y retirar la acción de la navegación actual. |
| 404 | Estado no encontrado; permitir volver y refrescar. |
| 409 | Conflicto de estado, por ejemplo check-in duplicado o caja ya abierta. No reintentar automáticamente. |
| 422 | Regla de negocio, por ejemplo `MEMBERSHIP_EXPIRED`. Presentar mensaje y acción segura. |
| 5xx | Error temporal con `traceId`; consultas pueden reintentar, mutaciones no. |
| Red/timeout | Mostrar estado incierto; para pago conservar la misma clave idempotente. |

### 7.3 OpenAPI

El pipeline descarga o recibe el archivo OpenAPI del backend y genera tipos:

```bash
npx openapi-typescript ./contracts/gymbox-openapi.yaml \
  --output ./src/generated/api/schema.ts
```

Reglas:

- el archivo generado nunca se edita;
- un cambio incompatible del contrato falla en CI;
- cada feature adapta el DTO a su modelo interno;
- auth, payment y check-in validan también las respuestas críticas en runtime;
- fixtures de integración se derivan del contrato, no de objetos improvisados.

## 8. Seguridad y privacidad

### 8.1 Sesión

- El access token vive en memoria y tiene vida corta.
- El refresh token rotativo se almacena con SecureStore.
- El arranque recupera el refresh token, solicita refresh y después consulta `/auth/me`.
- `RefreshCoordinator` evita múltiples refresh simultáneos.
- Logout intenta revocar la sesión remota y limpia siempre tokens, query cache y navegación local.
- No se registra el token, contraseña, payload completo del alumno ni datos financieros.

### 8.2 Protección de datos

- El móvil solicita sólo campos necesarios para la operación.
- Las fotos se cargan mediante endpoint autorizado; no se construyen URLs públicas permanentes.
- El cache de imagen se limpia al logout cuando el mecanismo lo permita.
- No se persisten listas de alumnos, recibos o membresías en SQLite durante Fase 1 sin una decisión específica de seguridad.
- Capturas de pantalla y grabación se evaluarán para vistas sensibles; no se asume que bloquearlas sea suficiente.
- Los secretos de backend nunca se incluyen en variables `EXPO_PUBLIC_*`.

### 8.3 Permisos

`PermissionGate` sólo controla renderizado. Para cada acción:

1. el botón verifica permiso local;
2. la mutación se envía con JWT;
3. backend vuelve a validar;
4. un 403 actualiza la experiencia y se registra de forma segura;
5. el usuario no recibe detalles internos de autorización.

## 9. Operaciones críticas

### 9.1 Pago

<div class="figure">
<img src="assets/payment_flow.svg" alt="Flujo seguro de pago en la app móvil">
<div class="figure-caption">Figura 3. La clave idempotente se crea antes del primer envío y se conserva hasta obtener un resultado terminal.</div>
</div>

Reglas móviles:

- consultar alumno, plan y membresía antes de abrir el formulario;
- si el método es `CASH`, mostrar la caja actual y bloquear si no existe;
- generar la clave idempotente al confirmar, no en cada render;
- deshabilitar doble toque mientras la mutación está en curso;
- no aplicar retry automático;
- si hay timeout, no generar una segunda clave;
- mostrar folio y acceso al recibo tras éxito;
- refrescar el estado de membresía desde servidor;
- mostrar `traceId` en errores para soporte.

### 9.2 Check-in

La respuesta debe representar una decisión explícita:

- `ALLOWED`;
- `ALREADY_REGISTERED`;
- `BLOCKED_EXPIRED_MEMBERSHIP`;
- `BLOCKED_INACTIVE_STUDENT`.

La UI combina color, icono, encabezado y explicación. El rojo se reserva para bloqueo/riesgo; una asistencia válida usa verde; una duplicidad usa estado informativo. En Fase 1 no existe override móvil.

### 9.3 Caja mínima

- `GET /cash-register/current` determina el estado real.
- Abrir/cerrar exige permiso.
- Un pago en efectivo vuelve a validar caja en backend.
- La app no calcula el efectivo esperado como fuente de verdad.
- Evidencia, diferencia, conciliación y handover pertenecen a Fase 2.

## 10. Modo offline y resiliencia

### 10.1 Política de Fase 1

| Acción | Sin red | Justificación |
|---|---|---|
| Ver una pantalla ya abierta | Puede conservar el último estado en memoria y mostrar “datos no actualizados”. | Evita una pantalla vacía sin afirmar vigencia. |
| Buscar alumnos nuevos | No | Requiere datos actuales y autorización. |
| Abrir/cerrar caja | No | Operación financiera y auditada. |
| Registrar pago | No | Requiere folio, caja, membresía y transacción. |
| Registrar check-in | No | En Fase 1 el servidor decide duplicidad y vigencia. |
| Descargar recibo | Sólo si ya está presente en memoria/cache autorizado; no se garantiza. | Evita exponer archivos persistidos sin política. |

### 10.2 Extensión futura

El diseño deja un puerto `OfflineSnapshotStore` para una fase posterior. Sólo se habilitará con:

- minimización de campos;
- cifrado o evaluación formal del sandbox del dispositivo;
- TTL y sello de última sincronización;
- borrado en logout/revocación;
- estrategia de conflictos;
- prohibición permanente de pagos/caja offline salvo rediseño backend.

## 11. Diseño visual y accesibilidad

### 11.1 Tokens base de instructor

```ts
export const colors = {
  background: '#F8FAFC',
  text: '#0F172A',
  primary: '#1D4ED8',
  accent: '#C2410C',
  success: '#15803D',
  warning: '#A16207',
  danger: '#B91C1C',
  border: '#CBD5E1',
} as const;
```

### 11.2 Reglas

- Proporción visual aproximada 70/20/10: neutros, color principal y acento.
- Rojo sólo para error, fraude, vencimiento bloqueante o riesgo.
- Todo estado usa color + icono + texto.
- Targets táctiles de al menos 48 dp para operación en movimiento.
- Focus visible y labels accesibles.
- Contraste mínimo conforme a WCAG 2.2.
- Tipografía legible, números de dinero alineados y estados visibles a una mano.
- Errores financieros usan texto explícito, no sólo banners genéricos.

## 12. Configuración, ambientes y builds

### 12.1 Ambientes

| Ambiente | API | Distribución | Datos |
|---|---|---|---|
| Local | máquina o túnel de desarrollo | development build local | seed/fake. |
| Dev | backend compartido | development channel | datos generados. |
| Staging | configuración similar a producción | preview/internal | prueba realista y anonimizada. |
| Producción | HTTPS público | stores | operación real. |

`EXPO_PUBLIC_API_URL` puede contener la URL pública, nunca secretos. `app.config.ts` valida que la URL use HTTPS fuera de local y expone ambiente, versión y commit para diagnóstico.

### 12.2 EAS

Perfiles mínimos:

- `development`: development client y distribución interna;
- `preview`: build instalable para QA/piloto, conectado a staging;
- `production`: firma y configuración de tiendas.

La política de runtime debe impedir que una actualización OTA se aplique a un binario nativo incompatible. Los cambios de dependencias nativas, plugins o configuración requieren nuevo build.

### 12.3 CI

```text
checkout
→ instalación reproducible
→ expo-doctor
→ lint
→ typecheck
→ unit/component tests
→ generar/verificar OpenAPI
→ comprobar límites de imports
→ build preview en ramas de release
→ smoke E2E
```

## 13. Observabilidad y soporte

### 13.1 Datos de diagnóstico

- versión de app, build y ambiente;
- plataforma y versión de SO;
- endpoint lógico, duración y resultado;
- `traceId` retornado por backend;
- usuario en forma de identificador pseudonimizado cuando corresponda;
- estado de red;
- nunca tokens, contraseña, datos médicos, recibo completo o payload financiero.

### 13.2 Abstracciones

```ts
export interface Telemetry {
  captureException(error: unknown, context?: Record<string, unknown>): void;
  track(event: string, properties?: Record<string, string | number | boolean>): void;
}

export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}
```

La implementación puede comenzar en consola sanitizada y migrar a Sentry u otro proveedor sin contaminar features.

## 14. Pruebas y calidad

### 14.1 Pirámide

| Nivel | Qué cubre | Ejemplos |
|---|---|---|
| Unitarias | mappers, schemas, coordinación de refresh, claves de query e idempotencia | timeout de pago conserva clave; fecha de membresía se formatea correctamente. |
| Componentes | interacción y accesibilidad | login, búsqueda, badge vencido, formulario de pago. |
| Integración | feature + cliente HTTP falso/servidor simulado | 401 -> refresh -> replay; 422 -> alerta de membresía vencida. |
| Contrato | compatibilidad OpenAPI | endpoint, método, DTO y error estándar. |
| E2E | recorridos críticos en build real | login, caja, pago, recibo, check-in y bloqueo de vencido. |

### 14.2 Matriz mínima de E2E

1. Login válido y restauración de sesión.
2. Login inválido sin filtrar información.
3. Instructor consulta alumnos y membresía.
4. Efectivo sin caja abierta queda bloqueado.
5. Pago exitoso genera un solo folio al repetir la solicitud con la misma clave.
6. Pago por timeout se reintenta con la misma clave.
7. Check-in válido aparece en asistencia de hoy.
8. Check-in duplicado no crea otro registro.
9. Membresía vencida produce bloqueo explícito.
10. Usuario sin permiso recibe 403 y no conserva la acción visible.
11. Logout elimina sesión y datos en memoria.
12. La app se recupera de foreground/background sin duplicar mutaciones.

## 15. Decisiones de arquitectura registradas

### ADR-MOB-001 - Expo SDK 57 con development builds

**Decisión:** usar Expo SDK 57, CNG y `expo-dev-client`.

**Razón:** entorno productivo, bibliotecas nativas controladas, builds internos y compatibilidad de versiones administrada por Expo.

**Consecuencia:** un cambio nativo exige reconstrucción; no se usa Expo Go como criterio de release.

### ADR-MOB-002 - Expo Router y `src/app`

**Decisión:** rutas basadas en archivos, protected routes y layouts por sesión/rol.

**Razón:** integración oficial con el template de Expo y composición clara.

**Consecuencia:** los archivos de ruta permanecen delgados y delegan a features.

### ADR-MOB-003 - Feature-first

**Decisión:** módulos verticales en `src/features` con API pública.

**Razón:** refleja los dominios del backend, permite equipos y evita carpetas globales acopladas.

**Consecuencia:** se aplican reglas de imports y mappers entre DTO y modelo.

### ADR-MOB-004 - TanStack Query para estado remoto

**Decisión:** consultas, caché e invalidación viven en TanStack Query.

**Razón:** la mayor parte del estado móvil es servidor; evita duplicarlo en un store global.

**Consecuencia:** no se añade Redux/Zustand sin una necesidad concreta.

### ADR-MOB-005 - Tokens y refresh

**Decisión:** access token en memoria, refresh token en SecureStore y refresh single-flight.

**Razón:** minimizar exposición y soportar rotación del backend.

**Consecuencia:** el bootstrap necesita estado explícito y limpieza total en logout.

### ADR-MOB-006 - Sin mutaciones financieras offline

**Decisión:** pagos, caja y check-in de Fase 1 requieren red.

**Razón:** folio, membresía, caja, duplicidad y auditoría deben resolverse de forma central.

**Consecuencia:** la UX debe explicar el bloqueo y conservar sólo datos seguros del formulario.

### ADR-MOB-007 - OpenAPI como frontera

**Decisión:** generar tipos de transporte y encapsularlos en adapters de feature.

**Razón:** reducir divergencia móvil-backend.

**Consecuencia:** cambios incompatibles fallan en CI y requieren coordinación.

## 16. Riesgos arquitectónicos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Contrato backend incompleto o cambiante | Retrabajo y errores de integración | OpenAPI versionado, mocks de contrato y freeze antes de demo. |
| Refresh concurrente | múltiples sesiones rotadas y logout inesperado | `RefreshCoordinator` single-flight y replay único. |
| Pago duplicado por doble toque/timeout | riesgo financiero | botón bloqueado, `Idempotency-Key`, retry automático cero y prueba E2E. |
| Datos vencidos visibles | check-in o cobro incorrecto | servidor como autoridad, timestamps y refresh al foreground. |
| Foto protegida no cacheable correctamente | lentitud o exposición | adapter autorizado, placeholders, política de cache y limpieza. |
| Permisos divergentes | funciones visibles pero rechazadas | permissions desde `/auth/me`, 403 normalizado y telemetría. |
| PII en logs | incidente de privacidad | logger sanitizado, revisión de payloads y pruebas. |
| Dependencias Expo incompatibles | builds rotos | `expo install`, `expo-doctor`, lockfile y build preview frecuente. |

## 17. Criterios de salida de arquitectura

La arquitectura se considera aplicada cuando:

- el proyecto compila en SDK 57 con TypeScript estricto;
- existen development builds Android/iOS;
- los imports respetan límites;
- `src/app` no contiene llamadas HTTP ni reglas de negocio;
- auth rota refresh sin carreras;
- las funciones sensibles dependen de permisos y 403;
- pago utiliza idempotencia y no tiene retry automático;
- check-in interpreta decisiones de negocio;
- errores muestran `traceId`;
- logout elimina tokens y caches;
- el recorrido E2E de Fase 1 pasa en staging.

## 18. Fuentes técnicas oficiales

- Expo SDK 57: <https://expo.dev/changelog/sdk-57>
- React Native 0.86: <https://reactnative.dev/blog/2026/06/23/react-native-0.86>
- Create Expo App: <https://docs.expo.dev/more/create-expo/>
- Expo Router SDK 57: <https://docs.expo.dev/versions/v57.0.0/sdk/router/>
- Directorio `src/app`: <https://docs.expo.dev/router/reference/src-directory/>
- Protected routes: <https://docs.expo.dev/router/advanced/protected/>
- Development builds: <https://docs.expo.dev/develop/development-builds/introduction/>
- Expo SQLite: <https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/>
- TanStack Query para React Native: <https://tanstack.com/query/latest/docs/framework/react/react-native>
- Spring Boot system requirements: <https://docs.spring.io/spring-boot/system-requirements.html>

<div class="page-break"></div>

# Parte II - Blueprint

## Resumen ejecutivo

Este blueprint traduce la arquitectura móvil de GymBox en una estructura de proyecto implementable. Define el árbol de carpetas, nombres de archivos, clases e interfaces, APIs públicas de cada feature, rutas, contratos backend, flujos críticos y orden de construcción.

La raíz de código es `src/`. Expo Router vive en `src/app`; los cortes verticales en `src/features`; la infraestructura técnica en `src/core`; el design system en `src/shared`; los tipos OpenAPI en `src/generated/api`.

<div class="callout decision">
<span class="callout-title">Regla canónica</span>
Los archivos bajo `src/app` son adaptadores de navegación. Una ruta importa una pantalla desde la API pública de una feature y no implementa lógica de negocio, fetch, validación de dominio ni acceso a storage.
</div>

## 1. Identidad técnica

| Elemento | Valor canónico |
|---|---|
| Repositorio | `gymbox-mobile` |
| Framework | Expo SDK 57 |
| React Native | 0.86 |
| React | 19.2 |
| Lenguaje | TypeScript estricto |
| Android package | `mx.com.gymbox.mobile` |
| iOS bundle identifier | `mx.com.gymbox.mobile` |
| API | `/api/v1` |
| Backend de referencia | `mx.com.gymbox.gymbox_backend` - Java 21 |
| Navegación | Expo Router en `src/app` |
| Arquitectura | Feature-first + capas internas |
| Estado remoto | TanStack Query |
| Contrato | OpenAPI generado |

## 2. Árbol completo propuesto

```text
gymbox-mobile/
├── .eas/
├── .github/
│   └── workflows/
│       ├── quality.yml
│       ├── preview-build.yml
│       └── release.yml
├── assets/
│   ├── adaptive-icon.png
│   ├── icon.png
│   ├── splash-icon.png
│   └── fonts/
├── contracts/
│   ├── gymbox-openapi.yaml
│   └── fixtures/
│       ├── auth/
│       ├── students/
│       ├── payments/
│       └── attendance/
├── e2e/
│   └── maestro/
│       ├── 01-login.yaml
│       ├── 02-open-cash.yaml
│       ├── 03-register-payment.yaml
│       ├── 04-check-in.yaml
│       └── 05-expired-membership.yaml
├── scripts/
│   ├── generate-api.mjs
│   ├── verify-contract.mjs
│   └── verify-boundaries.mjs
├── src/
│   ├── app/
│   │   ├── _layout.tsx
│   │   ├── +not-found.tsx
│   │   ├── (public)/
│   │   │   ├── _layout.tsx
│   │   │   └── sign-in.tsx
│   │   └── (protected)/
│   │       ├── _layout.tsx
│   │       └── (instructor)/
│   │           ├── _layout.tsx
│   │           ├── (tabs)/
│   │           │   ├── _layout.tsx
│   │           │   ├── index.tsx
│   │           │   ├── students/index.tsx
│   │           │   ├── attendance/index.tsx
│   │           │   └── cash/index.tsx
│   │           ├── students/[studentId].tsx
│   │           ├── payments/new.tsx
│   │           ├── payments/[paymentId].tsx
│   │           ├── receipts/[paymentId].tsx
│   │           └── access-denied.tsx
│   ├── core/
│   │   ├── app/
│   │   │   ├── AppProviders.tsx
│   │   │   ├── AppBootstrap.tsx
│   │   │   └── SplashScreenController.tsx
│   │   ├── config/
│   │   │   ├── Environment.ts
│   │   │   ├── environment.schema.ts
│   │   │   └── version.ts
│   │   ├── http/
│   │   │   ├── HttpClient.ts
│   │   │   ├── GymboxHttpClient.ts
│   │   │   ├── HttpRequest.ts
│   │   │   ├── HttpResponse.ts
│   │   │   ├── ApiError.ts
│   │   │   ├── ApiErrorMapper.ts
│   │   │   ├── RefreshCoordinator.ts
│   │   │   └── request-timeout.ts
│   │   ├── session/
│   │   │   ├── SessionProvider.tsx
│   │   │   ├── SessionContext.ts
│   │   │   ├── SessionReducer.ts
│   │   │   ├── SessionService.ts
│   │   │   ├── SessionState.ts
│   │   │   ├── TokenVault.ts
│   │   │   └── ExpoSecureTokenVault.ts
│   │   ├── permissions/
│   │   │   ├── Permission.ts
│   │   │   ├── can.ts
│   │   │   └── PermissionGate.tsx
│   │   ├── query/
│   │   │   ├── QueryClientFactory.ts
│   │   │   ├── NetworkQueryBridge.tsx
│   │   │   └── AppStateQueryBridge.tsx
│   │   ├── storage/
│   │   │   ├── KeyValueStore.ts
│   │   │   └── ExpoKeyValueStore.ts
│   │   ├── observability/
│   │   │   ├── Logger.ts
│   │   │   ├── SanitizingLogger.ts
│   │   │   ├── Telemetry.ts
│   │   │   └── TraceId.ts
│   │   ├── idempotency/
│   │   │   ├── IdempotencyKey.ts
│   │   │   ├── IdempotencyKeyFactory.ts
│   │   │   └── ExpoIdempotencyKeyFactory.ts
│   │   ├── time/
│   │   │   ├── Clock.ts
│   │   │   └── SystemClock.ts
│   │   └── index.ts
│   ├── features/
│   │   ├── auth/
│   │   ├── instructor-today/
│   │   ├── students/
│   │   ├── memberships/
│   │   ├── media/
│   │   ├── cash/
│   │   ├── payments/
│   │   └── attendance/
│   ├── generated/
│   │   └── api/
│   │       ├── schema.ts
│   │       └── client.ts
│   ├── shared/
│   │   ├── theme/
│   │   │   ├── colors.ts
│   │   │   ├── spacing.ts
│   │   │   ├── typography.ts
│   │   │   ├── radius.ts
│   │   │   └── theme.ts
│   │   ├── ui/
│   │   │   ├── AppButton.tsx
│   │   │   ├── Screen.tsx
│   │   │   ├── TextField.tsx
│   │   │   ├── PasswordField.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   ├── AlertBanner.tsx
│   │   │   ├── OfflineBanner.tsx
│   │   │   ├── LoadingState.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── ErrorState.tsx
│   │   │   ├── EntityListItem.tsx
│   │   │   ├── MoneyText.tsx
│   │   │   └── ConfirmActionSheet.tsx
│   │   ├── format/
│   │   │   ├── format-money.ts
│   │   │   ├── format-date.ts
│   │   │   └── format-age.ts
│   │   ├── validation/
│   │   │   └── common-schemas.ts
│   │   └── index.ts
│   └── test/
│       ├── render-with-providers.tsx
│       ├── create-test-query-client.ts
│       ├── FakeHttpClient.ts
│       ├── FakeTokenVault.ts
│       └── fixtures.ts
├── app.config.ts
├── eas.json
├── eslint.config.js
├── jest.config.js
├── metro.config.js
├── package.json
├── tsconfig.json
└── README.md
```

## 3. Regla interna de cada feature

Estructura canónica:

```text
features/<feature>/
├── api/
│   ├── <Feature>Gateway.ts
│   ├── <Feature>RemoteGateway.ts
│   ├── <feature>-schemas.ts
│   └── <feature>-api-mapper.ts
├── application/
│   ├── <feature>-keys.ts
│   ├── use-<query>.ts
│   ├── use-<mutation>.ts
│   └── <UseCase>.ts                 # sólo si requiere orquestación no trivial
├── model/
│   ├── <FeatureModel>.ts
│   ├── <FeatureCommand>.ts
│   └── <feature>-presentation.ts
├── ui/
│   ├── <Feature>Screen.tsx
│   └── components/
├── __tests__/
└── index.ts
```

`index.ts` exporta únicamente lo que una ruta u otra feature puede usar. No exporta DTO, schemas de transporte ni detalles de TanStack Query innecesarios.

## 4. Catálogo de core técnico

### 4.1 Aplicación y bootstrap

| Archivo | Tipo | Responsabilidad |
|---|---|---|
| `AppProviders.tsx` | componente | Compone QueryClient, SessionProvider, safe area, theme y bridges. |
| `AppBootstrap.tsx` | componente | Coordina carga de fuentes/configuración y bootstrap de sesión. |
| `SplashScreenController.tsx` | componente | Mantiene splash hasta estado inicial determinista. |

### 4.2 Configuración

| Archivo | Tipo | Responsabilidad |
|---|---|---|
| `Environment.ts` | value object | Expone `apiBaseUrl`, `environment`, `appVersion`, `buildNumber`. |
| `environment.schema.ts` | schema Zod | Falla temprano si la configuración es inválida. |
| `version.ts` | funciones | Forma el identificador visible para soporte. |

La app se niega a arrancar en producción si la API no usa HTTPS.

### 4.3 HTTP

#### `HttpClient`

```ts
export interface HttpClient {
  request<TResponse>(request: HttpRequest): Promise<HttpResponse<TResponse>>;
}
```

#### `GymboxHttpClient`

Clase concreta que usa `fetch` y recibe por constructor:

```ts
new GymboxHttpClient({
  baseUrl,
  tokenVault,
  refreshCoordinator,
  logger,
  clock,
});
```

#### `ApiError`

```ts
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: Record<string, unknown> | undefined,
    readonly traceId: string | undefined,
  ) {
    super(message);
  }
}
```

#### `RefreshCoordinator`

Mantiene una única promesa activa de refresh. Todas las solicitudes que reciben 401 esperan el mismo resultado. Después de un refresh exitoso, cada solicitud se reproduce una vez. Un segundo 401 termina la sesión.

### 4.4 Sesión

#### `TokenVault`

```ts
export interface TokenVault {
  getRefreshToken(): Promise<string | null>;
  setRefreshToken(token: string): Promise<void>;
  clear(): Promise<void>;
}
```

#### `SessionService`

Métodos:

- `bootstrap(): Promise<SessionSnapshot>`
- `signIn(credentials): Promise<SessionSnapshot>`
- `refresh(): Promise<SessionSnapshot>`
- `signOut(): Promise<void>`
- `getAccessToken(): string | null`

#### `SessionState`

```ts
export type SessionState =
  | { status: 'booting' }
  | { status: 'anonymous' }
  | { status: 'authenticated'; user: CurrentUser; permissions: ReadonlySet<string> };
```

### 4.5 Permisos

```ts
export type Permission = string & { readonly __brand: 'Permission' };

export function can(
  permissions: ReadonlySet<string>,
  required: string | readonly string[],
): boolean;
```

El catálogo exacto de códigos se genera o configura desde el contrato/seed del backend. No se duplican nombres de permiso en múltiples pantallas.

### 4.6 Idempotencia

`ExpoIdempotencyKeyFactory` genera una clave UUID y la feature de pagos la conserva en `PaymentDraft` hasta recibir una respuesta terminal.

```ts
export type IdempotencyKey = string & { readonly __brand: 'IdempotencyKey' };

export interface IdempotencyKeyFactory {
  create(): IdempotencyKey;
}
```

## 5. Catálogo de features

### 5.1 `auth`

```text
features/auth/
├── api/
│   ├── AuthGateway.ts
│   ├── AuthRemoteGateway.ts
│   ├── auth-schemas.ts
│   └── auth-api-mapper.ts
├── application/
│   ├── SignInService.ts
│   └── use-sign-in.ts
├── model/
│   ├── Credentials.ts
│   ├── CurrentUser.ts
│   └── AuthSession.ts
├── ui/
│   ├── SignInScreen.tsx
│   └── components/SignInForm.tsx
└── index.ts
```

| Elemento | Responsabilidad |
|---|---|
| `AuthGateway` | Login, refresh, logout y `/auth/me`. |
| `AuthRemoteGateway` | Adapta OpenAPI y `HttpClient`. |
| `SignInService` | Valida credenciales, inicia sesión y actualiza SessionProvider. |
| `SignInScreen` | Composición accesible; no conoce tokens. |

### 5.2 `instructor-today`

```text
features/instructor-today/
├── api/InstructorTodayGateway.ts
├── api/InstructorTodayRemoteGateway.ts
├── application/instructor-today-keys.ts
├── application/use-instructor-today-query.ts
├── model/InstructorToday.ts
├── model/InstructorAlert.ts
├── ui/InstructorTodayScreen.tsx
├── ui/components/TodaySummaryCard.tsx
├── ui/components/CriticalAlertsList.tsx
├── ui/components/QuickActions.tsx
└── index.ts
```

Consume `GET /api/v1/instructor/today`. Si el backend aún no expone todos los agregados, la feature puede componer consultas públicas, pero el objetivo es un endpoint optimizado para evitar cascadas.

### 5.3 `students`

```text
features/students/
├── api/StudentsGateway.ts
├── api/StudentsRemoteGateway.ts
├── api/student-api-mapper.ts
├── application/student-keys.ts
├── application/use-student-search-query.ts
├── application/use-student-detail-query.ts
├── model/StudentSummary.ts
├── model/StudentDetail.ts
├── model/StudentSearchFilters.ts
├── ui/StudentSearchScreen.tsx
├── ui/StudentDetailScreen.tsx
├── ui/components/StudentListItem.tsx
├── ui/components/StudentIdentityHeader.tsx
└── index.ts
```

Modelos mínimos:

```ts
export type StudentSummary = Readonly<{
  id: string;
  fullName: string;
  photoFileId?: string;
  age: number;
  level?: string;
  status: 'ACTIVE' | 'INACTIVE';
  membershipStatus?: MembershipStatus;
}>;
```

La búsqueda se debounces, cancela la solicitud previa y pagina resultados. No descarga la lista completa.

### 5.4 `memberships`

```text
features/memberships/
├── api/MembershipsGateway.ts
├── api/MembershipsRemoteGateway.ts
├── application/membership-keys.ts
├── application/use-student-membership-query.ts
├── model/MembershipSnapshot.ts
├── model/MembershipStatus.ts
├── model/membership-presentation.ts
├── ui/MembershipCard.tsx
├── ui/MembershipStatusBadge.tsx
└── index.ts
```

```ts
export type MembershipStatus =
  | 'ACTIVE'
  | 'EXPIRING_SOON'
  | 'EXPIRED'
  | 'INACTIVE'
  | 'NO_MEMBERSHIP';
```

`membership-presentation.ts` decide texto, icono y tono visual; no autoriza check-in.

### 5.5 `media`

```text
features/media/
├── api/MediaGateway.ts
├── api/MediaRemoteGateway.ts
├── application/use-authorized-media.ts
├── model/AuthorizedMedia.ts
├── ui/AuthorizedImage.tsx
└── index.ts
```

`AuthorizedImage` maneja placeholder, error, carga autenticada y limpieza. La feature no devuelve una URL pública permanente.

### 5.6 `cash`

```text
features/cash/
├── api/CashGateway.ts
├── api/CashRemoteGateway.ts
├── application/cash-keys.ts
├── application/use-current-cash-query.ts
├── application/use-open-cash-mutation.ts
├── application/use-close-cash-mutation.ts
├── model/CashRegister.ts
├── model/OpenCashRegisterCommand.ts
├── model/CloseCashRegisterCommand.ts
├── ui/CashRegisterScreen.tsx
├── ui/OpenCashRegisterScreen.tsx
├── ui/CloseCashRegisterScreen.tsx
└── index.ts
```

```ts
export type CashRegister = Readonly<{
  id: string;
  status: 'OPEN' | 'CLOSED';
  openedAt: string;
  openedBy: string;
  initialCash: number;
  expectedCash?: number;
}>;
```

La cifra de efectivo esperado siempre proviene del backend.

### 5.7 `payments`

```text
features/payments/
├── api/PaymentsGateway.ts
├── api/PaymentsRemoteGateway.ts
├── api/payment-api-mapper.ts
├── application/payment-keys.ts
├── application/RegisterPaymentService.ts
├── application/use-register-payment-mutation.ts
├── application/use-payment-query.ts
├── application/use-receipt-query.ts
├── model/PaymentDraft.ts
├── model/RegisterPaymentCommand.ts
├── model/Payment.ts
├── model/PaymentReceipt.ts
├── model/PaymentMethod.ts
├── model/payment-form.schema.ts
├── ui/RegisterPaymentScreen.tsx
├── ui/PaymentResultScreen.tsx
├── ui/ReceiptScreen.tsx
├── ui/components/PaymentForm.tsx
├── ui/components/PaymentMethodSelector.tsx
└── index.ts
```

#### `PaymentDraft`

```ts
export type PaymentDraft = Readonly<{
  studentId: string;
  membershipId?: string;
  planId?: string;
  amount: number;
  method: 'CASH' | 'TRANSFER' | 'MANUAL_CARD';
  reference?: string;
  idempotencyKey: IdempotencyKey;
}>;
```

#### `RegisterPaymentService`

1. comprueba conectividad;
2. valida formulario;
3. si es efectivo, obtiene caja actual;
4. conserva la clave idempotente;
5. llama al gateway con retry automático desactivado;
6. mapea éxito/error;
7. invalida queries afectadas;
8. navega a resultado sólo con una respuesta terminal.

### 5.8 `attendance`

```text
features/attendance/
├── api/AttendanceGateway.ts
├── api/AttendanceRemoteGateway.ts
├── application/attendance-keys.ts
├── application/use-attendance-today-query.ts
├── application/use-check-in-mutation.ts
├── model/CheckInCommand.ts
├── model/CheckInResult.ts
├── model/CheckInDecision.ts
├── model/check-in-presentation.ts
├── ui/AttendanceTodayScreen.tsx
├── ui/CheckInResultSheet.tsx
├── ui/components/AttendanceListItem.tsx
└── index.ts
```

```ts
export type CheckInDecision =
  | 'ALLOWED'
  | 'ALREADY_REGISTERED'
  | 'BLOCKED_EXPIRED_MEMBERSHIP'
  | 'BLOCKED_INACTIVE_STUDENT';
```

`check-in-presentation.ts` convierte la decisión en título, explicación, icono y tono, pero no cambia el resultado.

## 6. APIs públicas de features

Ejemplo de `features/payments/index.ts`:

```ts
export { RegisterPaymentScreen } from './ui/RegisterPaymentScreen';
export { PaymentResultScreen } from './ui/PaymentResultScreen';
export { ReceiptScreen } from './ui/ReceiptScreen';
export { usePaymentQuery } from './application/use-payment-query';
export type { Payment, PaymentReceipt } from './model/Payment';
```

No exportar:

- `PaymentsRemoteGateway`;
- DTO OpenAPI;
- schemas de transporte;
- `PaymentPersistenceMapper` inexistente en el cliente;
- detalles de headers.

## 7. Mapa de rutas a pantallas

| Ruta | Pantalla importada | Permiso/prerequisito |
|---|---|---|
| `/(public)/sign-in` | `SignInScreen` | Sesión anónima. |
| `/(protected)/(instructor)/(tabs)` | `InstructorTodayScreen` | Autenticado y rol móvil habilitado. |
| `.../students` | `StudentSearchScreen` | Consulta de alumnos. |
| `.../students/[studentId]` | `StudentDetailScreen` | Consulta del alumno. |
| `.../attendance` | `AttendanceTodayScreen` | Consulta/registro de asistencia. |
| `.../cash` | `CashRegisterScreen` | Consulta de caja. |
| `.../payments/new?studentId=` | `RegisterPaymentScreen` | Registro de pago. |
| `.../payments/[paymentId]` | `PaymentResultScreen` | Consulta de pago. |
| `.../receipts/[paymentId]` | `ReceiptScreen` | Consulta de recibo. |
| `.../access-denied` | pantalla de sistema | Sin permiso o rol no habilitado. |

## 8. Composición de providers

```tsx
// src/core/app/AppProviders.tsx
export function AppProviders({ children }: PropsWithChildren) {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <SessionProvider sessionService={sessionService}>
          <NetworkQueryBridge />
          <AppStateQueryBridge />
          {children}
        </SessionProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
```

```tsx
// src/app/_layout.tsx
export default function RootLayout() {
  return (
    <AppProviders>
      <AppBootstrap>
        <RootNavigator />
      </AppBootstrap>
    </AppProviders>
  );
}
```

```tsx
function RootNavigator() {
  const session = useSession();

  if (session.status === 'booting') return null;

  return (
    <Stack>
      <Stack.Protected guard={session.status === 'anonymous'}>
        <Stack.Screen name="(public)" />
      </Stack.Protected>
      <Stack.Protected guard={session.status === 'authenticated'}>
        <Stack.Screen name="(protected)" />
      </Stack.Protected>
    </Stack>
  );
}
```

## 9. Mapa de endpoints backend

| Feature | Endpoint | Uso móvil | Notas |
|---|---|---|---|
| auth | `POST /auth/login` | iniciar sesión | Devuelve access, refresh y usuario mínimo. |
| auth | `POST /auth/refresh` | rotar sesión | El cliente almacena el nuevo refresh. |
| auth | `POST /auth/logout` | revocar sesión | Limpieza local aunque falle red. |
| auth | `GET /auth/me` | usuario/permissions | Fuente para guards. |
| students | `GET /students` | buscar/paginar | Filtros y mínima PII. |
| students | `GET /students/{id}` | ficha operativa | Respetar 403/404. |
| memberships | `GET /plans` | planes disponibles | Usado en pago. |
| memberships | `GET /memberships/student/{studentId}` | vigencia actual | Refrescar tras pago. |
| cash | `POST /cash-register/open` | abrir caja | Online y permiso. |
| cash | `GET /cash-register/current` | estado de caja | Prerequisito de efectivo. |
| cash | `POST /cash-register/close` | cierre básico | Sin conciliación Fase 2. |
| payments | `POST /payments` | registrar pago | Header `Idempotency-Key`. |
| payments | `GET /payments/{id}` | resultado/detalle | No existe DELETE. |
| payments | `GET /payments/{id}/receipt` | recibo | Archivo/metadata autorizada. |
| attendance | `POST /attendance/check-in` | check-in | Decisión explícita; online. |
| attendance | `GET /attendance/today` | lista del día | Refrescar tras check-in. |
| attendance | `GET /attendance/student/{studentId}` | historial operativo | Paginado. |
| instructor | `GET /instructor/today` | inicio | Agregado optimizado. |
| media | `GET /media/{fileId}` | foto/recibo | Autorizado por JWT. |

Todos los paths anteriores se prefijan con `/api/v1`.

## 10. Contratos y mappers

### 10.1 Principio

```text
OpenAPI DTO -> runtime guard crítico -> mapper -> modelo interno readonly -> UI
```

Ejemplo:

```ts
export function mapStudentSummary(dto: StudentSummaryDto): StudentSummary {
  return {
    id: dto.id,
    fullName: dto.fullName.trim(),
    photoFileId: dto.photoFileId ?? undefined,
    age: dto.age,
    level: dto.level ?? undefined,
    status: dto.status,
    membershipStatus: mapMembershipStatus(dto.membershipStatus),
  };
}
```

Un cambio de nombre del backend se absorbe en el mapper; no obliga a modificar veinte componentes.

### 10.2 Errores de dominio

| Código | Tratamiento |
|---|---|
| `VALIDATION_ERROR` | campos y resumen accesible. |
| `UNAUTHENTICATED` | refresh o logout. |
| `FORBIDDEN` | pantalla/acción sin permiso. |
| `STUDENT_NOT_FOUND` | volver a búsqueda y refrescar. |
| `ALREADY_CHECKED_IN` | resultado informativo; no duplicar. |
| `CASH_REGISTER_ALREADY_OPEN` | refrescar caja actual. |
| `MINOR_REQUIRES_GUARDIAN` | relevante para web; móvil sólo muestra si recibe la regla. |
| `MEMBERSHIP_EXPIRED` | bloqueo explícito y acceso a pago si existe permiso. |

## 11. Flujos críticos

### 11.1 Login, refresh y logout

```text
SignInScreen
→ useSignIn
→ SignInService
→ AuthGateway.login
→ TokenVault.setRefreshToken
→ SessionProvider = authenticated
→ GET /auth/me
→ rutas protegidas
```

Ante 401 concurrente:

```text
N solicitudes reciben 401
→ una inicia refresh
→ las demás esperan
→ refresh rota token
→ se guarda nuevo refresh
→ cada solicitud se reproduce una vez
→ si falla, logout local
```

### 11.2 Inicio del instructor

1. Cargar `/instructor/today`.
2. Mostrar fecha local, usuario, caja, conteos y alertas.
3. No inferir membresías desde cache antiguo.
4. Accesos rápidos visibles según permisos.
5. Refrescar al pull-to-refresh y al volver a foreground si los datos están stale.

### 11.3 Pago

1. Abrir desde el alumno para evitar selección ambigua.
2. Cargar membresía y planes.
3. Construir `PaymentDraft`.
4. Para efectivo, comprobar caja actual.
5. Crear `Idempotency-Key` al confirmar.
6. Enviar una sola mutación.
7. En éxito, mostrar folio/recibo e invalidar caches.
8. En timeout, mantener el mismo borrador y clave.
9. En 409/422, explicar la regla y no reintentar a ciegas.

### 11.4 Check-in

1. Seleccionar alumno desde búsqueda o lista.
2. Mostrar identidad y estado visible.
3. Confirmar check-in.
4. Backend valida estado, duplicidad y membresía.
5. UI presenta la decisión exacta.
6. Sólo `ALLOWED` actualiza el conteo como nueva asistencia.
7. Invalida asistencia de hoy e instructor today.

## 12. Formularios

### 12.1 Login

- usuario/email según contrato;
- contraseña;
- submit único;
- teclado y autofill configurados;
- error 401 genérico;
- accesibilidad para lector de pantalla.

### 12.2 Apertura de caja

- monto inicial;
- confirmación explícita;
- permiso y estado actual;
- no aceptar montos negativos;
- respuesta muestra ID y hora del servidor.

### 12.3 Pago

- alumno fijo o claramente seleccionado;
- plan/concepto;
- monto;
- método;
- referencia obligatoria para transferencia/tarjeta si backend la exige;
- resumen previo a confirmar;
- bloqueo contra doble toque;
- borrador se limpia sólo en éxito/cancelación explícita.

## 13. Query y mutation policies

| Operación | `staleTime` inicial | Retry | Persistencia |
|---|---:|---:|---|
| `/auth/me` | sesión actual | 0 tras refresh | no. |
| búsqueda de alumnos | 30 s | 1 para red/5xx | no. |
| detalle de alumno | 60 s | 1 | no. |
| membresía | 15 s | 1 | no. |
| caja actual | 5 s | 1 | no. |
| instructor today | 15 s | 1 | no. |
| asistencia hoy | 10 s | 1 | no. |
| registrar pago | n/a | 0 | borrador en memoria. |
| abrir/cerrar caja | n/a | 0 | no. |
| check-in | n/a | 0 | no. |

Estos valores son punto de partida y se calibran con telemetría. Los códigos 4xx de negocio no reintentan.

## 14. Design system mínimo

### 14.1 Componentes obligatorios

| Componente | Requisitos |
|---|---|
| `AppButton` | variantes primary/secondary/danger; loading; disabled; target 48 dp. |
| `TextField` | label persistente, hint, error accesible, teclado apropiado. |
| `StatusBadge` | icono + texto + color; nunca color solo. |
| `AlertBanner` | info/warning/danger/success; acción opcional. |
| `OfflineBanner` | persistente mientras no haya red. |
| `ErrorState` | mensaje accionable, retry permitido y `traceId`. |
| `EntityListItem` | foto, título, metadatos, estado y target completo. |
| `ConfirmActionSheet` | resumen y confirmación para dinero/caja. |

### 14.2 Tokens

```ts
export const spacing = { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;
```

Los componentes no usan colores hex ad hoc fuera del tema.

## 15. Configuración de app

```ts
// app.config.ts
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'GymBox',
  slug: 'gymbox-mobile',
  scheme: 'gymbox',
  version: process.env.APP_VERSION ?? '0.1.0',
  orientation: 'portrait',
  android: { package: 'mx.com.gymbox.mobile' },
  ios: { bundleIdentifier: 'mx.com.gymbox.mobile' },
  plugins: ['expo-router', 'expo-secure-store'],
  extra: {
    environment: process.env.APP_ENV,
    apiBaseUrl: process.env.EXPO_PUBLIC_API_URL,
  },
});
```

No incluir contraseñas, API secrets ni credenciales de proveedor en `extra`.

## 16. EAS profiles

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "channel": "development"
    },
    "preview": {
      "distribution": "internal",
      "channel": "staging"
    },
    "production": {
      "autoIncrement": true,
      "channel": "production"
    }
  }
}
```

Los valores finales de credenciales y ambiente se administran fuera del repositorio.

## 17. ESLint y límites

Reglas mínimas:

- prohibir imports de `features/*/api/*` desde rutas;
- prohibir imports entre internals de features;
- prohibir `fetch` fuera de `core/http` y adapters remotos;
- prohibir `console.log` en producción;
- prohibir import directo de `src/generated/api` desde UI;
- ordenar imports y detectar dependencias circulares;
- `no-floating-promises` y reglas TypeScript estrictas.

Ejemplo conceptual:

```js
{
  files: ['src/app/**/*.{ts,tsx}', 'src/features/**/ui/**/*.{ts,tsx}'],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        '@/features/*/api/*',
        '@/generated/api/*'
      ]
    }]
  }
}
```

## 18. Estrategia de pruebas por paquete

### Core

- `RefreshCoordinatorTest`: una llamada de refresh para N solicitudes.
- `SessionServiceTest`: bootstrap, rotación, logout y limpieza.
- `ApiErrorMapperTest`: todos los estados HTTP y `traceId`.
- `ExpoIdempotencyKeyFactoryTest`: formato y unicidad.

### Features

- `auth`: error de credenciales, loading y navegación.
- `students`: debounce, paginación y cancelación.
- `memberships`: estados y fechas.
- `cash`: caja abierta/cerrada, 409 y permisos.
- `payments`: doble toque, timeout, misma clave y éxito.
- `attendance`: cuatro decisiones y no duplicidad.

### E2E

```text
Administrador/recepción inicia sesión
→ abre caja
→ busca alumno
→ registra pago CASH
→ ve folio y recibo
→ verifica membresía activa
→ registra check-in
→ verifica asistencia de hoy
```

## 19. Definition of Done por corte vertical

Una historia no está terminada hasta cumplir:

- [ ] ruta y permisos definidos;
- [ ] modelo interno readonly y mapper;
- [ ] gateway y adapter remoto;
- [ ] query/mutation con políticas explícitas;
- [ ] loading, vacío, error, offline y sin permiso;
- [ ] UI accesible con targets adecuados;
- [ ] pruebas unitarias/componentes;
- [ ] fixture y prueba de integración contractual;
- [ ] `traceId` disponible en error;
- [ ] no hay PII en logs;
- [ ] OpenAPI actualizado/generado;
- [ ] probado en Android e iOS preview;
- [ ] documentación corta en `index.ts` o README de feature;
- [ ] no hay imports prohibidos ni ciclos.

Para pagos, caja y asistencia además:

- [ ] retry automático desactivado;
- [ ] doble submit bloqueado;
- [ ] permisos validados;
- [ ] resultado de negocio tratado explícitamente;
- [ ] caches invalidados de forma selectiva;
- [ ] E2E del flujo crítico en verde.

## 20. Orden de implementación

1. Proyecto SDK 57, CNG, development build, CI y design tokens.
2. `core/config`, `core/http`, `core/session`, `core/query` y errores.
3. `auth` y protected routes.
4. `instructor-today`, `students`, `media` y `memberships` de lectura.
5. `cash` mínimo.
6. `payments` con idempotencia y recibo.
7. `attendance` y decisión de check-in.
8. E2E, accesibilidad, rendimiento, seguridad y piloto.

## 21. Manifiesto legible por IA

```yaml
document:
  id: GYMBOX-MOB-F1-BLUEPRINT
  version: "1.0"
  language: es-MX
  phase: "Fase 1 - MVP operativo móvil"

platform:
  expoSdk: 57
  reactNative: "0.86"
  react: "19.2"
  typescriptStrict: true
  router: expo-router
  sourceRoot: src
  routeRoot: src/app
  nativeGeneration: CNG
  developmentClient: true

application:
  androidPackage: mx.com.gymbox.mobile
  iosBundleIdentifier: mx.com.gymbox.mobile
  scheme: gymbox

architecture:
  style: feature-first
  topLevelPackages:
    - app
    - core
    - features
    - shared
    - generated
  serverState: tanstack-query
  formState: react-hook-form
  validation: zod
  apiContract: openapi

security:
  accessToken: memory
  refreshToken: expo-secure-store
  refreshStrategy: single-flight
  backendAuthoritative: true
  sensitiveLogs: forbidden

operations:
  paymentOffline: false
  cashOffline: false
  checkInOffline: false
  paymentRetryAutomatic: false
  paymentIdempotencyKey: required

phase1Features:
  - auth
  - instructor-today
  - students-read
  - memberships-read
  - media-read
  - cash-minimal
  - payments
  - attendance
```

## 22. Trazabilidad con las fuentes

| Requisito fuente | Implementación móvil |
|---|---|
| Una sola app con permisos por rol | protected routes + PermissionGate + backend 403. |
| Uso rápido y a una mano | tabs operativas, quick actions, targets de 48 dp. |
| Foto, edad, nivel y membresía visibles | StudentSummary + MembershipCard + AuthorizedImage. |
| Pago transaccional y folio | PaymentsGateway; folio sólo servidor. |
| Caja abierta para efectivo | current cash query + validación backend. |
| Idempotencia | IdempotencyKeyFactory + misma clave en retry manual. |
| Vencido bloqueado | CheckInDecision explícita; sin override en Fase 1. |
| Errores uniformes | ApiError + code/message/details/timestamp/traceId. |
| Offline limitado | lectura en memoria; ninguna mutación crítica offline. |
| Comprobante | ReceiptScreen y endpoint autorizado. |
| Seguridad desde primer sprint | SecureStore, permisos, sanitización, tests. |

## 23. Fuentes técnicas oficiales

- <https://expo.dev/changelog/sdk-57>
- <https://reactnative.dev/blog/2026/06/23/react-native-0.86>
- <https://docs.expo.dev/more/create-expo/>
- <https://docs.expo.dev/router/reference/src-directory/>
- <https://docs.expo.dev/router/advanced/protected/>
- <https://docs.expo.dev/develop/development-builds/introduction/>
- <https://docs.expo.dev/versions/v57.0.0/sdk/router/>
- <https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/>
- <https://tanstack.com/query/latest/docs/framework/react/react-native>

<div class="page-break"></div>

# Parte III - Sprints

## Resumen ejecutivo

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

## 1. Supuestos de planificación

### 1.1 Equipo de referencia

El plan supone una squad con disponibilidad coordinada de:

- desarrollo móvil React Native;
- desarrollo backend Spring/Java 21;
- QA;
- diseño/UX;
- Product Owner u operador del gimnasio para aceptación.

Si una sola persona ejecuta móvil y backend secuencialmente, deben conservarse el orden y los gates, pero no la duración calendario.

### 1.2 Cadencia

| Elemento | Decisión |
|---|---|
| Sprint 0 | 1 semana, preparación técnica. |
| Sprints 1 a 4 | 2 semanas cada uno. |
| Daily | 15 minutos; bloqueo de contrato se escala el mismo día. |
| Refinamiento | una vez por semana. |
| Demo | al cierre de cada sprint sobre preview build y staging. |
| Retrospectiva | después de la demo. |
| Release interna | al menos una por sprint. |

### 1.3 Estimación

Los puntos son relativos y sirven para detectar sobrecarga, no como compromiso fijo. Capacidad inicial de referencia: **24 puntos por sprint de dos semanas**, con 20% reservado para integración, bugs y soporte. Se recalibra al terminar Sprint 1.

### 1.4 Definition of Ready

Una historia entra al sprint cuando:

- tiene usuario, objetivo y valor;
- cuenta con criterios de aceptación verificables;
- el endpoint está definido en OpenAPI o existe un mock contractual aprobado;
- roles/permisos están identificados;
- estados loading, vacío, error, offline y sin permiso están definidos;
- diseño o wireframe está disponible;
- dependencias y datos seed están listos;
- no contiene una decisión de negocio pendiente del dueño/operador.

## 2. Objetivo de la Fase 1

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

## 3. Dependencias backend

| Corte móvil | Módulos backend requeridos | Contratos mínimos |
|---|---|---|
| Sprint 1 | `shared`, `organization`, `identity` | login, refresh, logout, me, errores. |
| Sprint 2 | `media`, `students`, `memberships` | búsqueda/detalle, foto, planes, membresía por alumno. |
| Sprint 3 | `cash`, `payments`, `notifications`, `audit` mínimo | caja actual/abrir/cerrar, pago, recibo, idempotencia. |
| Sprint 4 | `attendance`, `reports`/instructor query | instructor today, check-in, asistencia de hoy. |

El backend debe publicar una especificación OpenAPI versionada. Móvil no bloquea la estructura interna de Spring, pero exige estabilidad de paths, códigos de error y DTO antes de integrar.

## 4. Sprint 0 - Fundación técnica

**Duración:** 1 semana.  
**Objetivo:** dejar el proyecto listo para construir cortes verticales sin deuda estructural.

### 4.1 Backlog

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

### 4.2 Criterios de aceptación

- El proyecto se crea explícitamente con SDK 57.
- `npx expo-doctor`, lint, typecheck y tests están en verde.
- Existe development build instalable en al menos Android y un plan verificable para iOS.
- `src/app`, `src/core`, `src/features`, `src/shared` y `src/generated` existen.
- Una ruta de ejemplo no puede importar un adapter interno por regla de lint.
- El pipeline genera un preview o valida que puede hacerlo.
- La paleta del instructor y los estados base están disponibles.

### 4.3 Demo

Development build con una pantalla pública y una protegida simulada, navegación básica, estado offline y componentes del design system.

### 4.4 Gate de salida G0

No iniciar Sprint 1 sin:

- API base de identidad acordada;
- certificados/HTTPS o ruta segura de dev;
- cuentas seed;
- permisos iniciales;
- owner técnico del OpenAPI.

## 5. Sprint 1 - Autenticación, sesión y permisos

**Duración:** semanas 1 y 2 de Fase 1.  
**Objetivo:** liberar una app interna que inicia sesión, rota tokens y protege rutas de manera correcta.

### 5.1 Backlog

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

### 5.2 Dependencias

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- códigos `UNAUTHENTICATED` y `FORBIDDEN`;
- usuarios seed `ADMINISTRADOR`, `RECEPCION`, `INSTRUCTOR`.

### 5.3 Criterios de aceptación

#### Login

```gherkin
Dado un usuario activo con credenciales válidas
Cuando envía el formulario de login
Entonces la app almacena sólo el refresh token en SecureStore
Y conserva el access token en memoria
Y consulta /auth/me
Y navega a la ruta permitida.
```

#### Refresh

```gherkin
Dadas varias solicitudes que reciben 401 al mismo tiempo
Cuando la sesión puede refrescarse
Entonces se ejecuta una sola llamada de refresh
Y se guarda el nuevo refresh token
Y cada solicitud original se reproduce como máximo una vez.
```

#### Logout

- La app intenta revocar el refresh token.
- Limpia tokens, query cache e historial protegido incluso si no hay red.
- Una vuelta atrás no abre una pantalla protegida.
- No hay tokens ni credenciales en logs.

### 5.4 Pruebas obligatorias

- credenciales inválidas;
- usuario inactivo;
- 401 concurrente;
- refresh revocado;
- 403 de ruta/acción;
- arranque sin token;
- arranque con token válido;
- logout offline.

### 5.5 Demo

Login real contra staging, cierre/reapertura de app, restauración de sesión, expiración forzada, refresh y logout.

### 5.6 Incremento/release

**Development release 0.1.0** para equipo interno.

## 6. Sprint 2 - Operación del instructor, alumnos y membresías

**Duración:** semanas 3 y 4.  
**Objetivo:** permitir que el instructor/recepción encuentre al alumno correcto y conozca su estado antes de cualquier acción.

### 6.1 Backlog

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

### 6.2 Dependencias

- `GET /api/v1/instructor/today`
- `GET /api/v1/students`
- `GET /api/v1/students/{id}`
- `GET /api/v1/memberships/student/{studentId}`
- `GET /api/v1/plans`
- `GET /api/v1/media/{fileId}`
- datos seed con alumno activo, vencido, inactivo y sin foto.

### 6.3 Criterios de aceptación

- La búsqueda no descarga todos los alumnos.
- Las solicitudes previas se cancelan al cambiar el término.
- Cada resultado muestra identidad suficiente para evitar confusión.
- La foto no usa una URL pública fija.
- Edad proviene del backend o de un contrato inequívoco; la app no guarda un campo mutable.
- Vencimiento incluye fecha y texto, no sólo color.
- Un usuario sin permiso no puede abrir la ficha por deep link.
- Al volver de background, los datos stale se refrescan.

### 6.4 Demo

Instructor inicia sesión, ve el día, busca tres alumnos con estados distintos y abre su ficha/membresía.

### 6.5 Incremento/release

**Alpha operativa 0.2.0** para instructores seleccionados, sin pagos habilitados.

## 7. Sprint 3 - Caja mínima, pagos y recibos

**Duración:** semanas 5 y 6.  
**Objetivo:** registrar pagos de manera segura, transaccional e idempotente.

<div class="callout danger">
<span class="callout-title">Orden obligatorio</span>
El pago CASH no entra a producción si caja mínima no está integrada. La validación visual del móvil no sustituye la validación transaccional del backend.
</div>

### 7.1 Backlog

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

### 7.2 Dependencias

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

### 7.3 Criterios de aceptación

#### Efectivo

- Sin caja abierta, la app bloquea el submit y el backend también.
- Caja se refresca antes de confirmar si el dato está stale.
- El monto esperado no se calcula como autoridad en el móvil.

#### Idempotencia

```gherkin
Dado un borrador de pago confirmado
Cuando la primera solicitud termina en timeout
Y el usuario decide reintentar
Entonces la app reutiliza la misma Idempotency-Key
Y el backend devuelve el mismo resultado o evita un segundo cobro.
```

#### Resultado

- El botón se desactiva durante el envío.
- No existe retry automático.
- El éxito muestra folio, método, monto, alumno y recibo.
- Un 409/422 no se interpreta como error genérico.
- El `traceId` se puede copiar para soporte.
- No existe acción móvil de borrar/cancelar pago en Fase 1.

### 7.4 Pruebas obligatorias

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

### 7.5 Demo

Recepción abre caja, busca alumno vencido, registra pago en efectivo, ve un solo folio, abre recibo y confirma membresía renovada.

### 7.6 Incremento/release

**Beta operativa 0.3.0** para uso controlado con datos de staging.

## 8. Sprint 4 - Asistencia, hardening y piloto

**Duración:** semanas 7 y 8.  
**Objetivo:** cerrar el recorrido operativo, elevar calidad y ejecutar un piloto real controlado.

### 8.1 Backlog

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

### 8.2 Dependencias

- `POST /api/v1/attendance/check-in`
- `GET /api/v1/attendance/today`
- `GET /api/v1/attendance/student/{studentId}`
- `GET /api/v1/instructor/today`
- decisiones `ALLOWED`, `ALREADY_REGISTERED`, `BLOCKED_EXPIRED_MEMBERSHIP`, `BLOCKED_INACTIVE_STUDENT`;
- staging con datos de casos límite.

### 8.3 Criterios de aceptación

- `ALLOWED` crea una asistencia y actualiza conteos.
- `ALREADY_REGISTERED` no crea una segunda asistencia.
- `BLOCKED_EXPIRED_MEMBERSHIP` muestra vencimiento y acceso a pago sólo si existe permiso.
- `BLOCKED_INACTIVE_STUDENT` no ofrece bypass.
- Sin red, el botón de check-in está bloqueado con explicación.
- No existe override en Fase 1.
- Pull-to-refresh y foreground no duplican mutaciones.
- El recorrido completo pasa en Android e iOS preview.

### 8.4 Hardening

#### Seguridad

- tokens sólo en ubicaciones definidas;
- 401/403/409/422 revisados;
- logs sanitizados;
- deep links protegidos;
- ninguna URL de media pública persistente;
- cache y sesión se limpian en logout.

#### Accesibilidad

- labels y roles;
- orden de foco;
- contraste;
- target 48 dp;
- error de formulario anunciado;
- estado no comunicado sólo por color.

#### Rendimiento

- listas paginadas/virtualizadas;
- imágenes con tamaño y placeholder;
- no renderizar listas completas;
- evitar refetch loops;
- medir tiempos de inicio y flujo crítico en dispositivos objetivo.

### 8.5 Piloto

- 1 sucursal;
- 2 a 4 usuarios operativos;
- conjunto de alumnos de prueba o ventana controlada;
- soporte presente durante los primeros turnos;
- plan de rollback a proceso manual;
- reporte diario de incidencias.

### 8.6 Demo final

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

### 8.7 Incremento/release

**Release candidate 1.0.0-rc.1** para piloto. El salto a 1.0.0 requiere gates de Fase 1.

## 9. Gates de release

### G1 - Seguridad de sesión

- login, refresh y logout E2E en verde;
- refresh concurrente probado;
- sin tokens en logs/storage no autorizado;
- 403 probado.

### G2 - Identidad correcta

- búsqueda paginada;
- foto protegida;
- membresía visible con fecha/estado;
- 404/403/deep link resueltos.

### G3 - Seguridad financiera

- caja requerida para CASH;
- idempotencia demostrada;
- no retry automático;
- folio único del servidor;
- recibo consultable;
- no existe delete/cancel mobile.

### G4 - Operación y piloto

- decisiones de check-in correctas;
- E2E completo en Android/iOS;
- cero defectos P0 abiertos;
- defectos P1 aceptados/corregidos;
- manual operativo y rollback;
- aprobación del dueño/operador.

## 10. Backlog explícitamente diferido

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

## 11. Métricas objetivo del piloto

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

## 12. Riesgos y respuesta

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

## 13. Ceremonia de demo por sprint

Cada demo debe mostrar:

1. build/version/ambiente visibles;
2. recorrido sobre dispositivo real o simulador representativo;
3. escenario exitoso;
4. error de permiso o regla de negocio;
5. evidencia de tests/CI;
6. lista de deuda aceptada;
7. decisión de Product Owner: aceptado, aceptado con observaciones o rechazado.

No se acepta una demo basada únicamente en capturas o mocks cuando el objetivo del sprint era integración real.

## 14. Definition of Done de Fase 1

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

## 15. Roadmap de releases

| Versión | Corte | Audiencia |
|---|---|---|
| `0.1.0` | auth/sesión | equipo técnico. |
| `0.2.0` | instructor/alumnos/membresías | instructores seleccionados. |
| `0.3.0` | caja/pagos/recibo | QA y operadores en staging. |
| `1.0.0-rc.1` | asistencia + hardening | piloto de sucursal. |
| `1.0.0` | gates aprobados | producción controlada. |

## 16. Trazabilidad con roadmap y blueprint backend

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

## 17. Fuentes técnicas oficiales

- <https://expo.dev/changelog/sdk-57>
- <https://docs.expo.dev/more/create-expo/>
- <https://docs.expo.dev/develop/development-builds/introduction/>
- <https://docs.expo.dev/router/advanced/protected/>
- <https://docs.expo.dev/versions/v57.0.0/sdk/router/>
- <https://reactnative.dev/blog/2026/06/23/react-native-0.86>
