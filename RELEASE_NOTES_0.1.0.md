# GymBox Mobile 0.1.0 — notas internas

## Objetivo

Build interno del Sprint 1 para validar autenticación, sesión y permisos. No es
una publicación para stores ni habilita módulos del Sprint 2.

## Configuración

- Expo: `@escuela-de-box-rd/escuela-de-box-rd`
- App ID: `mx.com.gymbox.mobile`
- Backend temporal: `https://box-rd-backend.onrender.com/api/v1`
- Perfil recomendado: `preview`

## Prueba manual

1. Instalar el APK preview.
2. Confirmar versión, build y ambiente en login.
3. Iniciar sesión con una cuenta seed entregada fuera de Git.
4. Confirmar `/auth/me`, nombre, sucursal y conteo de permisos.
5. Cerrar y reabrir para verificar restauración.
6. Usar la cuenta/token corto preparado por backend para validar un solo refresh.
7. Probar una cuenta sin permisos, una cuenta ALUMNO y `mustChangePassword`.
8. Cerrar sesión con y sin red; Atrás no debe recuperar contenido protegido.
9. Registrar sólo status y `traceId`, nunca credenciales.

## Bloqueos conocidos

- No se proporcionaron cuentas seed.
- No existe mecanismo de expiración corta para E2E de refresh.
- Faltan owner y catálogo de autorización.
- OpenAPI no aplica bearer ni describe errores, aunque el backend temporal sí
  devuelve 400/401 con `traceId`.

## Rollback

1. Retirar el build `0.1.0` de distribución interna.
2. Reinstalar el último APK de Fase 0 sólo en dispositivos de prueba.
3. Revocar sesiones de prueba desde backend si fueron emitidas.
4. No reutilizar refresh tokens ni copiar SecureStore entre instalaciones.
5. Restaurar la URL por configuración EAS; no desactivar TLS.

No se requiere migración de datos: la única credencial persistida es el refresh
token bajo una clave versionada y la desinstalación Android lo elimina.
