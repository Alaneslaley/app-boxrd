import type { ApiError } from '../ApiError';
import { GymboxHttpClient } from '../GymboxHttpClient';
import type { HttpRequest } from '../HttpRequest';
import {
  RefreshCoordinator,
  RefreshInvalidatedError,
} from '../RefreshCoordinator';

type Deferred<T> = Readonly<{
  promise: Promise<T>;
  resolve(value: T | PromiseLike<T>): void;
  reject(reason?: unknown): void;
}>;

type FakeResponse = Readonly<{
  response: Response;
  text: jest.Mock<Promise<string>, []>;
}>;

type FetchInput = Parameters<typeof fetch>[0];
type FetchInit = Parameters<typeof fetch>[1];
const STILL_PENDING = Symbol('still-pending');

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
}

function responseOf(
  status: number,
  body = '',
  contentType = 'application/json',
): FakeResponse {
  const headers = new Headers();
  if (contentType) headers.set('content-type', contentType);
  const text = jest.fn<Promise<string>, []>().mockResolvedValue(body);

  return {
    response: {
      status,
      ok: status >= 200 && status < 300,
      headers,
      text,
    } as unknown as Response,
    text,
  };
}

function createFetchMock(
  implementation: (
    input: FetchInput,
    init?: FetchInit,
  ) => Promise<Response>,
): jest.MockedFunction<typeof fetch> {
  return jest.fn(implementation) as unknown as jest.MockedFunction<typeof fetch>;
}

function authorizationFrom(init: FetchInit): string | null {
  return new Headers(init?.headers).get('authorization');
}

