/**
 * Identificador opaco entregado por el backend en `UserSnapshot.permissions`.
 *
 * Un rol nunca debe convertirse implícitamente en un permiso en el cliente.
 */
export type Permission = string;

export type PermissionRequirement =
  | Permission
  | readonly Permission[]
  | Readonly<{ one: Permission }>
  | Readonly<{ any: readonly Permission[] }>
  | Readonly<{ all: readonly Permission[] }>;
