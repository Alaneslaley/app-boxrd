import {
  FakeHttpClient,
  type HttpResponse,
} from '@/core/http';
import type {
  AuthTokens as GeneratedAuthTokens,
  UserSnapshot as GeneratedUserSnapshot,
} from '@/generated/api';

import { AuthRemoteGateway } from '../api/AuthRemoteGateway';

const tokens: GeneratedAuthTokens = {
  tokenType: 'Bearer',
  accessToken: 'access-token-test-only',
  expiresIn: 900,
  refreshToken: 'refresh-token-test-only',
};

const userSnapshot: GeneratedUserSnapshot = {
  id: '11111111-1111-4111-8111-111111111111',
  branchId: '22222222-2222-4222-8222-222222222222',
  email: 'user@example.test',
  firstName: 'Usuario',
  lastName: 'Prueba',
  status: 'ACTIVE',
  mustChangePassword: false,
  authzVersion: 1,
  roles: ['INSTRUCTOR'],
  permissions: ['students.read'],
  branchName: 'Sucursal de prueba',
};

function response<T>(status: number, data: T): HttpResponse<T> {
  return {
    status,
    headers: new Headers(),
    data,
  };
}

describe('AuthRemoteGateway', () => {
  it('envía login anónimo, sin refresh, y normaliza el DTO', async () => {
    const httpClient = new FakeHttpClient();
    httpClient.enqueue(response(200, tokens));
    const gateway = new AuthRemoteGateway(httpClient);

    await expect(
      gateway.login({
        email: '  USER@Example.COM ',
        password: ' password-test-only ',
      }),
    ).resolves.toEqual(tokens);

    expect(httpClient.requests).toEqual([
      {
        method: 'POST',
        path: '/auth/login',
        body: {
          email: 'user@example.com',
          password: ' password-test-only ',
        },
        requiresAuth: false,
        allowRefresh: false,
      },
    ]);
  });

  it('envía refresh anónimo y bloquea refresh recursivo', async () => {
    const httpClient = new FakeHttpClient();
    httpClient.enqueue(response(200, tokens));
    const gateway = new AuthRemoteGateway(httpClient);

    await gateway.refresh('refresh-token-test-only');

    expect(httpClient.requests).toEqual([
      {
        method: 'POST',
        path: '/auth/refresh',
        body: { refreshToken: 'refresh-token-test-only' },
        requiresAuth: false,
        allowRefresh: false,
      },
    ]);
  });

  it('envía logout autenticado sin permitir refresh', async () => {
    const httpClient = new FakeHttpClient();
    httpClient.enqueue(response<void>(204, undefined));
    const gateway = new AuthRemoteGateway(httpClient);

    await expect(
      gateway.logout('refresh-token-test-only'),
    ).resolves.toBeUndefined();

    expect(httpClient.requests).toEqual([
      {
        method: 'POST',
        path: '/auth/logout',
        body: { refreshToken: 'refresh-token-test-only' },
        requiresAuth: true,
        allowRefresh: false,
      },
    ]);
  });

  it('consulta me con bearer y permite el refresh coordinado', async () => {
    const httpClient = new FakeHttpClient();
    httpClient.enqueue(response(200, userSnapshot));
    const gateway = new AuthRemoteGateway(httpClient);

    await expect(gateway.me()).resolves.toMatchObject({
      fullName: 'Usuario Prueba',
      roles: ['INSTRUCTOR'],
      permissions: ['students.read'],
    });

    expect(httpClient.requests).toEqual([
      {
        method: 'GET',
        path: '/auth/me',
        requiresAuth: true,
        allowRefresh: true,
      },
    ]);
  });
});
