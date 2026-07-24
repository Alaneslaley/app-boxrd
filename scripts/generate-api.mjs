import { mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const input = './contracts/gymbox-openapi.yaml';
const output = './src/generated/api';

mkdirSync(output, { recursive: true });

const executable = process.execPath;
const result = spawnSync(
  executable,
  [
    'node_modules/@hey-api/openapi-ts/bin/run.js',
    '--input',
    input,
    '--output',
    output,
    '--plugins',
    '@hey-api/typescript',
    '--no-log-file',
  ],
  { stdio: 'inherit' },
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
