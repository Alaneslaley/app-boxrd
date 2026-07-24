import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';

const root = resolve('src');
const graph = new Map();

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return walk(path);
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

function resolveModule(from, specifier) {
  if (!(specifier.startsWith('@/') || specifier.startsWith('.'))) return null;
  const base = specifier.startsWith('@/')
    ? resolve(root, specifier.slice(2))
    : resolve(dirname(from), specifier);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    resolve(base, 'index.ts'),
    resolve(base, 'index.tsx'),
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

for (const file of walk(root)) {
  const source = readFileSync(file, 'utf8');
  const dependencies = [];
  const pattern = /(?:import|export)\s+(?:type\s+)?(?:[^'"]*?\sfrom\s*)?['"]([^'"]+)['"]/g;
  for (const match of source.matchAll(pattern)) {
    const dependency = resolveModule(file, match[1]);
    if (dependency) dependencies.push(dependency);
  }
  graph.set(file, dependencies);
}

const visiting = new Set();
const visited = new Set();
const stack = [];
const cycles = [];

function visit(node) {
  if (visiting.has(node)) {
    const start = stack.indexOf(node);
    cycles.push([...stack.slice(start), node]);
    return;
  }
  if (visited.has(node)) return;

  visiting.add(node);
  stack.push(node);
  for (const dependency of graph.get(node) ?? []) visit(dependency);
  stack.pop();
  visiting.delete(node);
  visited.add(node);
}

for (const node of graph.keys()) visit(node);

if (cycles.length > 0) {
  for (const cycle of cycles) {
    const readable = cycle
      .map((path) => relative(root, path).split(sep).join('/'))
      .join(' -> ');
    console.error(`CYCLE: ${readable}`);
  }
  process.exit(1);
}

console.log('No se detectaron ciclos en src/.');
