import {
  sessionReducer,
  type SessionAction,
} from '../SessionReducer';
import type { CurrentUser, SessionState } from '../SessionState';

const user: CurrentUser = {
  id: 'user-1',
  branchId: 'branch-1',
  email: 'instructor@example.test',
  firstName: 'Ada',
  lastName: 'Lovelace',
  fullName: 'Ada Lovelace',
  branchName: 'Centro',
  status: 'ACTIVE',
  mustChangePassword: false,
  authzVersion: 1,
  roles: ['INSTRUCTOR'],
  permissions: ['students.read'],
};

describe('sessionReducer', () => {
  it.each<SessionState>([
    { status: 'booting' },
    { status: 'anonymous' },
    {
      status: 'authenticated',
      user,
      permissions: new Set(user.permissions),
      experience: 'internal',
    },
  ])('BOOT siempre restablece el estado booting', (state) => {
    expect(sessionReducer(state, { type: 'BOOT' })).toEqual({
      status: 'booting',
    });
  });

  it.each<Exclude<SessionState, { status: 'booting' }>>([
    { status: 'anonymous' },
    {
      status: 'anonymous',
      notice: {
        message: 'No fue posible validar la sesión.',
        traceId: 'trace-1',
        retryable: true,
      },
    },
    {
      status: 'authenticated',
      user,
      permissions: new Set(user.permissions),
      experience: 'internal',
    },
  ])('RESOLVE adopta exactamente el estado resuelto', (resolvedState) => {
    const action: SessionAction = {
      type: 'RESOLVE',
      state: resolvedState,
    };

    expect(sessionReducer({ status: 'booting' }, action)).toBe(resolvedState);
  });
});
