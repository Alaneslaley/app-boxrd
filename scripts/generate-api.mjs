import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const input = resolve(projectRoot, 'contracts/openapi/gymbox-openapi.json');
const output = resolve(projectRoot, 'src/generated/api');
const cli = resolve(projectRoot, 'node_modules/@hey-api/openapi-ts/bin/run.js');

if (!existsSync(input)) {
  console.error(`OPENAPI: No existe el contrato oficial en ${input}.`);
  process.exit(1);
}

if (!existsSync(cli)) {
  console.error('OPENAPI: Falta @hey-api/openapi-ts. Ejecuta npm ci antes de generar.');
  process.exit(1);
}

mkdirSync(output, { recursive: true });

const result = spawnSync(
  process.execPath,
  [
    cli,
    '--input',
    input,
    '--output',
    output,
    '--plugins',
    '@hey-api/typescript',
    '--no-log-file',
  ],
  { cwd: projectRoot, stdio: 'inherit' },
);

if (result.error) {
  console.error(`OPENAPI: No se pudo iniciar el generador: ${result.error.message}`);
  process.exit(1);
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
