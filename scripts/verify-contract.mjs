import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

const contractPath = 'contracts/gymbox-openapi.yaml';
const document = parse(readFileSync(contractPath, 'utf8'));
const errors = [];

if (!String(document.openapi ?? '').startsWith('3.')) {
  errors.push('La versión OpenAPI debe ser 3.x.');
}
if (document['x-gymbox-contract-status'] !== 'mock') {
  errors.push('Falta marcar explícitamente el contrato de Fase 0 como mock.');
}
if (document.info?.version !== '0.0.0-mock') {
  errors.push('El contrato mock debe usar la versión 0.0.0-mock.');
}
if (!document.paths || Object.keys(document.paths).length !== 0) {
  errors.push('Fase 0 no debe inventar endpoints definitivos.');
}
if (!document.components?.schemas?.ApiError) {
  errors.push('Falta el error estándar ApiError.');
}
if (!document.servers?.some((server) => server.url === '/api/v1')) {
  errors.push('El contrato debe declarar el prefijo lógico /api/v1.');
}

if (errors.length > 0) {
  for (const error of errors) console.error(`CONTRACT: ${error}`);
  process.exit(1);
}

console.log('Contrato OpenAPI mock válido y explícitamente no oficial.');
