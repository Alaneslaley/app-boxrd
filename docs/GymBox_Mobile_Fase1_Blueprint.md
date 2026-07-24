---
title: "Blueprint implementable de GymBox Mobile"
subtitle: "Paquetes, archivos, clases, contratos, rutas, flujos y Definition of Done de la Fase 1"
document_code: "GYMBOX-MOB-F1-BLUEPRINT"
version: "1.0"
date: "23 de julio de 2026"
lang: "es-MX"
---

# Resumen ejecutivo

Este blueprint traduce la arquitectura móvil de GymBox en una estructura de proyecto implementable. Define el árbol de carpetas, nombres de archivos, clases e interfaces, APIs públicas de cada feature, rutas, contratos backend, flujos críticos y orden de construcción.

La raíz de código es `src/`. Expo Router vive en `src/app`; los cortes verticales en `src/features`; la infraestructura técnica en `src/core`; el design system en `src/shared`; los tipos OpenAPI en `src/generated/api`.

<div class="callout decision">
<span class="callout-title">Regla canónica</span>
Los archivos bajo `src/app` son adaptadores de navegación. Una ruta importa una pantalla desde la API pública de una feature y no implementa lógica de negocio, fetch, validación de dominio ni acceso a storage.
</div>

# 1. Identidad técnica

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

# 2. Árbol completo propuesto

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

# 3. Regla interna de cada feature

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

# 4. Catálogo de core técnico

## 4.1 Aplicación y bootstrap

| Archivo | Tipo | Responsabilidad |
|---|---|---|
| `AppProviders.tsx` | componente | Compone QueryClient, SessionProvider, safe area, theme y bridges. |
| `AppBootstrap.tsx` | componente | Coordina carga de fuentes/configuración y bootstrap de sesión. |
| `SplashScreenController.tsx` | componente | Mantiene splash hasta estado inicial determinista. |

## 4.2 Configuración

| Archivo | Tipo | Responsabilidad |
|---|---|---|
| `Environment.ts` | value object | Expone `apiBaseUrl`, `environment`, `appVersion`, `buildNumber`. |
| `environment.schema.ts` | schema Zod | Falla temprano si la configuración es inválida. |
| `version.ts` | funciones | Forma el identificador visible para soporte. |

La app se niega a arrancar en producción si la API no usa HTTPS.

## 4.3 HTTP

### `HttpClient`

```ts
export interface HttpClient {
  request<TResponse>(request: HttpRequest): Promise<HttpResponse<TResponse>>;
}
```

### `GymboxHttpClient`

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

### `ApiError`

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

### `RefreshCoordinator`

Mantiene una única promesa activa de refresh. Todas las solicitudes que reciben 401 esperan el mismo resultado. Después de un refresh exitoso, cada solicitud se reproduce una vez. Un segundo 401 termina la sesión.

## 4.4 Sesión

### `TokenVault`

```ts
export interface TokenVault {
  getRefreshToken(): Promise<string | null>;
  setRefreshToken(token: string): Promise<void>;
  clear(): Promise<void>;
}
```

### `SessionService`

Métodos:

- `bootstrap(): Promise<SessionSnapshot>`
- `signIn(credentials): Promise<SessionSnapshot>`
- `refresh(): Promise<SessionSnapshot>`
- `signOut(): Promise<void>`
- `getAccessToken(): string | null`

### `SessionState`

```ts
export type SessionState =
  | { status: 'booting' }
  | { status: 'anonymous' }
  | { status: 'authenticated'; user: CurrentUser; permissions: ReadonlySet<string> };
```

## 4.5 Permisos

```ts
export type Permission = string & { readonly __brand: 'Permission' };

export function can(
  permissions: ReadonlySet<string>,
  required: string | readonly string[],
): boolean;
```

El catálogo exacto de códigos se genera o configura desde el contrato/seed del backend. No se duplican nombres de permiso en múltiples pantallas.

## 4.6 Idempotencia

`ExpoIdempotencyKeyFactory` genera una clave UUID y la feature de pagos la conserva en `PaymentDraft` hasta recibir una respuesta terminal.

```ts
export type IdempotencyKey = string & { readonly __brand: 'IdempotencyKey' };

export interface IdempotencyKeyFactory {
  create(): IdempotencyKey;
}
```

# 5. Catálogo de features

## 5.1 `auth`

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

## 5.2 `instructor-today`

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

## 5.3 `students`

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

## 5.4 `memberships`

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

## 5.5 `media`

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

## 5.6 `cash`

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

## 5.7 `payments`

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

### `PaymentDraft`

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

### `RegisterPaymentService`

