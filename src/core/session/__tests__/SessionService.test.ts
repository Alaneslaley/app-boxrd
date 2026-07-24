import { ApiError } from '../../http/ApiError';
import { RefreshCoordinator } from '../../http/RefreshCoordinator';
import type { Logger } from '../../observability/Logger';
import type {
  SessionCredentials,
  SessionGateway,
  SessionTokens,
} from '../SessionGateway';
import {
  SessionService,
  StaleSessionOperationError,
  type QuerySessionCache,
} from '../SessionService';
import type { CurrentUser } from '../SessionState';
import type { TokenVault } from '../TokenVault';

const OLD_REFRESH_TOKEN = 'refresh-old';

const DEFAULT_TOKENS: SessionTokens = {
  accessToken: 'access-new',
  refreshToken: 'refresh-rotated',
  tokenType: 'Bearer',
  expiresIn: 900,
};

const DEFAULT_CREDENTIALS: SessionCredentials = {
  email: 'instructor@example.test',
  password: ' password-with-spaces ',
  device: 'android · 0.1.0 · staging',
};

function currentUser(overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
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
    ...overrides,
  };
}

function apiError(
  status: number,
  code: string,
  message: string,
  traceId = 'trace-session',
): ApiError {
  return new ApiError(status, code, message, undefined, traceId);
}

function createDeferred<T>(): {
  promise: Promise<T>;
  resolve(value: T): void;
  reject(reason: unknown): void;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function waitUntilCalled(mock: {
  readonly mock: { readonly calls: readonly unknown[] };
}): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (mock.mock.calls.length > 0) return;
    await Promise.resolve();
  }
  throw new Error('El mock no fue invocado dentro del ciclo esperado.');
}

type Harness = ReturnType<typeof createHarness>;