describe('GymboxHttpClient refresh', () => {
  it('resuelve cinco 401 con un refresh y reproduce cada solicitud una sola vez', async () => {
    let accessToken = 'old-token';
    const refreshStarted = deferred<void>();
    const refreshGate = deferred<void>();
    const refreshAction = jest.fn(async () => {
      refreshStarted.resolve(undefined);
      await refreshGate.promise;
      accessToken = 'new-token';
    });
    const refreshCoordinator = new RefreshCoordinator(refreshAction);
    const fetchImplementation = createFetchMock(async (_input, init) => {
      if (authorizationFrom(init) === 'Bearer old-token') {
        return responseOf(401).response;
      }
      return responseOf(200, JSON.stringify({ ok: true })).response;
    });
    const client = new GymboxHttpClient('https://api.example.com/api/v1/', {
      auth: {
        getAccessToken: () => accessToken,
        refreshCoordinator,
      },
      fetchImplementation,
    });

    const requests = Array.from({ length: 5 }, (_, index) =>
      client.request<{ ok: boolean }>({
        method: 'GET',
        path: `/items/${index}`,
        requiresAuth: true,
      }),
    );

    await refreshStarted.promise;

    expect(fetchImplementation).toHaveBeenCalledTimes(5);
    expect(refreshAction).toHaveBeenCalledTimes(1);

    refreshGate.resolve(undefined);
    await expect(Promise.all(requests)).resolves.toEqual(
      Array.from({ length: 5 }, () =>
        expect.objectContaining({ status: 200, data: { ok: true } }),
      ),
    );

    expect(fetchImplementation).toHaveBeenCalledTimes(10);
    expect(refreshAction).toHaveBeenCalledTimes(1);

    const urls = fetchImplementation.mock.calls.map(([input]) => String(input));
    for (let index = 0; index < 5; index += 1) {
      expect(
        urls.filter(
          (url) => url === `https://api.example.com/api/v1/items/${index}`,
        ),
      ).toHaveLength(2);
    }

    const authorizations = fetchImplementation.mock.calls.map(([, init]) =>
      authorizationFrom(init),
    );
    expect(authorizations.slice(0, 5)).toEqual(
      Array.from({ length: 5 }, () => 'Bearer old-token'),
    );
    expect(authorizations.slice(5)).toEqual(
      Array.from({ length: 5 }, () => 'Bearer new-token'),
    );
  });

  it('reproduce un GET con el token vigente sin refrescar otra vez ante un 401 tardío', async () => {
    let accessToken = 'old-token';
    let refreshCount = 0;
    const delayedUnauthorized = deferred<Response>();
    const refreshAction = jest.fn(async () => {
      refreshCount += 1;
      accessToken = `new-token-${refreshCount}`;
    });
    const fetchImplementation = createFetchMock(async (input, init) => {
      const authorization = authorizationFrom(init);
      if (
        String(input).endsWith('/slow') &&
        authorization === 'Bearer old-token'
      ) {
        return delayedUnauthorized.promise;
      }
      if (authorization === 'Bearer old-token') {
        return responseOf(401).response;
      }
      return responseOf(200, JSON.stringify({ ok: true })).response;
    });
    const client = new GymboxHttpClient('https://api.example.com', {
      auth: {
        getAccessToken: () => accessToken,
        refreshCoordinator: new RefreshCoordinator(refreshAction),
      },
      fetchImplementation,
    });

    const fastRequest = client.request<{ ok: boolean }>({
      method: 'GET',
      path: '/fast',
      requiresAuth: true,
    });
    const slowRequest = client.request<{ ok: boolean }>({
      method: 'GET',
      path: '/slow',
      requiresAuth: true,
    });

    await expect(fastRequest).resolves.toMatchObject({
      status: 200,
      data: { ok: true },
    });
    expect(refreshAction).toHaveBeenCalledTimes(1);

    delayedUnauthorized.resolve(responseOf(401).response);
    await expect(slowRequest).resolves.toMatchObject({
      status: 200,
      data: { ok: true },
    });

    expect(refreshAction).toHaveBeenCalledTimes(1);
    const slowAuthorizations = fetchImplementation.mock.calls
      .filter(([input]) => String(input).endsWith('/slow'))
      .map(([, init]) => authorizationFrom(init));
    expect(slowAuthorizations).toEqual([
      'Bearer old-token',
      'Bearer new-token-1',
    ]);
  });

  it('no vuelve a refrescar ni reproduce tras un segundo 401', async () => {
    let accessToken = 'old-token';
    const refreshAction = jest.fn(async () => {
      accessToken = 'new-token';
    });
    const refreshCoordinator = new RefreshCoordinator(refreshAction);
    const onUnauthorized = jest.fn(async (_error: ApiError) => undefined);
    const fetchImplementation = createFetchMock(async () =>
      responseOf(401).response,
    );
    const client = new GymboxHttpClient('https://api.example.com', {
      auth: {
        getAccessToken: () => accessToken,
        refreshCoordinator,
        onUnauthorized,
      },
      fetchImplementation,
    });

    await expect(
      client.request({
        method: 'GET',
        path: '/protected',
        requiresAuth: true,
      }),
    ).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTHORIZED',
    });

    expect(fetchImplementation).toHaveBeenCalledTimes(2);
    expect(refreshAction).toHaveBeenCalledTimes(1);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('no invalida la sesión nueva por un 401 tardío del replay con token anterior', async () => {
    let accessToken = 'old-token';
    const replayStarted = deferred<void>();
    const delayedReplayUnauthorized = deferred<Response>();
    const refreshAction = jest.fn(async () => {
      accessToken = 'token-a';
    });
    const onUnauthorized = jest.fn(async (_error: ApiError) => undefined);
    const fetchImplementation = createFetchMock(async (_input, init) => {
      const authorization = authorizationFrom(init);
      if (authorization === 'Bearer old-token') {
        return responseOf(401).response;
      }
      if (authorization === 'Bearer token-a') {
        replayStarted.resolve(undefined);
        return delayedReplayUnauthorized.promise;
      }
      return responseOf(200, JSON.stringify({ ok: true })).response;
    });
    const client = new GymboxHttpClient('https://api.example.com', {
      auth: {
        getAccessToken: () => accessToken,
        refreshCoordinator: new RefreshCoordinator(refreshAction),
        onUnauthorized,
      },
      fetchImplementation,
    });

    const request = client.request({
      method: 'GET',
      path: '/protected',
      requiresAuth: true,
    });
    await replayStarted.promise;

    accessToken = 'token-b';
    delayedReplayUnauthorized.resolve(responseOf(401).response);

    await expect(request).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTHORIZED',
    });
    expect(fetchImplementation).toHaveBeenCalledTimes(2);
    expect(refreshAction).toHaveBeenCalledTimes(1);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('no reproduce la solicitud cuando falla el refresh', async () => {
    const failure = new Error('refresh failed');
    const refreshAction = jest.fn<Promise<void>, []>().mockRejectedValue(failure);
    const fetchImplementation = createFetchMock(async () =>
      responseOf(401).response,
    );
    const client = new GymboxHttpClient('https://api.example.com', {
      auth: {
        getAccessToken: () => 'old-token',
        refreshCoordinator: new RefreshCoordinator(refreshAction),
      },
      fetchImplementation,
    });

    await expect(
      client.request({
        method: 'GET',
        path: '/protected',
        requiresAuth: true,
      }),
    ).rejects.toBe(failure);

    expect(fetchImplementation).toHaveBeenCalledTimes(1);
    expect(refreshAction).toHaveBeenCalledTimes(1);
  });

  it('rechaza el refresh tardío invalidado y no reproduce la solicitud', async () => {
    const refreshGate = deferred<void>();
    const refreshStarted = deferred<void>();
    const refreshAction = jest.fn(async () => {
      refreshStarted.resolve(undefined);
      await refreshGate.promise;
    });
    const refreshCoordinator = new RefreshCoordinator(refreshAction);
    const fetchImplementation = createFetchMock(async () =>
      responseOf(401).response,
    );
    const client = new GymboxHttpClient('https://api.example.com', {
      auth: {
        getAccessToken: () => 'old-token',
        refreshCoordinator,
      },
      fetchImplementation,
    });

    const request = client.request({
      method: 'GET',
      path: '/protected',
      requiresAuth: true,
    });
    await refreshStarted.promise;

    refreshCoordinator.invalidate();
    refreshGate.resolve(undefined);

    await expect(request).rejects.toBeInstanceOf(RefreshInvalidatedError);
    expect(fetchImplementation).toHaveBeenCalledTimes(1);
  });

  it('cancela el waiter sin replay si AbortSignal se activa durante el refresh', async () => {
    let accessToken = 'old-token';
    const refreshStarted = deferred<void>();
    const refreshGate = deferred<void>();
    const refreshAction = jest.fn(async () => {
      refreshStarted.resolve(undefined);
      await refreshGate.promise;
      accessToken = 'new-token';
    });
    const fetchImplementation = createFetchMock(async (_input, init) => {
      if (init?.signal?.aborted) {
        throw Object.assign(new Error('aborted'), { name: 'AbortError' });
      }
      return authorizationFrom(init) === 'Bearer old-token'
        ? responseOf(401).response
        : responseOf(200, JSON.stringify({ ok: true })).response;
    });
    const client = new GymboxHttpClient('https://api.example.com', {
      auth: {
        getAccessToken: () => accessToken,
        refreshCoordinator: new RefreshCoordinator(refreshAction),
      },
      fetchImplementation,
    });
    const controller = new AbortController();
    const request = client.request({
      method: 'GET',
      path: '/protected',
      requiresAuth: true,
      signal: controller.signal,
    });
    const settled = request.then(
      () => ({ status: 'resolved' as const }),
      (error: unknown) => error,
    );

    await refreshStarted.promise;
    controller.abort();
    const outcomeBeforeRefreshCompletes = await Promise.race([
      settled,
      new Promise<typeof STILL_PENDING>((resolve) => {
        setTimeout(() => resolve(STILL_PENDING), 0);
      }),
    ]);

    refreshGate.resolve(undefined);
    await settled;

    expect(outcomeBeforeRefreshCompletes).toMatchObject({
      status: 0,
      code: 'REQUEST_CANCELLED',
    });
    expect(fetchImplementation).toHaveBeenCalledTimes(1);
  });

  it('aplica timeoutMs al tiempo total aunque esté esperando refresh', async () => {
    jest.useFakeTimers();
    let accessToken = 'old-token';
    const refreshStarted = deferred<void>();
    const refreshGate = deferred<void>();
    const refreshAction = jest.fn(async () => {
      refreshStarted.resolve(undefined);
      await refreshGate.promise;
      accessToken = 'new-token';
    });
    const fetchImplementation = createFetchMock(async () =>
      accessToken === 'old-token'
        ? responseOf(401).response
        : responseOf(200, JSON.stringify({ ok: true })).response,
    );
    const client = new GymboxHttpClient('https://api.example.com', {
      auth: {
        getAccessToken: () => accessToken,
        refreshCoordinator: new RefreshCoordinator(refreshAction),
      },
      fetchImplementation,
    });
    const request = client.request({
      method: 'GET',
      path: '/protected',
      requiresAuth: true,
      timeoutMs: 25,
    });
    const settled = request.then(
      () => ({ status: 'resolved' as const }),
      (error: unknown) => error,
    );

    try {
      await refreshStarted.promise;
      await jest.advanceTimersByTimeAsync(25);
      const outcomeAtDeadline = await Promise.race([
        settled,
        Promise.resolve(STILL_PENDING),
      ]);

      refreshGate.resolve(undefined);
      await settled;

      expect(outcomeAtDeadline).toMatchObject({
        status: 0,
        code: 'REQUEST_TIMEOUT',
      });
      expect(fetchImplementation).toHaveBeenCalledTimes(1);
    } finally {
      refreshGate.resolve(undefined);
      jest.useRealTimers();
    }
  });

  it('no inicia refresh ante 403', async () => {
    const refreshAction = jest.fn<Promise<void>, []>().mockResolvedValue(undefined);
    const onUnauthorized = jest.fn(async (_error: ApiError) => undefined);
    const fetchImplementation = createFetchMock(async () =>
      responseOf(403).response,
    );
    const client = new GymboxHttpClient('https://api.example.com', {
      auth: {
        getAccessToken: () => 'access-token',
        refreshCoordinator: new RefreshCoordinator(refreshAction),
        onUnauthorized,
      },
      fetchImplementation,
    });

    await expect(
      client.request({
        method: 'GET',
        path: '/protected',
        requiresAuth: true,
      }),
    ).rejects.toMatchObject({
      status: 403,
      code: 'FORBIDDEN',
    });

    expect(fetchImplementation).toHaveBeenCalledTimes(1);
    expect(refreshAction).not.toHaveBeenCalled();
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('no crea ciclos de refresh para login, refresh o logout', async () => {
    const refreshAction = jest.fn<Promise<void>, []>().mockResolvedValue(undefined);
    const fetchImplementation = createFetchMock(async () =>
      responseOf(401).response,
    );
    const client = new GymboxHttpClient('https://api.example.com', {
      auth: {
        getAccessToken: () => 'access-token',
        refreshCoordinator: new RefreshCoordinator(refreshAction),
      },
      fetchImplementation,
    });
    const requests: readonly HttpRequest[] = [
      {
        method: 'POST',
        path: '/auth/login',
        body: { email: 'user@example.com', password: 'secret' },
        requiresAuth: false,
        allowRefresh: false,
      },
      {
        method: 'POST',
        path: '/auth/refresh',
        body: { refreshToken: 'refresh-token' },
        requiresAuth: false,
        allowRefresh: false,
      },
      {
        method: 'POST',
        path: '/auth/logout',
        body: { refreshToken: 'refresh-token' },
        requiresAuth: true,
        allowRefresh: false,
      },
    ];

    for (const request of requests) {
      await expect(client.request(request)).rejects.toMatchObject({
        status: 401,
      });
    }

    expect(fetchImplementation).toHaveBeenCalledTimes(3);
    expect(refreshAction).not.toHaveBeenCalled();
  });

  it('puede refrescar un POST protegido tras 401 pero jamás lo reproduce', async () => {
    let accessToken = 'old-token';
    const refreshAction = jest.fn(async () => {
      accessToken = 'new-token';
    });
    const fetchImplementation = createFetchMock(async () =>
      fetchImplementation.mock.calls.length === 1
        ? responseOf(401).response
        : responseOf(200, JSON.stringify({ duplicated: true })).response,
    );
    const client = new GymboxHttpClient('https://api.example.com', {
      auth: {
        getAccessToken: () => accessToken,
        refreshCoordinator: new RefreshCoordinator(refreshAction),
      },
      fetchImplementation,
    });

    await expect(
      client.request({
        method: 'POST',
        path: '/protected-mutation',
        body: { amount: 100 },
        requiresAuth: true,
        allowRefresh: true,
      }),
    ).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTHORIZED',
    });

    expect(refreshAction).toHaveBeenCalledTimes(1);
    expect(fetchImplementation).toHaveBeenCalledTimes(1);
    expect(fetchImplementation.mock.calls[0]?.[1]?.body).toBe(
      JSON.stringify({ amount: 100 }),
    );
  });
});

