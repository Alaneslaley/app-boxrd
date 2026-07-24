import { can, type Permission } from '@/core/permissions';

const granted = new Set<Permission>(['members.read', 'members.update']);

describe('can', () => {
  it('evalúa un permiso individual', () => {
    expect(can(granted, 'members.read')).toBe(true);
    expect(can(granted, 'members.delete')).toBe(false);
    expect(can(granted, { one: 'members.update' })).toBe(true);
  });

  it('permite cuando existe cualquiera de los permisos solicitados', () => {
    expect(
      can(granted, { any: ['members.delete', 'members.update'] }),
    ).toBe(true);
    expect(
      can(granted, { any: ['members.delete', 'payments.refund'] }),
    ).toBe(false);
  });

  it('exige todos los permisos cuando se usa all', () => {
    expect(
      can(granted, { all: ['members.read', 'members.update'] }),
    ).toBe(true);
    expect(
      can(granted, { all: ['members.read', 'members.delete'] }),
    ).toBe(false);
  });

  it('conserva el arreglo de Fase 0 como alias de all', () => {
    expect(can(granted, ['members.read', 'members.update'])).toBe(true);
    expect(can(granted, ['members.read', 'members.delete'])).toBe(false);
  });

  it('falla de forma cerrada ante grupos vacíos', () => {
    expect(can(granted, { any: [] })).toBe(false);
    expect(can(granted, { all: [] })).toBe(false);
    expect(can(granted, [])).toBe(false);
  });
});
