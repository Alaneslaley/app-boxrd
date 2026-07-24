# Informe de color para la app y web del gimnasio de box

## Resumen ejecutivo

Sin identidad previa, conviene usar una familia visual común y variar el color dominante por contexto: **instructor = control + urgencia**, **alumno = progreso + cercanía**, **web admin/deportivo = confianza + lectura analítica**.

La base debe ser neutral oscura o casi blanca, con azul para acciones confiables, verde para progreso/éxito, ámbar para *warning* y rojo reservado sólo para fraude, vencimientos, fallos o riesgo.

Esto encaja con tu operación: pagos/caja y asistencia requieren lectura rápida y estados inequívocos; el módulo deportivo exige visibilidad de RPE, dolor y progreso; y el alumno necesita señales de personalización y avance del ciclo de 12 semanas.

## Criterios de diseño

WCAG 2.2 pide **4.5:1** para texto normal, **3:1** para texto grande y **3:1** para componentes/estados no textuales; además, el color no puede ser el único medio para comunicar estado y los *targets* deben medir al menos **24 × 24 px**.

Por eso, el sistema debe combinar **color + texto + icono + borde/focus**.

| Color | Intención | Usos recomendados |
|---|---|---|
| Azul | Acción confiable | CTA, *links* y *tabs* |
| Verde | Progreso/éxito | Pagos OK, metas y *badges* |
| Ámbar | Atención preventiva | Vencimientos y carga alta |
| Rojo | Sólo riesgo | Fraude, error y bloqueo |
| Neutros | Base visual | Fondos, *cards* y texto |

## Paletas recomendadas

### Instructor móvil

| Rol | HEX | RGB | Uso |
|---|---|---|---|
| Primaria | `#1D4ED8` | `29, 78, 216` | *Header*, *tab* activa, CTA principal y *links* |
| Secundaria | `#0F172A` | `15, 23, 42` | Fondos, *cards*, texto principal e iconos |
| Acento | `#C2410C` | `194, 65, 12` | “Iniciar clase”, *timer* y efectivo pendiente |
| *Dark alt* | `#93C5FD` / `#E5E7EB` / `#FDBA74` | — | Modo oscuro |

**Ratios sugeridos:** azul/blanco **6.7:1**, texto oscuro/claro **17.8:1**, acento/blanco **5.18:1**.

Úsala para una UI operativa y rápida: menos emocional, más legible.

### Alumno móvil

| Rol | HEX | RGB | Uso |
|---|---|---|---|
| Primaria | `#4338CA` | `67, 56, 202` | *Hero*, progreso y CTA principal |
| Secundaria | `#0F766E` | `15, 118, 110` | Barras, bienestar y metas |
| Acento | `#E11D48` | `225, 29, 72` | Logros, *feedback* destacado y CTA emocional |
| *Dark alt* | `#A5B4FC` / `#5EEAD4` / `#FDA4AF` | — | Modo oscuro |

**Ratios:** índigo/blanco **7.9:1**, teal/blanco **5.47:1**, rose/blanco **4.7:1**.

La mezcla comunica guía, salud y cercanía sin perder energía deportiva.

### Web administrativo y deportivo

| Rol | HEX | RGB | Uso |
|---|---|---|---|
| Primaria | `#111827` | `17, 24, 39` | Texto, *sidebar*, tablas y *cards* |
| Secundaria | `#1E40AF` | `30, 64, 175` | Filtros, botones primarios y *links* |
| Acento | `#047857` | `4, 120, 87` | KPIs positivos, progreso y métricas deportivas |
| *Extra warning* | `#A16207` | `161, 98, 7` | Vencimientos, anomalías y auditoría |
| *Dark alt* | `#CBD5E1` / `#93C5FD` / `#A7F3D0` | — | Modo oscuro |

**Ratios:** slate/claro **16.98:1**, azul/blanco **8.72:1**, verde/blanco **5.48:1**, ámbar/blanco **4.92:1**.

Es la mejor para finanzas, caja, reportes y lectura de *dashboards*.

## Benchmarks y mockups

> El PDF original incluye una composición visual con capturas de referencia de Strava, Nike Training Club, ClassPass y Mindbody.

Strava usa un eje oscuro + naranja muy efectivo para acción inmediata; Nike Training Club privilegia contraste alto y foco en contenido; ClassPass favorece azul limpio y descubrimiento; Mindbody modela bien el *back-office* de pagos, *staff*, *scheduling* y *reporting*.

### Instructor

```text
[Azul header] Clase del día
[Chip naranja] RPE 6-7
[Card oscura] 18 alumnos | 3 vencidos | 2 alertas
[Botón azul] Registrar asistencia
[Badge rojo] Vencido
```

### Alumno

```text
[Hero índigo] Semana 3 de 12
[Barra teal] Asistencia 8/12
[Card blanca] Feedback del coach
[Chip rose] Logro desbloqueado
```

### Admin web

```text
[Sidebar slate]
[KPI verde] Ingresos hoy
[KPI ámbar] Vencimientos 7 días
[Tabla clara] Caja / pagos / incidencias
[Botón azul] Exportar reporte
```

## Reglas, tokens e implementación

No uses rojo como color principal; resérvalo para error/fraude. Mantén una proporción cercana a **70/20/10**: neutros, color principal y acento.

- **Hover:** oscurecer entre 8 % y 10 %.
- **Active:** oscurecer entre 12 % y 16 %.
- **Disabled:** opacidad + texto secundario.
- **Focus:** `outline` sólido de 2 px con contraste mínimo de 3:1.

### Tokens CSS

```css
:root {
  --bg: #F8FAFC;
  --text: #111827;
  --primary: #1D4ED8;
  --success: #15803D;
  --warning: #A16207;
  --danger: #B91C1C;
}

.btn-primary {
  background: var(--primary);
  color: #fff;
}

.input:focus {
  outline: 2px solid #1D4ED8;
  outline-offset: 2px;
}
```

### Tokens para la app

```ts
const tokens = {
  bg: '#F8FAFC',
  text: '#111827',
  primary: '#4338CA',
  accent: '#0F766E',
};
```

## Accesibilidad y pruebas

Checklist:

- Contraste AA/AAA.
- No depender sólo del color.
- Iconos + etiquetas en *badges*.
- *Focus* visible.
- *Targets* de al menos 24 px.
- Pruebas bajo sol y en exteriores.
- Simulación de daltonismo.
- *Dark mode*.
- Tablas con soporte 3:1 en bordes y *sparklines*.
- Alertas financieras con texto explícito: “Pago cancelado” y “Caja con diferencia”.
- En aplicaciones deportivas, probar la lectura con fatiga y movimiento.

## Fuentes y recursos

Base normativa: WCAG 2.2 y WebAIM Contrast.

Benchmarks: Strava Mobile, ClassPass Reviews, Mindbody Business y cobertura pública de Nike Training Club.

Contexto funcional: tu programa de entrenamiento, que prioriza objetivo del día, RPE, dolor/molestia, *rounds* y seguimiento mensual.

1. [Understanding Success Criterion 1.4.3: Contrast (Minimum) — WAI/W3C](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
2. [Best Fitness & Wellness Management Software — Mindbody](https://www.mindbodyonline.com/)
3. [Running App and Cycling App — Strava](https://www.strava.com/mobile)
4. [Understanding Success Criterion 1.4.1: Use of Color — WAI/W3C](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)
5. [Understanding Success Criterion 2.5.8: Target Size (Minimum) — WAI/W3C](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
