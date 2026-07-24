import { ApiError } from './ApiError';
import { ApiErrorMapper } from './ApiErrorMapper';
import type { HttpClient } from './HttpClient';
import type { HttpRequest } from './HttpRequest';
import type { HttpResponse } from './HttpResponse';
import type { RefreshCoordinator } from './RefreshCoordinator';

const API_PREFIX = '/api/v1';
const DEFAULT_TIMEOUT_MS = 15_000;

export type GymboxHttpClientAuth = Readonly<{
  getAccessToken(): string | undefined;
  refreshCoordinator: RefreshCoordinator;
  onUnauthorized?(error: ApiError): Promise<void>;
}>;

export type GymboxHttpClientOptions = Readonly<{
  auth?: GymboxHttpClientAuth;
  errorMapper?: ApiErrorMapper;
  fetchImplementation?: typeof fetch;
}>;

type AbortCause = 'timeout' | 'cancellation' | undefined;
type ExecutedRequest = Readonly<{
  response: Response;
  accessTokenUsed: string | undefined;
}>;

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/api\/v1$/i, '');
}

function normalizePath(path: `/${string}`): string {
  return path.replace(/^\/api\/v1(?=\/|$)/i, '') || '/';
}

function safeCallerHeaders(
  headers: Readonly<Record<string, string>> | undefined,
): Record<string, string> {
  if (!headers) return {};
  const reserved = new Set(['authorization', 'cookie', 'set-cookie']);
  return Object.fromEntries(
    Object.entries(headers).filter(
      ([name]) => !reserved.has(name.toLowerCase()),
    ),
  );
}

function isJson(contentType: string | null): boolean {
  if (!contentType) return false;
  const mediaType = contentType.split(';', 1)[0]?.trim().toLowerCase();
  return mediaType === 'application/json' || mediaType?.endsWith('+json') === true;
}

async function readSuccessPayload(response: Response): Promise<unknown> {
  if (response.status === 204 || response.status === 205) return undefined;
  if (!isJson(response.headers.get('content-type'))) return undefined;

  const body = await response.text();
  if (!body.trim()) return undefined;

  try {
    return JSON.parse(body);
  } catch {
    throw new ApiError(
      502,
      'MALFORMED_RESPONSE',
      'El servicio devolvió una respuesta no válida.',
      undefined,
      response.headers.get('x-trace-id') ?? undefined,
    );
  }
}

export class GymboxHttpClient implements HttpClient {
  private readonly baseUrl: string;
  private readonly errorMapper: ApiErrorMapper;
  private readonly fetchImplementation: typeof fetch;

  constructor(
    baseUrl: string,
    private readonly options: GymboxHttpClientOptions = {},
  ) {
    this.baseUrl = normalizeBaseUrl(baseUrl);
    this.errorMapper = options.errorMapper ?? new ApiErrorMapper();
    this.fetchImplementation = options.fetchImplementation ?? fetch;
  }

  async request<TResponse>(
    request: HttpRequest,
  ): Promise<HttpResponse<TResponse>> {
    const timeoutMs = request.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const deadline = Date.now() + Math.max(0, timeoutMs);
    return this.requestAttempt<TResponse>(request, deadline);
  }

  private async requestAttempt<TResponse>(
    request: HttpRequest,
    deadline: number,
  ): Promise<HttpResponse<TResponse>> {
    this.assertRequestIsActive(request.signal, deadline);
    const { response, accessTokenUsed } = await this.execute(
      request,
      this.remainingTime(deadline),
    );

    if (
      response.status === 401 &&
      request.requiresAuth === true &&
      request.allowRefresh !== false &&
      request.alreadyRetried !== true &&
      this.options.auth
    ) {
      const currentAccessToken = this.options.auth.getAccessToken();

      if (currentAccessToken !== undefined) {
        if (currentAccessToken === accessTokenUsed) {
          await this.awaitWithinDeadline(
            this.options.auth.refreshCoordinator.refresh(),
            request.signal,
            deadline,
          );
        }

        // Sólo las lecturas se reproducen automáticamente. Una mutación puede
        // haber tenido efectos aunque su respuesta haya sido 401.
        if (request.method === 'GET') {
          return this.requestAttempt<TResponse>(
            {
              ...request,
              alreadyRetried: true,
              allowRefresh: false,
            },
            deadline,
          );
        }
      }
    }

    if (!response.ok) {
      const error = await this.awaitWithinDeadline(
        this.errorMapper.mapResponse(response),
        request.signal,
        deadline,
      );
      if (
        error.status === 401 &&
        request.requiresAuth === true &&
        request.alreadyRetried === true &&
        this.options.auth?.getAccessToken() === accessTokenUsed
      ) {
        await this.options.auth?.onUnauthorized?.(error);
      }
      throw error;
    }

    return {
      status: response.status,
      headers: response.headers,
      data: (await this.awaitWithinDeadline(
        readSuccessPayload(response),
        request.signal,
        deadline,
      )) as TResponse,
    };
  }

