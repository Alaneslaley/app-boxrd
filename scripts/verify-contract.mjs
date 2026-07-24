import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const contractPath = resolve(projectRoot, 'contracts/openapi/gymbox-openapi.json');
const errors = [];
const warnings = [];

const isRecord = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getLocalReference = (document, reference) => {
  if (!reference.startsWith('#/')) return undefined;

  return reference
    .slice(2)
    .split('/')
    .map((token) => token.replaceAll('~1', '/').replaceAll('~0', '~'))
    .reduce(
      (current, token) =>
        isRecord(current) || Array.isArray(current) ? current[token] : undefined,
      document,
    );
};

let document;

try {
  document = JSON.parse(readFileSync(contractPath, 'utf8'));
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`CONTRACT ERROR: JSON inválido o ilegible: ${message}`);
  process.exit(1);
}

if (!isRecord(document)) {
  errors.push('La raíz del contrato debe ser un objeto JSON.');
}

if (document.openapi !== '3.1.0') {
  errors.push(`La versión debe ser OpenAPI 3.1.0; se recibió ${String(document.openapi)}.`);
}

if (!isRecord(document.info) || typeof document.info.title !== 'string') {
  errors.push('Falta info.title.');
}

if (!isRecord(document.info) || typeof document.info.version !== 'string') {
  errors.push('Falta info.version.');
}

if (!isRecord(document.paths)) {
  errors.push('Falta el objeto paths.');
}

if (!isRecord(document.components) || !isRecord(document.components.schemas)) {
  errors.push('Falta components.schemas.');
}

if (!Array.isArray(document.servers) || document.servers.length === 0) {
  errors.push('El contrato debe declarar al menos un servidor HTTPS.');
} else {
  for (const [index, server] of document.servers.entries()) {
    try {
      const url = new URL(server?.url);
      if (url.protocol !== 'https:') {
        errors.push(`/servers/${index}/url debe usar HTTPS.`);
      }
    } catch {
      errors.push(`/servers/${index}/url debe ser una URL absoluta válida.`);
    }
  }
}

let localReferenceCount = 0;

const visitReferences = (value, pointer = '') => {
  if (Array.isArray(value)) {
    value.forEach((item, index) => visitReferences(item, `${pointer}/${index}`));
    return;
  }

  if (!isRecord(value)) return;

  if (typeof value.$ref === 'string' && value.$ref.startsWith('#/')) {
    localReferenceCount += 1;
    if (getLocalReference(document, value.$ref) === undefined) {
      errors.push(`${pointer}/$ref no se puede resolver: ${value.$ref}.`);
    }
  }

  for (const [key, child] of Object.entries(value)) {
    const escapedKey = key.replaceAll('~', '~0').replaceAll('/', '~1');
    visitReferences(child, `${pointer}/${escapedKey}`);
  }
};

visitReferences(document);

const operationsById = new Map();
const httpMethods = new Set(['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']);

for (const [path, pathItem] of Object.entries(document.paths ?? {})) {
  if (!isRecord(pathItem)) continue;

  for (const [method, operation] of Object.entries(pathItem)) {
    if (!httpMethods.has(method) || !isRecord(operation)) continue;

    if (!isRecord(operation.responses) || Object.keys(operation.responses).length === 0) {
      errors.push(`${method.toUpperCase()} ${path} no declara responses.`);
    }

    if (typeof operation.operationId === 'string') {
      const previous = operationsById.get(operation.operationId);
      if (previous) {
        errors.push(`operationId duplicado "${operation.operationId}": ${previous} y ${method.toUpperCase()} ${path}.`);
      } else {
        operationsById.set(operation.operationId, `${method.toUpperCase()} ${path}`);
      }
    }
  }
}

const getOperation = (path, method) => document.paths?.[path]?.[method];

const getResponseSchema = (operation, status) => {
  const content = operation?.responses?.[status]?.content;
  if (!isRecord(content)) return undefined;

  return Object.values(content)
    .map((mediaType) => mediaType?.schema)
    .find((schema) => schema !== undefined);
};

