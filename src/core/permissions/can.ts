import type { Permission, PermissionRequirement } from './Permission';

export function can(
  permissions: ReadonlySet<Permission>,
  required: PermissionRequirement,
): boolean {
  if (typeof required === 'string') return permissions.has(required);

  // Compatibilidad con la API de Fase 0: un arreglo simple significa "todos".
  if (isPermissionList(required)) return hasAll(permissions, required);

  if ('one' in required) return permissions.has(required.one);
  if ('any' in required) return hasAny(permissions, required.any);
  return hasAll(permissions, required.all);
}

function isPermissionList(
  required: PermissionRequirement,
): required is readonly Permission[] {
  return Array.isArray(required);
}

function hasAny(
  permissions: ReadonlySet<Permission>,
  required: readonly Permission[],
): boolean {
  return required.length > 0 && required.some((permission) => permissions.has(permission));
}

function hasAll(
  permissions: ReadonlySet<Permission>,
  required: readonly Permission[],
): boolean {
  return required.length > 0 && required.every((permission) => permissions.has(permission));
}
