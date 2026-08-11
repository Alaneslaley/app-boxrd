# GymBox Mobile — Release readiness Fase 1

Fecha: 2026-08-10  
Commit base: `c77e0de77b3f3fc2a85691c4cdb66b89dc8faac2`  
Worktree: cambios de Sprint 4 sin commit  
Versión conservada: `0.2.0`

## Dictamen ejecutivo

**FASE 1 MÓVIL LISTA LOCALMENTE / PENDIENTE EVIDENCIA EXTERNA**

**`1.0.0-rc.1` NO LISTO**

El producto tiene código y gates locales verdes, pero no está certificado para
piloto. Faltan CI remoto verde, staging autenticado con seeds, ejecución Maestro
completa, Android/iOS preview, métricas/defectos reales y aprobación del
Product Owner/operador. La metadata no se actualizó y no hubo commit, push, tag,
build EAS, publicación ni despliegue.

## Evidencia local aprobada

| Gate | Resultado | Evidencia |
|---|---|---|
| instalación limpia | APROBADO | `npm ci`, 1,159 paquetes |
| contrato | APROBADO | OpenAPI 3.1, 331 referencias; 3 warnings backend conocidos |
| generated | APROBADO | 2 archivos comparados byte a byte contra salida temporal |
| TypeScript | APROBADO | `tsc --noEmit` |
| lint | APROBADO | Expo lint |
| tests | APROBADO | 43 suites, 343 tests, 343 passed |
| boundaries/cycles | APROBADO | sin violaciones ni ciclos |
| ambientes | APROBADO | local/development/staging/production |
| Expo Doctor | APROBADO | 20/20 |
| Maestro estático | APROBADO | 35 YAML válidos, 8 flows Sprint 4; no ejecutados |
| Android export | APROBADO | 1,510 módulos, bundle Hermes 3.8 MB |
| diff check | APROBADO | sin whitespace errors; avisos CRLF informativos |
| audit | ACEPTACIÓN PENDIENTE | 16 high, 8 moderate, 0 critical |

## Estado funcional

| Capacidad | Local | Externo/piloto |
|---|---|---|
| G1 auth/session | pruebas locales verdes | E2E refresh/login/logout pendiente |
| G2 students/membership | pruebas locales verdes | staging/plataformas pendiente |
| G3 cash/payment/receipt | pruebas locales verdes | staging financiero/Maestro pendiente |
| G4 attendance | 24 pruebas attendance verdes | cuatro seeds + staging + plataformas pendiente |
| seguridad/PII | sanitización, SecureStore y bloqueo de capturas | revisión/aceptación humana pendiente |
| accesibilidad | roles, labels, 48 px, alert/foco y estados | auditoría VoiceOver/TalkBack pendiente |
| rendimiento | FlatList/paginación/dedupe/caché en memoria | mediciones objetivo pendientes |

## Bloqueos para piloto/RC

1. El último CI remoto público, run `31452996436` sobre `c77e0de`, falló en
   `npm ci`; GitHub restringe el log a administradores. El lockfile actual pasa
   localmente, pero aún no existe run para estos cambios.
2. Staging sólo se probó sin credenciales: `/auth/me` y `/attendance/today`
   respondieron 401 con TLS válido. No hubo login ni mutaciones.
3. Maestro CLI no está instalado y ADB no reporta dispositivos. Los YAML fueron
   parseados, no ejecutados.
4. `assembleDebug` agotó 604 segundos y no produjo un APK nuevo; la exportación
   Metro sí pasa, pero no equivale a preview instalada.
5. No hay host iOS; EAS preview está configurado pero un build remoto no fue
   autorizado.
6. No hubo piloto: no hay mediciones, P0=0 demostrado, aceptación P1/P2,
   capacitación ni firma del dueño/operador.
7. Las 24 vulnerabilidades restantes son transitivas de Expo/RN/tooling; npm
   propone downgrades o majors incompatibles. Requieren aceptación o futuros
   parches compatibles, no `audit fix`.

## Condiciones para `1.0.0-rc.1`

- CI remoto verde sobre el commit candidato.
- Staging completo de auth, alumnos, finanzas y attendance.
- Maestro Sprints 1–4 y `full-phase1` ejecutado en binarios actuales.
- Android e iOS preview instaladas y smoke completo.
- Audit aceptado y P0 en cero con evidencia de piloto.
- P1 corregidos o aceptados explícitamente.
- G1, G2, G3 y G4 aprobados.
- Manual/soporte/rollback revisados y Product Owner/operador aprueban.

Hasta entonces se conserva `0.2.0`; no corresponde generar ni publicar el RC.