function createHarness(options: {
  initialRefreshToken?: string | null;
  user?: CurrentUser;
  tokens?: SessionTokens;
} = {}) {
  let storedRefreshToken =
    options.initialRefreshToken === undefined
      ? OLD_REFRESH_TOKEN
      : options.initialRefreshToken;
  const tokens = options.tokens ?? DEFAULT_TOKENS;
  const user = options.user ?? currentUser();

  const gateway: jest.Mocked<SessionGateway> = {
    login: jest.fn(async (_credentials: SessionCredentials) => tokens),
    refresh: jest.fn(async (_refreshToken: string) => tokens),
    logout: jest.fn(async (_refreshToken: string) => undefined),
    me: jest.fn(async () => user),
  };

  const tokenVault: jest.Mocked<TokenVault> = {
    getRefreshToken: jest.fn(async () => storedRefreshToken),
    setRefreshToken: jest.fn(async (token) => {
      storedRefreshToken = token;
    }),
    clear: jest.fn(async () => {
      storedRefreshToken = null;
    }),
  };

  const queryCache: jest.Mocked<QuerySessionCache> = {
    cancelQueries: jest.fn(async () => undefined),
    clear: jest.fn(),
  };

  const refreshAction = jest.fn(async () => undefined);
  const refreshCoordinator = new RefreshCoordinator(refreshAction);
  const invalidate = jest.spyOn(refreshCoordinator, 'invalidate');

  const logger: jest.Mocked<Logger> = {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  const service = new SessionService({
    gateway,
    tokenVault,
    queryCache,
    refreshCoordinator,
    logger,
  });

  return {
    service,
    gateway,
    tokenVault,
    queryCache,
    refreshCoordinator,
    invalidate,
    logger,
    storedRefreshToken: () => storedRefreshToken,
  };
}

async function establishAuthenticatedSession(harness: Harness): Promise<void> {
  const state = await harness.service.bootstrap();
  expect(state.status).toBe('authenticated');

  harness.gateway.logout.mockClear();
  harness.gateway.refresh.mockClear();
  harness.gateway.me.mockClear();
  harness.tokenVault.getRefreshToken.mockClear();
  harness.tokenVault.setRefreshToken.mockClear();
  harness.tokenVault.clear.mockClear();
  harness.queryCache.cancelQueries.mockClear();
  harness.queryCache.clear.mockClear();
  harness.invalidate.mockClear();
  harness.logger.warn.mockClear();
  harness.logger.error.mockClear();
}

describe('SessionService.bootstrap', () => {
  it('resuelve anonymous sin llamar al backend cuando no existe refresh token', async () => {
    const harness = createHarness({ initialRefreshToken: null });

    await expect(harness.service.bootstrap()).resolves.toEqual({
      status: 'anonymous',
    });

    expect(harness.gateway.refresh).not.toHaveBeenCalled();
    expect(harness.gateway.me).not.toHaveBeenCalled();
    expect(harness.tokenVault.setRefreshToken).not.toHaveBeenCalled();
    expect(harness.service.getAccessToken()).toBeUndefined();
  });

  it('rota refresh, conserva access sólo en memoria y consulta me después de persistir', async () => {
    const harness = createHarness();

    const state = await harness.service.bootstrap();

    expect(harness.gateway.refresh).toHaveBeenCalledWith(OLD_REFRESH_TOKEN);
    expect(harness.tokenVault.setRefreshToken).toHaveBeenCalledWith(
      DEFAULT_TOKENS.refreshToken,
    );
    expect(harness.storedRefreshToken()).toBe(DEFAULT_TOKENS.refreshToken);
    expect(harness.service.getAccessToken()).toBe(DEFAULT_TOKENS.accessToken);
    expect(harness.gateway.me).toHaveBeenCalledTimes(1);

    const storageOrder =
      harness.tokenVault.setRefreshToken.mock.invocationCallOrder[0]!;
    const meOrder = harness.gateway.me.mock.invocationCallOrder[0]!;
    expect(storageOrder).toBeLessThan(meOrder);

    expect(state).toEqual({
      status: 'authenticated',
      user: currentUser(),
      permissions: new Set(['students.read']),
      experience: 'internal',
    });
    expect(state).not.toHaveProperty('accessToken');
    expect(state).not.toHaveProperty('refreshToken');
  });

  it.each([
    [
      401,
      'REFRESH_REVOKED',
      'La sesión expiró. Inicia sesión nuevamente.',
    ],
    [
      403,
      'REFRESH_FORBIDDEN',
      'No tienes permiso para restaurar la sesión.',
    ],
  ])(
    'limpia sesión y caché cuando refresh responde %i',
    async (status, code, message) => {
      const harness = createHarness();
      harness.gateway.refresh.mockRejectedValueOnce(
        apiError(status, code, message),
      );

      const state = await harness.service.bootstrap();

      expect(state).toEqual({
        status: 'anonymous',
        notice: {
          message,
          traceId: 'trace-session',
          retryable: false,
        },
      });
      expect(harness.tokenVault.clear).toHaveBeenCalledTimes(1);
      expect(harness.storedRefreshToken()).toBeNull();
      expect(harness.queryCache.cancelQueries).toHaveBeenCalledTimes(1);
      expect(harness.queryCache.clear).toHaveBeenCalledTimes(1);
      expect(harness.gateway.me).not.toHaveBeenCalled();
      expect(harness.service.getAccessToken()).toBeUndefined();
    },
  );

  it('preserva el refresh token ante un error temporal de red', async () => {
    const harness = createHarness();
    harness.gateway.refresh.mockRejectedValueOnce(
      apiError(
        0,
        'NETWORK_ERROR',
        'No fue posible conectar con el servicio.',
        'trace-network',
      ),
    );

    const state = await harness.service.bootstrap();

    expect(state).toEqual({
      status: 'anonymous',
      notice: {
        message: 'No fue posible conectar con el servicio.',
        traceId: 'trace-network',
        retryable: true,
      },
    });
    expect(harness.tokenVault.clear).not.toHaveBeenCalled();
    expect(harness.storedRefreshToken()).toBe(OLD_REFRESH_TOKEN);
    expect(harness.queryCache.clear).toHaveBeenCalledTimes(1);
    expect(harness.service.getAccessToken()).toBeUndefined();
  });

  it.each([
    [401, 'ME_UNAUTHORIZED', 'La sesión ya no es válida.'],
    [403, 'ME_FORBIDDEN', 'No tienes permiso para acceder.'],
  ])(
    'revierte tokens rotados cuando me responde %i',
    async (status, code, message) => {
      const harness = createHarness();
      harness.gateway.me.mockRejectedValueOnce(apiError(status, code, message));

      const state = await harness.service.bootstrap();

      expect(state.status).toBe('anonymous');
      expect(harness.tokenVault.setRefreshToken).toHaveBeenCalledWith(
        DEFAULT_TOKENS.refreshToken,
      );
      expect(harness.tokenVault.clear).toHaveBeenCalledTimes(1);
      expect(harness.storedRefreshToken()).toBeNull();
      expect(harness.service.getAccessToken()).toBeUndefined();
      expect(harness.queryCache.clear).toHaveBeenCalledTimes(1);
    },
  );

  it('conserva el refresh rotado si me falla por red, pero no autentica la sesión', async () => {
    const harness = createHarness();
    harness.gateway.me.mockRejectedValueOnce(
      apiError(0, 'NETWORK_ERROR', 'Sin conexión.', 'trace-me-network'),
    );

    const state = await harness.service.bootstrap();

    expect(state).toEqual({
      status: 'anonymous',
      notice: {
        message: 'Sin conexión.',
        traceId: 'trace-me-network',
        retryable: true,
      },
    });
    expect(harness.storedRefreshToken()).toBe(DEFAULT_TOKENS.refreshToken);
    expect(harness.tokenVault.clear).not.toHaveBeenCalled();
    expect(harness.service.getAccessToken()).toBeUndefined();
  });

  it('rechaza un usuario inactivo y elimina toda la sesión local', async () => {
    const harness = createHarness({
      user: currentUser({ status: 'SUSPENDED' }),
    });

    const state = await harness.service.bootstrap();

    expect(state).toEqual({
      status: 'anonymous',
      notice: {
        message: 'La cuenta no está activa. Contacta a administración.',
        retryable: false,
      },
    });
    expect(harness.tokenVault.clear).toHaveBeenCalledTimes(1);
    expect(harness.storedRefreshToken()).toBeNull();
    expect(harness.service.getAccessToken()).toBeUndefined();
  });

  it('recupera anonymous y limpia caché cuando falla la lectura de SecureStore', async () => {
    const harness = createHarness();
    harness.tokenVault.getRefreshToken.mockRejectedValueOnce(
      new Error('SecureStore unavailable'),
    );

    const state = await harness.service.bootstrap();

    expect(state).toEqual({
      status: 'anonymous',
      notice: {
        message: 'No fue posible validar la sesión. Inténtalo nuevamente.',
        retryable: true,
      },
    });
    expect(harness.gateway.refresh).not.toHaveBeenCalled();
    expect(harness.tokenVault.clear).toHaveBeenCalledTimes(1);
    expect(harness.queryCache.cancelQueries).toHaveBeenCalledTimes(1);
    expect(harness.queryCache.clear).toHaveBeenCalledTimes(1);
  });

  it('revierte la sesión si SecureStore falla al persistir la rotación', async () => {
    const harness = createHarness();
    harness.tokenVault.setRefreshToken.mockRejectedValueOnce(
      new Error('SecureStore write failed'),
    );

    const state = await harness.service.bootstrap();

    expect(state.status).toBe('anonymous');
    expect(harness.gateway.me).not.toHaveBeenCalled();
    expect(harness.tokenVault.clear).toHaveBeenCalledTimes(1);
    expect(harness.storedRefreshToken()).toBeNull();
    expect(harness.service.getAccessToken()).toBeUndefined();
    expect(harness.queryCache.clear).toHaveBeenCalledTimes(1);
  });

  it.each([
    [
      currentUser({ mustChangePassword: true }),
      'must-change-password',
    ],
    [
      currentUser({
        roles: ['ALUMNO'],
        permissions: [],
      }),
      'student',
    ],
    [
      currentUser({
        roles: ['INVITADO'],
        permissions: ['students.read'],
      }),
      'access-denied',
    ],
  ] as const)(
    'selecciona la experiencia controlada %s',
    async (user, experience) => {
      const harness = createHarness({ user });

      const state = await harness.service.bootstrap();

      expect(state).toMatchObject({
        status: 'authenticated',
        experience,
      });
    },
  );
});

describe('SessionService.signIn y refreshAccessToken', () => {
  it('inicia sesión, respeta las credenciales y guarda sólo el refresh token', async () => {
    const harness = createHarness({ initialRefreshToken: null });

    const state = await harness.service.signIn(DEFAULT_CREDENTIALS);

    expect(harness.gateway.login).toHaveBeenCalledWith(DEFAULT_CREDENTIALS);
    expect(harness.tokenVault.setRefreshToken).toHaveBeenCalledWith(
      DEFAULT_TOKENS.refreshToken,
    );
    expect(harness.gateway.me).toHaveBeenCalledTimes(1);
    expect(harness.service.getAccessToken()).toBe(DEFAULT_TOKENS.accessToken);
    expect(state).toMatchObject({
      status: 'authenticated',
      experience: 'internal',
    });
  });

  it('revoca best-effort y limpia localmente si me falla después del login', async () => {
    const harness = createHarness({ initialRefreshToken: null });
    const meError = apiError(
      500,
      'ME_FAILED',
      'No fue posible completar el acceso.',
    );
    harness.gateway.me.mockRejectedValueOnce(meError);

    await expect(
      harness.service.signIn(DEFAULT_CREDENTIALS),
    ).rejects.toBe(meError);

    expect(harness.gateway.logout).toHaveBeenCalledWith(
      DEFAULT_TOKENS.refreshToken,
    );
    expect(harness.tokenVault.clear).toHaveBeenCalledTimes(1);
    expect(harness.storedRefreshToken()).toBeNull();
    expect(harness.service.getAccessToken()).toBeUndefined();
    expect(harness.queryCache.clear).toHaveBeenCalledTimes(1);
  });

  it('rota tokens durante refreshAccessToken', async () => {
    const harness = createHarness();
    await establishAuthenticatedSession(harness);

    await harness.service.refreshAccessToken();

    expect(harness.gateway.refresh).toHaveBeenCalledWith(
      DEFAULT_TOKENS.refreshToken,
    );
    expect(harness.storedRefreshToken()).toBe(DEFAULT_TOKENS.refreshToken);
    expect(harness.service.getAccessToken()).toBe(DEFAULT_TOKENS.accessToken);
  });

  it('invalida y notifica cuando refreshAccessToken recibe 401', async () => {
    const harness = createHarness();
    await establishAuthenticatedSession(harness);
    const listener = jest.fn();
    harness.service.subscribe(listener);
    const error = apiError(401, 'REFRESH_REVOKED', 'La sesión expiró.');
    harness.gateway.refresh.mockRejectedValueOnce(error);

    await expect(harness.service.refreshAccessToken()).rejects.toBe(error);

    expect(harness.tokenVault.clear).toHaveBeenCalledTimes(1);
    expect(harness.storedRefreshToken()).toBeNull();
    expect(harness.queryCache.clear).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({
      status: 'anonymous',
      notice: {
        message: 'La sesión expiró.',
        traceId: 'trace-session',
        retryable: false,
      },
    });
  });

  it('preserva el refresh token y notifica reintento ante red durante refreshAccessToken', async () => {
    const harness = createHarness();
    await establishAuthenticatedSession(harness);
    const listener = jest.fn();
    harness.service.subscribe(listener);
    const error = apiError(0, 'NETWORK_ERROR', 'Sin conexión.', 'trace-offline');
    harness.gateway.refresh.mockRejectedValueOnce(error);

    await expect(harness.service.refreshAccessToken()).rejects.toBe(error);

    expect(harness.tokenVault.clear).not.toHaveBeenCalled();
    expect(harness.storedRefreshToken()).toBe(DEFAULT_TOKENS.refreshToken);
    expect(harness.service.getAccessToken()).toBeUndefined();
    expect(listener).toHaveBeenCalledWith({
      status: 'anonymous',
      notice: {
        message: 'Sin conexión.',
        traceId: 'trace-offline',
        retryable: true,
      },
    });
  });
});

describe('SessionService.logout', () => {
  it('revoca remotamente y siempre limpia token, access, caché y estado', async () => {
    const harness = createHarness();
    await establishAuthenticatedSession(harness);
    const listener = jest.fn();
    harness.service.subscribe(listener);

    await harness.service.logout();

    expect(harness.gateway.logout).toHaveBeenCalledWith(
      DEFAULT_TOKENS.refreshToken,
    );
    expect(harness.tokenVault.clear).toHaveBeenCalledTimes(1);
    expect(harness.storedRefreshToken()).toBeNull();
    expect(harness.service.getAccessToken()).toBeUndefined();
    expect(harness.queryCache.cancelQueries).toHaveBeenCalledTimes(1);
    expect(harness.queryCache.clear).toHaveBeenCalledTimes(1);
    expect(harness.invalidate).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ status: 'anonymous' });

    const cancelOrder =
      harness.queryCache.cancelQueries.mock.invocationCallOrder[0]!;
    const clearOrder = harness.queryCache.clear.mock.invocationCallOrder[0]!;
    expect(cancelOrder).toBeLessThan(clearOrder);
  });

  it.each([
    apiError(500, 'LOGOUT_FAILED', 'Servicio no disponible.'),
    apiError(0, 'NETWORK_ERROR', 'Sin conexión.', 'trace-offline'),
  ])(
    'mantiene logout local efectivo si el logout remoto falla con %s',
    async (remoteError) => {
      const harness = createHarness();
      await establishAuthenticatedSession(harness);
      harness.gateway.logout.mockRejectedValueOnce(remoteError);
      const listener = jest.fn();
      harness.service.subscribe(listener);

      await expect(harness.service.logout()).resolves.toBeUndefined();

      expect(harness.tokenVault.clear).toHaveBeenCalledTimes(1);
      expect(harness.storedRefreshToken()).toBeNull();
      expect(harness.service.getAccessToken()).toBeUndefined();
      expect(harness.queryCache.clear).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({ status: 'anonymous' });
      expect(harness.logger.warn).toHaveBeenCalledWith(
        'session.logout.remote-failed',
        { error: remoteError },
      );
    },
  );

  it('continúa la limpieza si falla la lectura del vault', async () => {
    const harness = createHarness();
    await establishAuthenticatedSession(harness);
    const readError = new Error('SecureStore read failed');
    harness.tokenVault.getRefreshToken.mockRejectedValueOnce(readError);
    const listener = jest.fn();
    harness.service.subscribe(listener);

    await expect(harness.service.logout()).resolves.toBeUndefined();

    expect(harness.gateway.logout).not.toHaveBeenCalled();
    expect(harness.tokenVault.clear).toHaveBeenCalledTimes(1);
    expect(harness.queryCache.clear).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ status: 'anonymous' });
    expect(harness.logger.warn).toHaveBeenCalledWith(
      'session.logout.token-read-failed',
      { error: readError },
    );
  });

  it('continúa con caché y estado anónimo si falla el borrado del vault', async () => {
    const harness = createHarness();
    await establishAuthenticatedSession(harness);
    const clearError = new Error('SecureStore delete failed');
    harness.tokenVault.clear.mockRejectedValueOnce(clearError);
    const listener = jest.fn();
    harness.service.subscribe(listener);

    await expect(harness.service.logout()).resolves.toBeUndefined();

    expect(harness.service.getAccessToken()).toBeUndefined();
    expect(harness.queryCache.cancelQueries).toHaveBeenCalledTimes(1);
    expect(harness.queryCache.clear).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ status: 'anonymous' });
    expect(harness.logger.error).toHaveBeenCalledWith(
      'session.vault.clear-failed',
      { error: clearError },
    );
  });

  it('continúa y limpia caché si cancelQueries falla', async () => {
    const harness = createHarness();
    await establishAuthenticatedSession(harness);
    const cancelError = new Error('cancel failed');
    harness.queryCache.cancelQueries.mockRejectedValueOnce(cancelError);
    const listener = jest.fn();
    harness.service.subscribe(listener);

    await expect(harness.service.logout()).resolves.toBeUndefined();

    expect(harness.queryCache.clear).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ status: 'anonymous' });
    expect(harness.logger.warn).toHaveBeenCalledWith(
      'session.query-cancel-failed',
      { error: cancelError },
    );
  });

  it('continúa y emite anonymous si queryCache.clear lanza sincrónicamente', async () => {
    const harness = createHarness();
    await establishAuthenticatedSession(harness);
    const clearError = new Error('query clear failed');
    harness.queryCache.clear.mockImplementationOnce(() => {
      throw clearError;
    });
    const listener = jest.fn();
    harness.service.subscribe(listener);

    await expect(harness.service.logout()).resolves.toBeUndefined();

    expect(harness.tokenVault.clear).toHaveBeenCalledTimes(1);
    expect(harness.service.getAccessToken()).toBeUndefined();
    expect(listener).toHaveBeenCalledWith({ status: 'anonymous' });
    expect(harness.logger.warn).toHaveBeenCalledWith(
      'session.query-clear-failed',
      { error: clearError },
    );
  });

  it('impide que un refresh tardío restaure tokens después de logout', async () => {
    const harness = createHarness();
    const refresh = createDeferred<SessionTokens>();
    harness.gateway.refresh.mockReturnValueOnce(refresh.promise);

    const bootstrap = harness.service.bootstrap();
    await waitUntilCalled(harness.gateway.refresh);

    await harness.service.logout();
    const bootstrapOutcome = expect(bootstrap).rejects.toBeInstanceOf(
      StaleSessionOperationError,
    );
    refresh.resolve(DEFAULT_TOKENS);
    await bootstrapOutcome;

    expect(harness.tokenVault.setRefreshToken).not.toHaveBeenCalled();
    expect(harness.storedRefreshToken()).toBeNull();
    expect(harness.service.getAccessToken()).toBeUndefined();
    expect(harness.invalidate).toHaveBeenCalledTimes(2);
  });

  it('limpia localmente sin esperar al logout remoto e impide un refresh nuevo', async () => {
    const harness = createHarness();
    await establishAuthenticatedSession(harness);
    const remoteLogout = createDeferred<void>();
    let accessTokenAtRemoteLogout: string | undefined;
    harness.gateway.logout.mockImplementationOnce(async () => {
      accessTokenAtRemoteLogout = harness.service.getAccessToken();
      await remoteLogout.promise;
    });
    const listener = jest.fn();
    harness.service.subscribe(listener);

    const logout = harness.service.logout();
    await waitUntilCalled(harness.gateway.logout);
    await logout;

    expect(harness.storedRefreshToken()).toBeNull();
    expect(harness.service.getAccessToken()).toBeUndefined();
    expect(accessTokenAtRemoteLogout).toBe(DEFAULT_TOKENS.accessToken);
    expect(harness.queryCache.clear).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ status: 'anonymous' });
    expect(
      harness.gateway.logout.mock.invocationCallOrder[0],
    ).toBeLessThan(harness.tokenVault.clear.mock.invocationCallOrder[0]!);

    await expect(harness.service.refreshAccessToken()).rejects.toMatchObject({
      code: 'SESSION_NOT_REFRESHABLE',
      status: 401,
    });
    expect(harness.gateway.refresh).not.toHaveBeenCalled();

    remoteLogout.resolve();
  });

  it('un refresh anterior al logout no invalida un login posterior', async () => {
    const harness = createHarness();
    await establishAuthenticatedSession(harness);
    const oldRefresh = createDeferred<SessionTokens>();
    harness.gateway.refresh.mockReturnValueOnce(oldRefresh.promise);

    const refresh = harness.service.refreshAccessToken();
    const refreshOutcome = expect(refresh).rejects.toBeInstanceOf(
      StaleSessionOperationError,
    );
    await waitUntilCalled(harness.gateway.refresh);
    await harness.service.logout();

    const newerTokens: SessionTokens = {
      ...DEFAULT_TOKENS,
      accessToken: 'access-session-b',
      refreshToken: 'refresh-session-b',
    };
    harness.gateway.login.mockResolvedValueOnce(newerTokens);
    const state = await harness.service.signIn(DEFAULT_CREDENTIALS);
    expect(state.status).toBe('authenticated');
    const clearCallsAfterLogin = harness.tokenVault.clear.mock.calls.length;
    const queryClearCallsAfterLogin = harness.queryCache.clear.mock.calls.length;

    oldRefresh.resolve(DEFAULT_TOKENS);
    await refreshOutcome;

    expect(harness.service.getAccessToken()).toBe(newerTokens.accessToken);
    expect(harness.storedRefreshToken()).toBe(newerTokens.refreshToken);
    expect(harness.tokenVault.clear).toHaveBeenCalledTimes(clearCallsAfterLogin);
    expect(harness.queryCache.clear).toHaveBeenCalledTimes(
      queryClearCallsAfterLogin,
    );
  });

  it('un sign-in stale no revoca ni borra el sign-in más reciente', async () => {
    const harness = createHarness({ initialRefreshToken: null });
    const firstLogin = createDeferred<SessionTokens>();
    const newerTokens: SessionTokens = {
      ...DEFAULT_TOKENS,
      accessToken: 'access-newer-login',
      refreshToken: 'refresh-newer-login',
    };
    harness.gateway.login
      .mockReturnValueOnce(firstLogin.promise)
      .mockResolvedValueOnce(newerTokens);

    const firstSignIn = harness.service.signIn(DEFAULT_CREDENTIALS);
    const firstOutcome = expect(firstSignIn).rejects.toBeInstanceOf(
      StaleSessionOperationError,
    );
    await waitUntilCalled(harness.gateway.login);

    const newerState = await harness.service.signIn(DEFAULT_CREDENTIALS);
    expect(newerState.status).toBe('authenticated');
    firstLogin.resolve(DEFAULT_TOKENS);
    await firstOutcome;

    expect(harness.gateway.logout).not.toHaveBeenCalled();
    expect(harness.tokenVault.clear).not.toHaveBeenCalled();
    expect(harness.service.getAccessToken()).toBe(newerTokens.accessToken);
    expect(harness.storedRefreshToken()).toBe(newerTokens.refreshToken);
  });

  it('un bootstrap stale no borra un sign-in posterior', async () => {
    const harness = createHarness();
    const bootstrapRefresh = createDeferred<SessionTokens>();
    const newerTokens: SessionTokens = {
      ...DEFAULT_TOKENS,
      accessToken: 'access-after-bootstrap',
      refreshToken: 'refresh-after-bootstrap',
    };
    harness.gateway.refresh.mockReturnValueOnce(bootstrapRefresh.promise);
    harness.gateway.login.mockResolvedValueOnce(newerTokens);

    const bootstrap = harness.service.bootstrap();
    const bootstrapOutcome = expect(bootstrap).rejects.toBeInstanceOf(
      StaleSessionOperationError,
    );
    await waitUntilCalled(harness.gateway.refresh);
    await expect(
      harness.service.signIn(DEFAULT_CREDENTIALS),
    ).resolves.toMatchObject({ status: 'authenticated' });

    bootstrapRefresh.resolve(DEFAULT_TOKENS);
    await bootstrapOutcome;

    expect(harness.tokenVault.clear).not.toHaveBeenCalled();
    expect(harness.service.getAccessToken()).toBe(newerTokens.accessToken);
    expect(harness.storedRefreshToken()).toBe(newerTokens.refreshToken);
  });

  it('la finalización remota tardía del logout no afecta una sesión nueva', async () => {
    const harness = createHarness();
    await establishAuthenticatedSession(harness);
    const remoteLogout = createDeferred<void>();
    const remoteError = new Error('remote logout finished late');
    const newerTokens: SessionTokens = {
      ...DEFAULT_TOKENS,
      accessToken: 'access-after-logout',
      refreshToken: 'refresh-after-logout',
    };
    harness.gateway.logout.mockReturnValueOnce(remoteLogout.promise);
    harness.gateway.login.mockResolvedValueOnce(newerTokens);

    await harness.service.logout();
    await harness.service.signIn(DEFAULT_CREDENTIALS);
    const clearCallsAfterLogin = harness.tokenVault.clear.mock.calls.length;
    const queryClearCallsAfterLogin = harness.queryCache.clear.mock.calls.length;

    remoteLogout.reject(remoteError);
    await waitUntilCalled(harness.logger.warn);

    expect(harness.logger.warn).toHaveBeenCalledWith(
      'session.logout.remote-failed',
      { error: remoteError },
    );
    expect(harness.service.getAccessToken()).toBe(newerTokens.accessToken);
    expect(harness.storedRefreshToken()).toBe(newerTokens.refreshToken);
    expect(harness.tokenVault.clear).toHaveBeenCalledTimes(clearCallsAfterLogin);
    expect(harness.queryCache.clear).toHaveBeenCalledTimes(
      queryClearCallsAfterLogin,
    );
  });
});
