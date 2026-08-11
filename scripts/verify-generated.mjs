import { spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const input = resolve(projectRoot, 'contracts/openapi/gymbox-openapi.json');
const expected = resolve(projectRoot, 'src/generated/api');
const cli = resolve(projectRoot, 'node_modules/@hey-api/openapi-ts/bin/run.js');
const temporaryRoot = mkdtempSync(join(tmpdir(), 'gymbox-openapi-'));
const actual = resolve(temporaryRoot, 'api');

function files(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => entry.isDirectory()
      ? files(resolve(directory, entry.name))
      : [resolve(directory, entry.name)])
    .sort();
}

try {
  const result = spawnSync(process.execPath, [
    cli,
    '--input', input,
    '--output', actual,
    '--plugins', '@hey-api/typescript',
    '--no-log-file',
  ], { cwd: projectRoot, encoding: 'utf8' });

  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout || 'Falló la generación temporal.\n');
    process.exitCode = result.status ?? 1;
  } else {
    const expectedFiles = files(expected).map((file) => relative(expected, file));
    const actualFiles = files(actual).map((file) => relative(actual, file));
    const errors = [];
    if (JSON.stringify(expectedFiles) !== JSON.stringify(actualFiles)) {
      errors.push(`inventario distinto: esperado ${expectedFiles.join(', ')}, actual ${actualFiles.join(', ')}`);
    }
    for (const file of expectedFiles.filter((candidate) => actualFiles.includes(candidate))) {
      if (!readFileSync(resolve(expected, file)).equals(readFileSync(resolve(actual, file)))) {
        errors.push(`${file} tiene drift`);
      }
    }
    if (errors.length > 0) {
      errors.forEach((error) => console.error(`GENERATED: ${error}.`));
      process.exitCode = 1;
    } else {
      console.log(`Generated verificado contra generación temporal: ${expectedFiles.length} archivos sin drift.`);
    }
  }
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
