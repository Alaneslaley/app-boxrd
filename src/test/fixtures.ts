import type { SessionState } from '@/core/session';

export const authenticatedSessionFixture: SessionState = {
  status: 'authenticated',
  user: {
    id: '11111111-1111-4111-8111-111111111111',
    branchId: '22222222-2222-4222-8222-222222222222',
    email: 'instructor@example.test',
    firstName: 'Instructor',
    lastName: 'Prueba',
    fullName: 'Instructor Prueba',
    branchName: 'Sucursal de prueba',
    status: 'ACTIVE',
    mustChangePassword: false,
    authzVersion: 1,
    roles: ['INSTRUCTOR'],
    permissions: ['phase-zero.protected'],
  },
  permissions: new Set(['phase-zero.protected']),
  experience: 'internal',
};