const expectedOperations = [
  {
    method: 'post',
    operationId: 'login',
    path: '/api/v1/auth/login',
    requestRef: '#/components/schemas/LoginRequest',
    responseRef: '#/components/schemas/AuthTokens',
    status: '200',
  },
  {
    method: 'post',
    operationId: 'refresh',
    path: '/api/v1/auth/refresh',
    requestRef: '#/components/schemas/RefreshRequest',
    responseRef: '#/components/schemas/AuthTokens',
    status: '200',
  },
  {
    method: 'post',
    operationId: 'logout',
    path: '/api/v1/auth/logout',
    requestRef: '#/components/schemas/RefreshRequest',
    status: '204',
  },
  {
    method: 'get',
    operationId: 'me',
    path: '/api/v1/auth/me',
    responseRef: '#/components/schemas/UserSnapshot',
    status: '200',
  },
];

for (const expected of expectedOperations) {
  const operation = getOperation(expected.path, expected.method);
  const label = `${expected.method.toUpperCase()} ${expected.path}`;

  if (!isRecord(operation)) {
    errors.push(`Falta ${label}.`);
    continue;
  }

  if (operation.operationId !== expected.operationId) {
    errors.push(`${label} debe usar operationId "${expected.operationId}".`);
  }

  if (expected.requestRef) {
    const requestBody = operation.requestBody;
    const requestSchema = requestBody?.content?.['application/json']?.schema;
    if (requestBody?.required !== true) {
      errors.push(`${label} debe marcar requestBody como requerido.`);
    }
    if (requestSchema?.$ref !== expected.requestRef) {
      errors.push(`${label} debe usar ${expected.requestRef} como cuerpo application/json.`);
    }
  }

  const response = operation.responses?.[expected.status];
  if (!isRecord(response)) {
    errors.push(`${label} debe declarar la respuesta ${expected.status}.`);
    continue;
  }

  if (expected.responseRef) {
    const responseSchema = getResponseSchema(operation, expected.status);
    if (responseSchema?.$ref !== expected.responseRef) {
      errors.push(`${label} ${expected.status} debe usar ${expected.responseRef}.`);
    }
  }
}

const schemaRequirements = {
  AuthTokens: {
    accessToken: { type: 'string' },
    expiresIn: { format: 'int64', type: 'integer' },
    refreshToken: { type: 'string' },
    tokenType: { type: 'string' },
  },
  LoginRequest: {
    device: { maxLength: 200, type: 'string' },
    email: { format: 'email', type: 'string' },
    password: { type: 'string' },
  },
  RefreshRequest: {
    refreshToken: { type: 'string' },
  },
  UserSnapshot: {
    authzVersion: { format: 'int64', type: 'integer' },
    branchId: { format: 'uuid', type: 'string' },
    branchName: { type: 'string' },
    email: { type: 'string' },
    firstName: { type: 'string' },
    id: { format: 'uuid', type: 'string' },
    lastName: { type: 'string' },
    mustChangePassword: { type: 'boolean' },
    permissions: { itemsType: 'string', type: 'array' },
    roles: { itemsType: 'string', type: 'array' },
    status: { type: 'string' },
  },
};

for (const [schemaName, properties] of Object.entries(schemaRequirements)) {
  const schema = document.components?.schemas?.[schemaName];
  if (!isRecord(schema) || schema.type !== 'object' || !isRecord(schema.properties)) {
    errors.push(`Falta el schema objeto ${schemaName}.`);
    continue;
  }

  for (const [propertyName, expected] of Object.entries(properties)) {
    const property = schema.properties[propertyName];
    const label = `#/components/schemas/${schemaName}/properties/${propertyName}`;

    if (!isRecord(property)) {
      errors.push(`Falta ${label}.`);
      continue;
    }

    if (property.type !== expected.type) {
      errors.push(`${label} debe ser ${expected.type}.`);
    }
    if (expected.format && property.format !== expected.format) {
      errors.push(`${label} debe usar format ${expected.format}.`);
    }
    if (expected.maxLength && property.maxLength !== expected.maxLength) {
      errors.push(`${label} debe usar maxLength ${expected.maxLength}.`);
    }
    if (expected.itemsType && property.items?.type !== expected.itemsType) {
      errors.push(`${label}/items debe ser ${expected.itemsType}.`);
    }
  }
}

