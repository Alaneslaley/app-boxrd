export function can(
  permissions: ReadonlySet<string>,
  required: string | readonly string[],
): boolean {
  const requiredPermissions = typeof required === 'string' ? [required] : required;
  return requiredPermissions.every((permission) => permissions.has(permission));
}
