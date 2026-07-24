import type { SessionState } from '@/core/session';

export const authenticatedSessionFixture: SessionState = {
  status: 'authenticated',
  user: {
    id: 'test-instructor',
    displayName: 'Instructor de prueba',
    role: 'INSTRUCTOR',
  },
  permissions: new Set(['phase-zero.protected']),
};
