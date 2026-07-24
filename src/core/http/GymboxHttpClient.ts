import { ApiError, type ApiErrorPayload } from './ApiError';
import type { HttpClient } from './HttpClient';
import type { HttpRequest } from './HttpRequest';
import type { HttpResponse } from './HttpResponse';

const API_PREFIX = '/api/v1';
const DEFAULT_TIMEOUT_MS = 15_000;

function isApiErrorPayload(value: unknown): value is ApiErrorPayload {
  if (!value || typeof value !== 'object') return false;
  const payload = value as Partial<ApiErrorPayload>;
  return typeof payload.code === 'string' && typeof payload.message === 'string';
}

async function readJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type');
  if (!contentType?.includes('application/json')) return undefined;
  return response.json();
}

export class GymboxHttpClient implements HttpClient {
  constructor(private readonly baseUrl: string) {}

  async request<TResponse>(request: HttpRequest): Promise<HttpResponse<TResponse>> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      request.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    );
    const abortFromCaller = () => controller.abort();
    request.signal?.addEventListener('abort', abortFromCaller, { once: true });

    try {
      const response = await fetch(`${this.baseUrl}${API_PREFIX}${request.path}`, {
        method: request.method,
        headers: {
          Accept: 'application/json',
          ...(request.body === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...request.headers,
        },
        body: request.body === undefined ? undefined : JSON.stringify(request.body),
        signal: controller.signal,
      });
      const payload = await readJson(response);

      if (!response.ok) {
        if (isApiErrorPayload(payload)) {
          throw new ApiError(
            response.status,
            payload.code,
            payload.message,
            payload.details,
            payload.timestamp,
            payload.traceId,
          );
        }
        throw new ApiError(
          response.status,
          'HTTP_ERROR',
          'La solicitud no pudo completarse.',
          undefined,
          undefined,
          response.headers.get('x-trace-id') ?? undefined,
        );
      }

      return {
        status: response.status,
        headers: response.headers,
        data: payload as TResponse,
      };
    } finally {
      clearTimeout(timeout);
      request.signal?.removeEventListener('abort', abortFromCaller);
    }
  }
}
