# Triage de dependencias — Sprint 3

Fecha: 2026-08-10  
Comando: `npm audit --json` después de `npm ci`  
Resultado: **33 paquetes reportados: 25 high, 8 moderate, 0 critical**

El baseline del diagnóstico (29: 21 high/8 moderate) ya no es vigente: el
registro publicó advisories adicionales durante el cierre. No se ejecutó
`npm audit fix`, `npm audit fix --force`, downgrade ni upgrade. La instalación
limpia, 39 suites/317 tests y el export Android pasan. El reporte de npm propone
en varias rutas Expo 53 o React Native 0.72; ambos son incompatibles con la
política SDK 57/RN 0.86 y no constituyen una corrección aceptable.

## Criterio de clasificación

- **runtime directa**: paquete declarado para la app; se distingue exposición
  demostrada de un agregado que npm eleva desde herramientas transitivas.
- **runtime transitiva**: llega por navegación/runtime, pero el advisory puede
  residir en una herramienta de build.
- **dev/tooling**: lint, tests, OpenAPI, Metro, CLI o parsing durante build.
- **peer/toolchain**: carrier agregado por relaciones peer/circulares; requiere
  corrección coordinada por Expo/RN.

## Triage completo del reporte

| Paquete | Sev. | Clase/ruta principal | Impacto real observado | Fix compatible SDK 57 | Acción |
|---|---:|---|---|---|---|
| `@eslint/eslintrc` | high | dev: root → eslint → eslintrc → js-yaml | DoS sólo al procesar YAML no confiable en tooling; no viaja al bundle | Probable al subir js-yaml/ESLint, por validar | PR aislado de tooling |
| `@expo/cli` | high | tooling: root → expo → CLI | Agregado por config/Metro/yaml; no explotación runtime demostrada | Sólo parche oficial SDK 57 | Esperar/alinear parches SDK 57 |
| `@expo/config` | moderate | tooling: expo/config plugins | Configuración local/build con archivos controlados | Parche oficial SDK 57 | PR Expo separado |
| `@expo/config-plugins` | moderate | tooling: Expo/prebuild → xcode | Riesgo al procesar proyecto/config; no tráfico financiero | Parche oficial SDK 57 | PR Expo separado |
| `@expo/inline-modules` | moderate | tooling: Expo CLI → config plugins | Sólo transformación/build | Parche oficial SDK 57 | PR Expo separado |
| `@expo/local-build-cache-provider` | moderate | tooling: Expo → config | Cache de build local | Parche oficial SDK 57 | PR Expo separado |
| `@expo/metro` | high | tooling: Expo CLI → Metro | Agregado por Metro/image-size; assets del repo son confiables | Parche oficial SDK 57 | PR Expo separado |
| `@expo/metro-config` | high | tooling: Expo → Metro config | Bundling local/CI, no endpoint móvil | Parche oficial SDK 57 | PR Expo separado |
| `@expo/prebuild-config` | moderate | tooling: CLI → config plugins | Prebuild, no runtime JS financiero | `fixAvailable=true`, compatibilidad no demostrada | Evaluar con `expo install` aislado |
| `@expo/xcpretty` | high | tooling: CLI → js-yaml | Formato de logs de build iOS | Parche oficial SDK 57 | PR Expo separado |
| `@hey-api/json-schema-ref-parser` | high | dev: OpenAPI generator → js-yaml | Contrato local confiable; posible DoS de tooling con schema hostil | npm sugiere downgrade no confiable | Seguir upstream; comparar generated en PR |
| `@hey-api/openapi-ts` | high | dev directa: generador OpenAPI | No forma parte del bundle; generated exacto hoy | npm propone 0.97.0 desde 0.99.0, downgrade | No cambiar en cierre; issue/PR aislado |
| `@hey-api/shared` | high | dev: OpenAPI generator → ref parser | Igual que generador | Sin ruta compatible demostrada | Seguir upstream |
| `@istanbuljs/load-nyc-config` | high | dev: Jest/Istanbul → js-yaml | Cobertura/config de tests | Actualización transitiva posible | PR tooling |
| `@react-native/community-cli-plugin` | high | tooling/peer: RN → Metro config | CLI de build; no API runtime expuesta | npm sugiere RN 0.72, prohibido | Esperar fix RN 0.86/Expo 57 |
| `@react-native/metro-config` | high | tooling/peer: RN → Metro | Bundling | npm sugiere RN 0.72, prohibido | Esperar fix RN 0.86/Expo 57 |
| `@react-native/virtualized-lists` | high | runtime transitiva: RN | npm la marca por el agregado `react-native`; advisory independiente no detallado | Sólo parche coordinado RN 0.86 | Vigilar upstream, probar parche SDK 57 |
| `@testing-library/react-native` | high | dev directa → peer RN | Sólo pruebas; npm propone 13.3.3 desde 14.x | Downgrade sin causa demostrada | Mantener y seguir upstream |
| `brace-expansion` | high | tooling múltiple: Expo fingerprint/TS/Glob | DoS con patrones hostiles; la app no acepta globs de usuarios | 1.1.18/5.0.9 parecen patch, falta prueba multiárbol | Override sólo en PR aislado con CI completo |
| `eslint` | high | dev directa → eslintrc/js-yaml | Lint de fuentes controladas | npm propone ESLint 10 major | No mezclar; PR tooling |
| `expo` | high | runtime directa + CLI carrier | Paquete raíz; hallazgo agregado por CLI/config/Metro, sin exploit financiero demostrado | Mantener SDK 57; parches 57.0.12 pendientes | Alinear nueve parches en PR separado |
| `expo-splash-screen` | moderate | runtime directa/config plugin | Uso de splash y prebuild, no datos financieros | Patch 57.0.6 esperado por Doctor | PR Expo separado |
| `image-size` | high | tooling: Metro → parser de assets | Loop al analizar ICNS/JXL/HEIF hostil; assets son del repo | Requiere actualización de Metro/Expo compatible | PR Expo separado; no aceptar assets no confiables |
| `js-yaml` | high | dev/tooling múltiple; override 4.3.0 | CPU cuadrática al parsear `!!omap` hostil; YAML del repo es controlado | 4.3.1 parece patch compatible | Prioridad alta en PR tooling, regenerar lock y gates |
| `metro` | high | tooling: Expo/RN bundler | Agregado por image-size/config/worker | Sólo combinación compatible SDK 57 | PR Expo/RN separado |
| `metro-config` | high | tooling: Metro | Carrier agregado | Sólo combinación compatible SDK 57 | PR Expo/RN separado |
| `metro-transform-worker` | high | tooling: Metro worker | Carrier agregado | Sólo combinación compatible SDK 57 | PR Expo/RN separado |
| `nanoid` | high | transitiva/tooling | Loop sólo con generadores custom `size=0`; app usa `expo-crypto.randomUUID`, no nanoid | `>=3.3.17` parece patch | Localizar/override en PR aislado |
| `react-native` | high | runtime directa + carrier CLI/listas | npm eleva dependencias; no prueba de una ruta explotable en flujos financieros | Mantener 0.86; sugerencia 0.72 es incompatible | No downgrade; vigilar parche RN 0.86 |
| `react-native-reanimated` | high | runtime transitiva/peer desde Router/drawer | Reportado por RN/worklets; la app no lo declara ni usa directamente | Requiere matriz Expo Router/RN | Resolver sólo mediante Expo 57 compatible |
| `react-native-worklets` | high | runtime transitiva/peer | Carrier de reanimated/RN; sin uso financiero directo demostrado | Requiere matriz Expo/RN | Resolver sólo mediante Expo 57 compatible |
| `uuid` | moderate | tooling: xcode/config plugins | Advisory v3/v5/v6 con buffer; la app genera UUID con expo-crypto, no este paquete | `>=11.1.1`, compatibilidad de xcode por validar | PR Expo/config separado |
| `xcode` | moderate | tooling: config plugins → uuid | Manipulación de proyecto iOS durante prebuild | Depende de config plugins/uuid | PR Expo separado |

## Conclusión de riesgo

No hay vulnerabilidad critical ni explotación runtime financiera demostrada. Los
cinco advisories raíz observables (`brace-expansion`, `image-size`, `js-yaml`,
`nanoid`, `uuid`) son DoS/bounds en parsers o generadores transitivos; las demás
entradas son carriers/efectos en el grafo. Esto no equivale a “sin riesgo”: se
requiere un ciclo separado, primero parches oficiales SDK 57 y luego overrides
patch mínimos, con Doctor, `npm ci`, tests, contrato, generated, Android e iOS.

No se debe aceptar la remediación automática que baja a Expo 53 o RN 0.72, ni
usar `--legacy-peer-deps`, `npm audit fix` o `npm audit fix --force`.
