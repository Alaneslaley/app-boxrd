import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { parseAllDocuments } from 'yaml';

const directory = resolve('e2e/maestro');
const files = readdirSync(directory)
  .filter((file) => file.endsWith('.yaml'))
  .sort();
const errors = [];

function referencedFlows(value, references = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => referencedFlows(item, references));
  } else if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      if (key === 'runFlow') {
        if (typeof nested === 'string') references.push(nested);
        else if (nested && typeof nested === 'object' && typeof nested.file === 'string') {
          references.push(nested.file);
        }
      }
      referencedFlows(nested, references);
    }
  }
  return references;
}

for (const file of files) {
  const path = resolve(directory, file);
  const source = readFileSync(path, 'utf8');
  const documents = parseAllDocuments(source);
  for (const document of documents) {
    for (const error of document.errors) errors.push(`${file}: ${error.message}`);
  }
  const config = documents[0]?.toJS();
  const steps = documents[1]?.toJS();
  if (config?.appId !== 'mx.com.gymbox.mobile') errors.push(`${file}: appId inválido.`);
  if (!config?.name || typeof config.name !== 'string') errors.push(`${file}: falta name.`);
  if (!Array.isArray(steps) || steps.length === 0) errors.push(`${file}: no contiene pasos.`);
  if (/\b(?:sleep|delay)\s*:/i.test(source)) errors.push(`${file}: contiene espera arbitraria.`);
  if (/(?:Bearer\s+[A-Za-z0-9._-]+|sk-[A-Za-z0-9_-]{12,}|eyJ[A-Za-z0-9_-]{10,}\.)/.test(source)) {
    errors.push(`${file}: posible secreto embebido.`);
  }
  for (const reference of referencedFlows(steps)) {
    const target = resolve(dirname(path), reference);
    if (!existsSync(target)) errors.push(`${file}: runFlow inexistente ${reference}.`);
  }
}

const sprint4 = files.filter((file) => file.startsWith('sprint-4-'));
if (sprint4.length !== 8) {
  errors.push(`Sprint 4 debe contener 8 flows ejecutables; encontrados ${sprint4.length}.`);
}

if (errors.length > 0) {
  errors.forEach((error) => console.error(`MAESTRO: ${error}`));
  process.exit(1);
}

console.log(`${files.length} YAML Maestro válidos; ${sprint4.length} flows Sprint 4 preparados.`);
console.log(`Validación estática solamente: ${basename(directory)} no fue ejecutado en dispositivo.`);