describe('GymboxHttpClient transporte', () => {
  it('normaliza base y path sin duplicar /api/v1', async () => {
    const cases = [
      ['https://api.example.com', '/auth/me'],
      ['https://api.example.com/api/v1/', '/auth/me'],
      ['https://api.example.com/api/v1', '/api/v1/auth/me'],
    ] as const;

    for (const [baseUrl, path] of cases) {
      const fetchImplementation = createFetchMock(async () =>
        responseOf(204).response,
      );
      const client = new GymboxHttpClient(baseUrl, { fetchImplementation });

      await client.request({ method: 'GET', path });

      expect(fetchImplementation).toHaveBeenCalledWith(
        'https://api.example.com/api/v1/auth/me',
        expect.any(Object),
      );
    }
  });

  it('añade headers seguros y Authorization sólo a solicitudes protegidas', async () => {
    const fetchImplementation = createFetchMock(async () =>
      responseOf(204).response,
    );
    const client = new GymboxHttpClient('https://api.example.com', {
      auth: {
        getAccessToken: () => 'trusted-token',
        refreshCoordinator: new RefreshCoordinator(async () => undefined),
      },
      fetchImplementation,
    });

    await client.request({
      method: 'POST',
      path: '/protected',
      headers: {
        Authorization: 'Bearer untrusted-token',
        'X-Client': 'gymbox',
      },
      body: { ready: true },
      requiresAuth: true,
    });
    await client.request({
      method: 'GET',
      path: '/public',
      requiresAuth: false,
    });

    const protectedInit = fetchImplementation.mock.calls[0]?.[1];
    const protectedHeaders = new Headers(protectedInit?.headers);
    expect(protectedHeaders.get('accept')).toBe('application/json');
    expect(protectedHeaders.get('content-type')).toBe('application/json');
    expect(protectedHeaders.get('authorization')).toBe(
      'Bearer trusted-token',
    );
    expect(protectedHeaders.get('x-client')).toBe('gymbox');
    expect(protectedInit?.body).toBe(JSON.stringify({ ready: true }));

    const publicHeaders = new Headers(
      fetchImplementation.mock.calls[1]?.[1]?.headers,
    );
    expect(publicHeaders.get('authorization')).toBeNull();
    expect(publicHeaders.get('content-type')).toBeNull();
  });

  it('normaliza 204 sin intentar leer el body', async () => {
    const noContent = responseOf(204, 'unexpected body');
    const fetchImplementation = createFetchMock(async () => noContent.response);
    const client = new GymboxHttpClient('https://api.example.com', {
      fetchImplementation,
    });

    await expect(
      client.request<void>({ method: 'POST', path: '/auth/logout' }),
    ).resolves.toMatchObject({
      status: 204,
      data: undefined,
    });
    expect(noContent.text).not.toHaveBeenCalled();
  });

  describe('cancelación y timeout', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    function abortableFetch(): jest.MockedFunction<typeof fetch> {
      return createFetchMock(
        (_input, init) =>
          new Promise<Response>((_resolve, reject) => {
            const rejectAsAborted = () => {
              reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
            };

            if (init?.signal?.aborted) {
              rejectAsAborted();
              return;
            }

            init?.signal?.addEventListener('abort', rejectAsAborted, {
              once: true,
            });
          }),
      );
    }

    it('respeta AbortSignal del caller', async () => {
      const fetchImplementation = abortableFetch();
      const client = new GymboxHttpClient('https://api.example.com', {
        fetchImplementation,
      });
      const controller = new AbortController();

      const request = client.request({
        method: 'GET',
        path: '/slow',
        signal: controller.signal,
      });
      controller.abort();

      await expect(request).rejects.toMatchObject({
        status: 0,
        code: 'REQUEST_CANCELLED',
      });
    });

    it('aborta al alcanzar timeoutMs', async () => {
      jest.useFakeTimers();
      const fetchImplementation = abortableFetch();
      const client = new GymboxHttpClient('https://api.example.com', {
        fetchImplementation,
      });

      const request = client.request({
        method: 'GET',
        path: '/slow',
        timeoutMs: 25,
      });
      jest.advanceTimersByTime(25);

      await expect(request).rejects.toMatchObject({
        status: 0,
        code: 'REQUEST_TIMEOUT',
      });
    });
  });
});
