import { readFileSync } from 'node:fs';

const files = [
  '.env.local.example',
  '.env.development.example',
  '.env.staging.example',
  '.env.production.example',
];
const allowedKeys = new Set([
  'APP_ENV',
  'APP_VERSION',
  'APP_BUILD',
  'APP_COMMIT',
  'EXPO_PUBLIC_API_URL',
  'EXPO_PUBLIC_ENABLE_DEMO_SESSION',
]);
const requiredKeys = [...allowedKeys];
const allowedEnvironments = new Set(['local', 'development', 'staging', 'production']);

function parseEnv(contents) {
  return Object.fromEntries(
    contents
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const separator = line.indexOf('=');
        return [line.slice(0, separator), line.slice(separator + 1)];
      }),
  );
}

const errors = [];
for (const file of files) {
  const values = parseEnv(readFileSync(file, 'utf8'));
  for (const key of requiredKeys) {
    if (!values[key]?.trim()) errors.push(`${file}: falta ${key}.`);
  }
  for (const key of Object.keys(values)) {
    if (!allowedKeys.has(key)) errors.push(`${file}: variable no permitida ${key}.`);
    if (/SECRET|PASSWORD|TOKEN|PRIVATE_KEY/i.test(key)) {
      errors.push(`${file}: posible secreto en ${key}.`);
    }
  }

  const environment = values.APP_ENV;
  if (!allowedEnvironments.has(environment)) {
    errors.push(`${file}: APP_ENV inválido.`);
  }
  if (!['true', 'false'].includes(values.EXPO_PUBLIC_ENABLE_DEMO_SESSION)) {
    errors.push(`${file}: EXPO_PUBLIC_ENABLE_DEMO_SESSION debe ser true o false.`);
  }

  try {
    const url = new URL(values.EXPO_PUBLIC_API_URL);
    if (url.pathname.replace(/\/+$/, '').endsWith('/api/v1')) {
      errors.push(`${file}: la URL debe terminar antes de /api/v1.`);
    }
    if (['staging', 'production'].includes(environment) && url.protocol !== 'https:') {
      errors.push(`${file}: ${environment} requiere HTTPS.`);
    }
  } catch {
    errors.push(`${file}: EXPO_PUBLIC_API_URL no es una URL válida.`);
  }
}

if (errors.length > 0) {
  errors.forEach((error) => console.error(`ENV: ${error}`));
  process.exit(1);
}

console.log('Ambientes local, development, staging y production validados.');