  private async execute(
    request: HttpRequest,
    timeoutMs: number,
  ): Promise<ExecutedRequest> {
    const controller = new AbortController();
    let abortCause: AbortCause;

    const abortFromCaller = () => {
      abortCause = 'cancellation';
      controller.abort();
    };

    if (request.signal?.aborted) {
      abortFromCaller();
    } else {
      request.signal?.addEventListener('abort', abortFromCaller, { once: true });
    }

    const timeout = setTimeout(() => {
      abortCause = 'timeout';
      controller.abort();
    }, timeoutMs);

    const accessToken =
      request.requiresAuth === true
        ? this.options.auth?.getAccessToken()
        : undefined;
    const callerHeaders = safeCallerHeaders(request.headers);

    try {
      const response = await this.fetchImplementation(
        `${this.baseUrl}${API_PREFIX}${normalizePath(request.path)}`,
        {
          method: request.method,
          headers: {
            Accept: 'application/json',
            ...(request.body === undefined
              ? {}
              : { 'Content-Type': 'application/json' }),
            ...callerHeaders,
            ...(accessToken
              ? { Authorization: `Bearer ${accessToken}` }
              : {}),
          },
          body:
            request.body === undefined
              ? undefined
              : JSON.stringify(request.body),
          signal: controller.signal,
        },
      );
      return { response, accessTokenUsed: accessToken };
    } catch (error) {
      throw this.errorMapper.mapError(error, { abortCause });
    } finally {
      clearTimeout(timeout);
      request.signal?.removeEventListener('abort', abortFromCaller);
    }
  }

  private remainingTime(deadline: number): number {
    return Math.max(0, deadline - Date.now());
  }

  private assertRequestIsActive(
    signal: AbortSignal | undefined,
    deadline: number,
  ): void {
    if (signal?.aborted) {
      throw new ApiError(
        0,
        'REQUEST_CANCELLED',
        'La solicitud fue cancelada.',
        undefined,
        undefined,
      );
    }
    if (this.remainingTime(deadline) <= 0) {
      throw new ApiError(
        0,
        'REQUEST_TIMEOUT',
        'La solicitud tardó demasiado. Inténtalo nuevamente.',
        undefined,
        undefined,
      );
    }
  }

  private awaitWithinDeadline<T>(
    operation: Promise<T>,
    signal: AbortSignal | undefined,
    deadline: number,
  ): Promise<T> {
    try {
      this.assertRequestIsActive(signal, deadline);
    } catch (error) {
      return Promise.reject(error);
    }

    return new Promise<T>((resolve, reject) => {
      let settled = false;
      const finish = (callback: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        signal?.removeEventListener('abort', cancel);
        callback();
      };
      const cancel = () =>
        finish(() =>
          reject(
            new ApiError(
              0,
              'REQUEST_CANCELLED',
              'La solicitud fue cancelada.',
              undefined,
              undefined,
            ),
          ),
        );
      const timeout = setTimeout(
        () =>
          finish(() =>
            reject(
              new ApiError(
                0,
                'REQUEST_TIMEOUT',
                'La solicitud tardó demasiado. Inténtalo nuevamente.',
                undefined,
                undefined,
              ),
            ),
          ),
        this.remainingTime(deadline),
      );

      signal?.addEventListener('abort', cancel, { once: true });
      operation.then(
        (value) => finish(() => resolve(value)),
        (error: unknown) => finish(() => reject(error)),
      );
    });
  }
}
