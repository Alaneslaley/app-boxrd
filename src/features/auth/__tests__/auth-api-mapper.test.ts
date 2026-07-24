import { ApiError } from '@/core/http';
import type {
  AuthTokens as GeneratedAuthTokens,
  UserSnapshot as GeneratedUserSnapshot,
} from '@/generated/api';

import {
  toAuthSession,
  toCurrentUser,
  toLoginRequest,
  toRefreshRequest,
} from '../api/auth-api-mapper';

const validTokens: GeneratedAuthTokens = {
  tokenType: 'Bearer',
  accessToken: 'access-token-test-only',
  expiresIn: 900,
  refreshToken: 'refresh-token-test-only',
};

const validUser: GeneratedUserSnapshot = {
  id: '11111111-1111-4111-8111-111111111111',
  branchId: '22222222-2222-4222-8222-222222222222',
  email: 'instructor@example.test',
  firstName: '  Ada ',
  lastName: ' Lovelace  ',
  status: 'ACTIVE',
  mustChangePassword: false,
  authzVersion: 7,
  roles: ['INSTRUCTOR'],
  permissions: ['students.read'],
  branchName: 'Sucursal de prueba',
};

describe('auth-api-mapper', () => {
  it('normaliza sólo el email y conserva la contraseña exactamente', () => {
    const password = '  Frase Secreta\tCon Espacios  ';

    expect(
      toLoginRequest({
        email: '  USER@Example.COM ',
        password,
      }),
    ).toEqual({
      email: 'user@example.com',
      password,
    });
  });

  it('limita el descriptor opcional del dispositivo sin añadir identificadores', () => {
    const device = 'dispositivo-de-prueba-'.repeat(20);

    const request = toLoginRequest({
      email: 'user@example.com',
      password: 'password-test-only',
      device,
    });

    expect(request.device).toBe(device.slice(0, 200));
    expect(request.device).toHaveLength(200);
  });

  it('rechaza credenciales inválidas con un error seguro', () => {
    expect(() =>
      toLoginRequest({
        email: 'correo-inválido',
        password: 'password-test-only',
      }),
    ).toThrow(
      expect.objectContaining({
        status: 400,
        code: 'INVALID_CREDENTIALS_INPUT',
        message: 'Revisa los datos de acceso.',
      }),
    );
  });

  it('mapea tokens válidos y rechaza una respuesta incompleta', () => {
    const session = toAuthSession(validTokens);

    expect(session).toEqual(validTokens);
    expect(Object.isFrozen(session)).toBe(true);
    expect(() =>
      toAuthSession({
        tokenType: 'Bearer',
        accessToken: 'access-token-test-only',
      }),
    ).toThrow(
      expect.objectContaining({
        status: 502,
        code: 'MALFORMED_AUTH_RESPONSE',
      }),
    );
  });

  it('mapea el usuario, calcula fullName y copia colecciones readonly', () => {
    const user = toCurrentUser(validUser);

    expect(user).toMatchObject({
      firstName: 'Ada',
      lastName: 'Lovelace',
      fullName: 'Ada Lovelace',
      roles: ['INSTRUCTOR'],
      permissions: ['students.read'],
    });
    expect(user.roles).not.toBe(validUser.roles);
    expect(user.permissions).not.toBe(validUser.permissions);
    expect(Object.isFrozen(user)).toBe(true);
    expect(Object.isFrozen(user.roles)).toBe(true);
    expect(Object.isFrozen(user.permissions)).toBe(true);
  });

  it('rechaza snapshots malformados sin propagar sus datos', () => {
    expect(() =>
      toCurrentUser({
        ...validUser,
        id: 'no-es-uuid',
        email: 'sensitive@example.test',
      }),
    ).toThrow(
      expect.objectContaining({
        status: 502,
        code: 'MALFORMED_AUTH_RESPONSE',
        message:
          'El servicio de autenticación devolvió una respuesta no válida.',
      }),
    );
  });

  it('crea el body de refresh y falla si el token no existe', () => {
    expect(toRefreshRequest('refresh-token-test-only')).toEqual({
      refreshToken: 'refresh-token-test-only',
    });

    expect(() => toRefreshRequest('')).toThrow(ApiError);
    expect(() => toRefreshRequest('')).toThrow(
      expect.objectContaining({
        status: 401,
        code: 'REFRESH_TOKEN_MISSING',
      }),
    );
  });
});