1. comprueba conectividad;
2. valida formulario;
3. si es efectivo, obtiene caja actual;
4. conserva la clave idempotente;
5. llama al gateway con retry automático desactivado;
6. mapea éxito/error;
7. invalida queries afectadas;
8. navega a resultado sólo con una respuesta terminal.

## 5.8 `attendance`

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

# 6. APIs públicas de features

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

# 7. Mapa de rutas a pantallas

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

# 8. Composición de providers

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

# 9. Mapa de endpoints backend

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

# 10. Contratos y mappers

## 10.1 Principio

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

## 10.2 Errores de dominio

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

# 11. Flujos críticos

## 11.1 Login, refresh y logout

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

## 11.2 Inicio del instructor

1. Cargar `/instructor/today`.
2. Mostrar fecha local, usuario, caja, conteos y alertas.
3. No inferir membresías desde cache antiguo.
4. Accesos rápidos visibles según permisos.
5. Refrescar al pull-to-refresh y al volver a foreground si los datos están stale.

## 11.3 Pago

1. Abrir desde el alumno para evitar selección ambigua.
2. Cargar membresía y planes.
3. Construir `PaymentDraft`.
4. Para efectivo, comprobar caja actual.
5. Crear `Idempotency-Key` al confirmar.
6. Enviar una sola mutación.
7. En éxito, mostrar folio/recibo e invalidar caches.
8. En timeout, mantener el mismo borrador y clave.
9. En 409/422, explicar la regla y no reintentar a ciegas.

## 11.4 Check-in

1. Seleccionar alumno desde búsqueda o lista.
2. Mostrar identidad y estado visible.
3. Confirmar check-in.
4. Backend valida estado, duplicidad y membresía.
5. UI presenta la decisión exacta.
6. Sólo `ALLOWED` actualiza el conteo como nueva asistencia.
7. Invalida asistencia de hoy e instructor today.

# 12. Formularios

## 12.1 Login

- usuario/email según contrato;
- contraseña;
- submit único;
- teclado y autofill configurados;
- error 401 genérico;
- accesibilidad para lector de pantalla.

## 12.2 Apertura de caja

- monto inicial;
- confirmación explícita;
- permiso y estado actual;
- no aceptar montos negativos;
- respuesta muestra ID y hora del servidor.

## 12.3 Pago

- alumno fijo o claramente seleccionado;
- plan/concepto;
- monto;
- método;
- referencia obligatoria para transferencia/tarjeta si backend la exige;
- resumen previo a confirmar;
- bloqueo contra doble toque;
- borrador se limpia sólo en éxito/cancelación explícita.

# 13. Query y mutation policies

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

# 14. Design system mínimo

## 14.1 Componentes obligatorios

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

## 14.2 Tokens

```ts
export const spacing = { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;
```

Los componentes no usan colores hex ad hoc fuera del tema.

# 15. Configuración de app

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

# 16. EAS profiles

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

# 17. ESLint y límites

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

# 18. Estrategia de pruebas por paquete

## Core

- `RefreshCoordinatorTest`: una llamada de refresh para N solicitudes.
- `SessionServiceTest`: bootstrap, rotación, logout y limpieza.
- `ApiErrorMapperTest`: todos los estados HTTP y `traceId`.
- `ExpoIdempotencyKeyFactoryTest`: formato y unicidad.

## Features

- `auth`: error de credenciales, loading y navegación.
- `students`: debounce, paginación y cancelación.
- `memberships`: estados y fechas.
- `cash`: caja abierta/cerrada, 409 y permisos.
- `payments`: doble toque, timeout, misma clave y éxito.
- `attendance`: cuatro decisiones y no duplicidad.

## E2E

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

# 19. Definition of Done por corte vertical

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

# 20. Orden de implementación

1. Proyecto SDK 57, CNG, development build, CI y design tokens.
2. `core/config`, `core/http`, `core/session`, `core/query` y errores.
3. `auth` y protected routes.
4. `instructor-today`, `students`, `media` y `memberships` de lectura.
5. `cash` mínimo.
6. `payments` con idempotencia y recibo.
7. `attendance` y decisión de check-in.
8. E2E, accesibilidad, rendimiento, seguridad y piloto.

# 21. Manifiesto legible por IA

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

# 22. Trazabilidad con las fuentes

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

# 23. Fuentes técnicas oficiales

- <https://expo.dev/changelog/sdk-57>
- <https://reactnative.dev/blog/2026/06/23/react-native-0.86>
- <https://docs.expo.dev/more/create-expo/>
- <https://docs.expo.dev/router/reference/src-directory/>
- <https://docs.expo.dev/router/advanced/protected/>
- <https://docs.expo.dev/develop/development-builds/introduction/>
- <https://docs.expo.dev/versions/v57.0.0/sdk/router/>
- <https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/>
- <https://tanstack.com/query/latest/docs/framework/react/react-native>
