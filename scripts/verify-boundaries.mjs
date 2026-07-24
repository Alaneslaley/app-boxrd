import { readdirSync, readFileSync, statSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';

const root = resolve('src');
const sourceExtensions = new Set(['.ts', '.tsx']);
const failures = [];

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return walk(path);
    const extension = entry.name.endsWith('.tsx') ? '.tsx' : entry.name.endsWith('.ts') ? '.ts' : '';
    return sourceExtensions.has(extension) ? [path] : [];
  });
}

function importsOf(source) {
  const imports = [];
  const pattern = /(?:import|export)\s+(?:type\s+)?(?:[^'"]*?\sfrom\s*)?['"]([^'"]+)['"]/g;
  for (const match of source.matchAll(pattern)) imports.push(match[1]);
  return imports;
}

for (const file of walk(root)) {
  const path = relative(root, file).split(sep).join('/');
  const source = readFileSync(file, 'utf8');
  const imports = importsOf(source);
  const isApp = path.startsWith('app/');
  const isCoreOrShared = path.startsWith('core/') || path.startsWith('shared/');
  const isUi = path.includes('/ui/');
  const featureMatch = path.match(/^features\/([^/]+)\//);

  for (const imported of imports) {
    const importedFeature = imported.match(/^@\/features\/([^/]+)(?:\/(.+))?$/);
    if (isApp && importedFeature?.[2]) {
      failures.push(`${path}: app sólo puede importar el index público de ${importedFeature[1]}.`);
    }
    if (featureMatch && importedFeature && importedFeature[1] !== featureMatch[1] && importedFeature[2]) {
      failures.push(`${path}: una feature no puede importar internals de ${importedFeature[1]}.`);
    }
    if (isCoreOrShared && imported.startsWith('@/features')) {
      failures.push(`${path}: core/shared no puede importar features.`);
    }
    if ((isApp || isUi) && imported.startsWith('@/generated/api')) {
      failures.push(`${path}: rutas/UI no pueden importar OpenAPI generado.`);
    }
    if (isApp && imported === 'expo-secure-store') {
      failures.push(`${path}: una ruta no accede directamente a SecureStore.`);
    }
  }

  if (isApp && /\bfetch\s*\(/.test(source)) {
    failures.push(`${path}: una ruta no ejecuta fetch.`);
  }
}

if (failures.length > 0) {
  failures.forEach((failure) => console.error(`BOUNDARY: ${failure}`));
  process.exit(1);
}

console.log('Límites arquitectónicos verificados.');