const requireFields = (schemaName, fieldNames, severity = 'error') => {
  const required = document.components?.schemas?.[schemaName]?.required;
  const missing = fieldNames.filter((fieldName) => !required?.includes(fieldName));
  if (missing.length === 0) return;

  const message = `${schemaName} no marca como requeridos: ${missing.join(', ')}.`;
  (severity === 'warning' ? warnings : errors).push(message);
};

requireFields('LoginRequest', ['email', 'password']);
requireFields('RefreshRequest', ['refreshToken']);
requireFields('AuthTokens', Object.keys(schemaRequirements.AuthTokens), 'warning');
requireFields('UserSnapshot', Object.keys(schemaRequirements.UserSnapshot), 'warning');

const bearerAuth = document.components?.securitySchemes?.bearerAuth;
if (
  !isRecord(bearerAuth) ||
  bearerAuth.type !== 'http' ||
  bearerAuth.scheme?.toLowerCase() !== 'bearer' ||
  bearerAuth.bearerFormat !== 'JWT'
) {
  errors.push('components.securitySchemes.bearerAuth debe ser HTTP bearer con formato JWT.');
}

const hasBearerRequirement = (requirements) =>
  Array.isArray(requirements) &&
  requirements.some(
    (requirement) => isRecord(requirement) && Array.isArray(requirement.bearerAuth),
  );

const effectiveSecurity = (operation) =>
  Object.hasOwn(operation ?? {}, 'security') ? operation.security : document.security;

if (!hasBearerRequirement(document.security)) {
  warnings.push('bearerAuth existe, pero no hay un security requirement global.');
}

for (const path of ['/api/v1/auth/me', '/api/v1/auth/logout']) {
  const operation = getOperation(path, path.endsWith('/me') ? 'get' : 'post');
  if (!hasBearerRequirement(effectiveSecurity(operation))) {
    warnings.push(`${path} no declara que requiera bearerAuth.`);
  }
}

for (const path of ['/api/v1/auth/login', '/api/v1/auth/refresh']) {
  const operation = getOperation(path, 'post');
  if (!Array.isArray(operation?.security) || operation.security.length !== 0) {
    warnings.push(`${path} es anónimo sólo por omisión; no declara security: [].`);
  }
}

const apiError = document.components?.schemas?.ApiError;
if (!isRecord(apiError)) {
  warnings.push('Falta components.schemas.ApiError.');
} else {
  requireFields('ApiError', ['code', 'message', 'timestamp', 'traceId'], 'warning');
  if (!isRecord(apiError.properties?.traceId)) {
    warnings.push('ApiError no declara traceId.');
  }
}

const authOperations = expectedOperations
  .map(({ method, path }) => getOperation(path, method))
  .filter(isRecord);
const authResponseCodes = new Set(
  authOperations.flatMap((operation) => Object.keys(operation.responses ?? {})),
);

for (const status of ['400', '401', '403', '409']) {
  if (!authResponseCodes.has(status)) {
    warnings.push(`Los endpoints auth no documentan respuestas ${status}.`);
  }
}

if (![...authResponseCodes].some((status) => /^5\d\d$/.test(status) || status === 'default')) {
  warnings.push('Los endpoints auth no documentan respuestas 5xx ni default.');
}

if (!Object.keys(document.paths ?? {}).some((path) => /password/i.test(path))) {
  warnings.push('mustChangePassword existe, pero no hay un endpoint de cambio de contraseña.');
}

if (errors.length > 0) {
  for (const error of errors) console.error(`CONTRACT ERROR: ${error}`);
  process.exit(1);
}

for (const warning of warnings) console.warn(`CONTRACT WARNING: ${warning}`);

console.log(
  `Contrato OpenAPI 3.1 oficial verificado: ${expectedOperations.length} endpoints auth, ` +
    `${Object.keys(schemaRequirements).length} schemas críticos y ${localReferenceCount} referencias locales. ` +
    `${warnings.length} advertencias contractuales pendientes del backend.`,
);
