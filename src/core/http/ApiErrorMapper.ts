import { ApiError, type ApiErrorPayload } from './ApiError';

type HeadersReader = Pick<Headers, 'get'>;

export type ApiErrorResponse = Readonly<{
  status: number;
  headers: HeadersReader;
  text(): Promise<string>;
}>;

export type TransportErrorContext = Readonly<{
  abortCause?: 'timeout' | 'cancellation';
}>;

const NETWORK_ERROR_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ENETDOWN',
  'ENETUNREACH',
  'ENOTFOUND',
  'EPIPE',
]);

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown, maximumLength: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  if (!normalized || normalized.length > maximumLength) return undefined;
  return normalized;
}

function readTraceId(value: unknown): string | undefined {
  const traceId = readString(value, 200);
  if (!traceId || !/^[a-zA-Z0-9._:-]+$/.test(traceId)) return undefined;
  return traceId;
}

function readHeader(headers: HeadersReader, name: string): string | undefined {
  try {
    return headers.get(name) ?? undefined;
  } catch {
    return undefined;
  }
}

function traceIdFromHeaders(headers: HeadersReader): string | undefined {
  for (const name of ['x-trace-id', 'trace-id', 'x-request-id']) {
    const traceId = readTraceId(readHeader(headers, name));
    if (traceId) return traceId;
  }
  return undefined;
}

function isJsonContentType(contentType: string | undefined): boolean {
  if (!contentType) return false;
  const mediaType = contentType.split(';', 1)[0]?.trim().toLowerCase();
  return mediaType === 'application/json' || mediaType?.endsWith('+json') === true;
}

function expectedPayload(value: unknown): ApiErrorPayload | undefined {
  if (!isRecord(value)) return undefined;

  const code = readString(value.code, 120);
  const message = readString(value.message, 1_000);
  if (!code || !message) return undefined;

  return {
    code,
    message,
    details: isRecord(value.details) ? value.details : undefined,
    timestamp: readString(value.timestamp, 100),
    traceId: readTraceId(value.traceId),
  };
}

function fallbackCode(status: number): string {
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 408) return 'REQUEST_TIMEOUT';
  if (status === 429) return 'TOO_MANY_REQUESTS';
  if (status >= 500) return 'SERVER_ERROR';
  return 'HTTP_ERROR';
}

function publicMessage(status: number): string {
  if (status === 400 || status === 422) {
    return 'Revisa los datos enviados e inténtalo nuevamente.';
  }
  if (status === 401) {
    return 'No fue posible autenticar la solicitud.';
  }
  if (status === 403) {
    return 'No tienes permiso para realizar esta acción.';
  }
  if (status === 404) {
    return 'No se encontró el recurso solicitado.';
  }
  if (status === 408) {
    return 'La solicitud tardó demasiado. Inténtalo nuevamente.';
  }
  if (status === 409) {
    return 'La operación entra en conflicto con el estado actual.';
  }
  if (status === 429) {
    return 'Hay demasiadas solicitudes. Inténtalo más tarde.';
  }
  if (status >= 500) {
    return 'El servicio no está disponible temporalmente. Inténtalo más tarde.';
  }
  return 'La solicitud no pudo completarse. Inténtalo nuevamente.';
}

function errorProperty(error: unknown, property: string): unknown {
  if (!isRecord(error)) return undefined;
  try {
    return error[property];
  } catch {
    return undefined;
  }
}

function errorName(error: unknown): string | undefined {
  return readString(errorProperty(error, 'name'), 100);
}

function errorCode(error: unknown): string | undefined {
  return readString(errorProperty(error, 'code'), 100);
}

function traceIdFromError(error: unknown): string | undefined {
  return readTraceId(errorProperty(error, 'traceId'));
}

export class ApiErrorMapper {
  async mapResponse(response: ApiErrorResponse): Promise<ApiError> {
    const headerTraceId = traceIdFromHeaders(response.headers);
    const contentType = readHeader(response.headers, 'content-type');
    let parsedPayload: ApiErrorPayload | undefined;

    if (isJsonContentType(contentType)) {
      try {
        const body = await response.text();
        if (body.trim()) {
          parsedPayload = expectedPayload(JSON.parse(body));
        }
      } catch {
        parsedPayload = undefined;
      }
    }

    return new ApiError(
      response.status,
      parsedPayload?.code ?? fallbackCode(response.status),
      publicMessage(response.status),
      parsedPayload?.details,
      parsedPayload?.timestamp,
      parsedPayload?.traceId ?? headerTraceId,
    );
  }

  mapError(error: unknown, context: TransportErrorContext = {}): ApiError {
    if (error instanceof ApiError) return error;

    const name = errorName(error);
    const code = errorCode(error)?.toUpperCase();
    const traceId = traceIdFromError(error);

    if (
      context.abortCause === 'timeout' ||
      name === 'TimeoutError' ||
      code === 'ETIMEDOUT' ||
      code === 'ECONNABORTED'
    ) {
      return new ApiError(
        0,
        'REQUEST_TIMEOUT',
        'La solicitud tardó demasiado. Inténtalo nuevamente.',
        undefined,
        traceId,
      );
    }

    if (context.abortCause === 'cancellation' || name === 'AbortError') {
      return new ApiError(
        0,
        'REQUEST_CANCELLED',
        'La solicitud fue cancelada.',
        undefined,
        traceId,
      );
    }

    if (
      error instanceof TypeError ||
      (code !== undefined && NETWORK_ERROR_CODES.has(code))
    ) {
      return new ApiError(
        0,
        'NETWORK_ERROR',
        'No fue posible conectar con el servicio. Revisa tu conexión.',
        undefined,
        traceId,
      );
    }

    return new ApiError(
      0,
      'UNEXPECTED_ERROR',
      'Ocurrió un error inesperado. Inténtalo nuevamente.',
      undefined,
      traceId,
    );
  }
}
