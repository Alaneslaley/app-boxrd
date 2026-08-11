# Checklist de readiness del piloto GymBox Mobile Fase 1

Fecha de corte: 2026-08-10  
Estado: **NO APROBADO — PENDIENTE EVIDENCIA EXTERNA**

## Alcance y gobierno

- [ ] Una sucursal aprobada por Product Owner/operador.
- [ ] Entre 2 y 4 usuarios operativos nominados y capacitados.
- [ ] Ventana, inicio, fin y responsable de detener el piloto definidos.
- [ ] Alumnos sintéticos o ventana de datos reales formalmente autorizada.
- [ ] Soporte presente y canal/SLA comunicados.
- [ ] Proceso manual de rollback aceptado por la sucursal.
- [ ] Reporte diario y custodio de evidencia definidos.

No existe evidencia en el repositorio para marcar estos puntos.

## Build, distribución y plataformas

- [x] Perfil EAS `preview` de distribución interna configurado para staging.
- [x] Metadata se conserva en `0.2.0`; no se adelantó `1.0.0-rc.1`.
- [x] Expo Doctor local 20/20.
- [ ] CI remoto verde para el commit candidato.
- [ ] Android preview actual generado e instalado.
- [ ] Smoke Android completo en dispositivo/emulador representativo.
- [ ] iOS preview actual generado e instalado.
- [ ] Smoke iOS completo en simulator/device.
- [ ] Ocho flows Sprint 4 y recorrido Fase 1 ejecutados, no sólo parseados.

El build Android local iniciado en este corte agotó 604 s y no generó un APK
nuevo. No hay dispositivo ADB, CLI Maestro ni host iOS disponible.

## Staging y datos de prueba

- [x] URL staging HTTPS configurada antes de `/api/v1`.
- [x] Conectividad no autenticada confirmada: auth/me y attendance/today
  respondieron 401 con TLS válido.
- [ ] Credenciales sintéticas de recepción/instructor disponibles fuera de Git.
- [ ] Seeds aislados para ALLOWED, ALREADY_REGISTERED, vencido e inactivo.
- [ ] Seeds financieros de caja, replay, uncertain y recibos PENDING/READY/FAILED.
- [ ] Reset idempotente entre flows confirmado.
- [ ] Login/refresh/logout/403 ejecutados en staging.
- [ ] Students/membership ejecutado en staging.
- [ ] Caja/pagos/recibos ejecutados en staging.
- [ ] Today/history/check-in ejecutado en staging.

## Seguridad, privacidad y soporte

- [x] Tokens de acceso sólo en memoria; refresh token en SecureStore.
- [x] Logout limpia sesión, caché y estado sensible por pruebas locales.
- [x] Logger sanitiza tokens, Authorization, email y teléfono.
- [x] Fotos/recibos usan headers protegidos y no caché persistente.
- [x] Capturas bloqueadas en toda la experiencia interna con
  `expo-screen-capture` estable de SDK 57.
- [x] Check-in/pagos/caja no se encolan offline.
- [x] Manual, soporte, rollback y plantilla de incidente preparados.
- [ ] Revisión de privacidad y seguridad aceptada por el dueño.
- [ ] Canal de incidentes y responsables completados.

## Calidad y defectos

- [x] Contrato y generated sin drift en el baseline y se revalidarán al cierre.
- [x] Corrida final: 43 suites / 343 pruebas / 343 passed.
- [x] Ocho YAML Sprint 4 y 35 YAML totales pasan validación estática.
- [x] `js-yaml` remediado a 4.3.1 compatible.
- [ ] Auditoría de dependencias aceptada: quedan 16 altas y 8 moderadas
  transitivas, 0 críticas; los fixes propuestos rompen SDK 57/RN 0.86.
- [ ] P0 = 0 demostrado por piloto.
- [ ] P1 corregidos o aceptados explícitamente.
- [ ] P2 revisados por Product Owner.
- [ ] `PILOT_DEFECT_REGISTER.md` firmado al finalizar la ventana.

## Métricas (sin datos todavía)

| Métrica | Objetivo | Evidencia actual |
|---|---:|---|
| sesiones sin crash | >= 99.5% | SIN DATO |
| login válido | >= 99% | SIN DATO |
| pagos duplicados | 0 | SIN DATO PILOTO |
| check-in vencido aceptado | 0 | SIN DATO PILOTO |
| search → detail mediano | <= 5 s | SIN MEDICIÓN |
| detail → check-in mediano | <= 10 s | SIN MEDICIÓN |
| uncertain sin resolver al cierre | 0 | SIN DATO |
| P0 abiertos | 0 | SIN PILOTO |
| usuarios capacitados | 100% | SIN DATO |

## Decisión

No iniciar piloto hasta completar todos los puntos no marcados que correspondan
a CI, staging, Android, iOS, Maestro, dependencias/defectos y aprobación humana.
