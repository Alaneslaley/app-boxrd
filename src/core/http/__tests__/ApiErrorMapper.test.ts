import { ApiError } from '../ApiError';
import {
  ApiErrorMapper,
  type ApiErrorResponse,
} from '../ApiErrorMapper';

type ResponseOptions = Readonly<{
  status?: number;
  body?: string;
  contentType?: string | undefined;
  headers?: Readonly<Record<string, string>>;
  textError?: Error;
}>;

function responseOf(options: ResponseOptions = {}): {
  response: ApiErrorResponse;
  text: jest.Mock<Promise<string>, []>;
} {
  const headers = new Headers(options.headers);
  if (options.contentType !== undefined) {
    headers.set('content-type', options.contentType);
  }

  const text = options.textError
    ? jest.fn<Promise<string>, []>().mockRejectedValue(options.textError)
    : jest.fn<Promise<string>, []>().mockResolvedValue(options.body ?? '');

  return {
    response: {
      status: options.status ?? 400,
      headers,
      text,
    },
    text,
  };
}

describe('ApiError', () => {
  it('admite la firma del prompt con traceId como quinto argumento', () => {
    const error = new ApiError(
      400,
      'INVALID_REQUEST',
      'Solicitud inválida',
      undefined,
      'trace-prompt',
    );

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.name).toBe('ApiError');
    expect(error.timestamp).toBeUndefined();
    expect(error.traceId).toBe('trace-prompt');
  });

  it('conserva compatibilidad con timestamp y traceId separados', () => {
    const error = new ApiError(
      422,
      'VALIDATION_ERROR',
      'Error',
      { email: 'inválido' },
      '2026-07-23T12:00:00Z',
      'trace-existing',
    );

    expect(error.timestamp).toBe('2026-07-23T12:00:00Z');
    expect(error.traceId).toBe('trace-existing');
  });
});

describe('ApiErrorMapper.mapResponse', () => {
  const mapper = new ApiErrorMapper();

  it('mapea el payload estándar sin exponer el mensaje bruto del backend', async () => {
    const { response } = responseOf({
      status: 422,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({
        code: 'VALIDATION_ERROR',
        message: 'Internal validation detail',
        details: { email: 'required' },
        timestamp: '2026-07-23T12:00:00Z',
        traceId: 'trace-payload',
      }),
      headers: { 'x-trace-id': 'trace-header' },
    });

    const error = await mapper.mapResponse(response);

    expect(error).toMatchObject({
      status: 422,
      code: 'VALIDATION_ERROR',
      message: 'Revisa los datos enviados e inténtalo nuevamente.',
      details: { email: 'required' },
      timestamp: '2026-07-23T12:00:00Z',
      traceId: 'trace-payload',
    });
  });

  it('acepta media types application/*+json', async () => {
    const { response } = responseOf({
      status: 409,
      contentType: 'application/problem+json',
      body: JSON.stringify({
        code: 'STATE_CONFLICT',
        message: 'Conflict',
        traceId: 'trace-problem',
      }),
    });

    await expect(mapper.mapResponse(response)).resolves.toMatchObject({
      code: 'STATE_CONFLICT',
      traceId: 'trace-problem',
    });
  });

  it('usa el traceId de headers cuando el payload no lo contiene', async () => {
    const { response } = responseOf({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ code: 'BAD_REQUEST', message: 'Bad request' }),
      headers: { 'x-request-id': 'request-123' },
    });

    await expect(mapper.mapResponse(response)).resolves.toMatchObject({
      code: 'BAD_REQUEST',
      traceId: 'request-123',
    });
  });

  it('ignora traceId malformados y demasiado largos', async () => {
    const { response } = responseOf({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 'BAD_REQUEST',
        message: 'Bad request',
        traceId: 'trace con espacios',
      }),
      headers: { 'x-trace-id': 'x'.repeat(201) },
    });

    await expect(mapper.mapResponse(response)).resolves.toMatchObject({
      traceId: undefined,
    });
  });

  it.each([
    ['JSON inesperado', JSON.stringify({ error: 'unexpected' })],
    ['array JSON', JSON.stringify([{ code: 'ERROR', message: 'Error' }])],
    ['JSON inválido', '{not-json'],
    ['body vacío', '  '],
  ])('produce un error controlado ante %s', async (_case, body) => {
    const { response } = responseOf({
      status: 400,
      contentType: 'application/json',
      body,
      headers: { 'x-trace-id': 'trace-fallback' },
    });

    await expect(mapper.mapResponse(response)).resolves.toMatchObject({
      status: 400,
      code: 'HTTP_ERROR',
      message: 'Revisa los datos enviados e inténtalo nuevamente.',
      details: undefined,
      timestamp: undefined,
      traceId: 'trace-fallback',
    });
  });

  it('no intenta leer un body con content type incorrecto', async () => {
    const { response, text } = responseOf({
      status: 500,
      contentType: 'text/html',
      body: '<html>stack trace</html>',
      headers: { 'x-trace-id': 'trace-html' },
    });

    const error = await mapper.mapResponse(response);

    expect(text).not.toHaveBeenCalled();
    expect(error).toMatchObject({
      code: 'SERVER_ERROR',
      message: 'El servicio no está disponible temporalmente. Inténtalo más tarde.',
      traceId: 'trace-html',
    });
    expect(error.message).not.toContain('stack trace');
  });

  it('controla errores al leer el body', async () => {
    const { response } = responseOf({
      status: 503,
      contentType: 'application/json',
      textError: new Error('socket closed with secret'),
      headers: { 'x-trace-id': 'trace-read' },
    });

    await expect(mapper.mapResponse(response)).resolves.toMatchObject({
      code: 'SERVER_ERROR',
      traceId: 'trace-read',
    });
  });

  it.each([
    [
      401,
      'UNAUTHORIZED',
      'No fue posible autenticar la solicitud.',
    ],
    [
      403,
      'FORBIDDEN',
      'No tienes permiso para realizar esta acción.',
    ],
    [
      503,
      'SERVER_ERROR',
      'El servicio no está disponible temporalmente. Inténtalo más tarde.',
    ],
  ])(
    'normaliza HTTP %i como %s con mensaje público',
    async (status, code, message) => {
      const { response } = responseOf({
        status,
        contentType: 'application/json',
        body: '',
      });

      await expect(mapper.mapResponse(response)).resolves.toMatchObject({
        status,
        code,
        message,
      });
    },
  );

  it('conserva el code estándar en 401 pero no su mensaje potencialmente sensible', async () => {
    const { response } = responseOf({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 'INVALID_CREDENTIALS',
        message: 'Password=secret@example.com',
        traceId: 'trace-auth',
      }),
    });

    const error = await mapper.mapResponse(response);

    expect(error.code).toBe('INVALID_CREDENTIALS');
    expect(error.message).toBe('No fue posible autenticar la solicitud.');
    expect(JSON.stringify(error)).not.toContain('secret@example.com');
  });
});

describe('ApiErrorMapper.mapError', () => {
  const mapper = new ApiErrorMapper();

  it('devuelve sin cambios un ApiError existente', () => {
    const expected = new ApiError(403, 'FORBIDDEN', 'Sin permiso', undefined, 'trace');
    expect(mapper.mapError(expected)).toBe(expected);
  });

  it.each([
    [Object.assign(new Error('timed out'), { name: 'TimeoutError' }), undefined],
    [Object.assign(new Error('timed out'), { code: 'ETIMEDOUT' }), undefined],
    [new Error('abort'), { abortCause: 'timeout' as const }],
  ])('normaliza timeout sin filtrar el error original', (error, context) => {
    expect(mapper.mapError(error, context)).toMatchObject({
      status: 0,
      code: 'REQUEST_TIMEOUT',
      message: 'La solicitud tardó demasiado. Inténtalo nuevamente.',
    });
  });

  it.each([
    [Object.assign(new Error('aborted'), { name: 'AbortError' }), undefined],
    [new Error('cancelled'), { abortCause: 'cancellation' as const }],
  ])('normaliza cancelación', (error, context) => {
    expect(mapper.mapError(error, context)).toMatchObject({
      status: 0,
      code: 'REQUEST_CANCELLED',
      message: 'La solicitud fue cancelada.',
    });
  });

  it.each([
    new TypeError('Network request failed with internal host'),
    Object.assign(new Error('dns'), { code: 'ENOTFOUND' }),
    Object.assign(new Error('offline'), { code: 'ENETUNREACH' }),
  ])('normaliza errores de red', (error) => {
    const mapped = mapper.mapError(error);
    expect(mapped).toMatchObject({
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'No fue posible conectar con el servicio. Revisa tu conexión.',
    });
    expect(mapped.message).not.toContain(error.message);
  });

  it('normaliza errores desconocidos sin exponer detalles técnicos', () => {
    const mapped = mapper.mapError(new Error('SQL password=secret'));
    expect(mapped).toMatchObject({
      status: 0,
      code: 'UNEXPECTED_ERROR',
      message: 'Ocurrió un error inesperado. Inténtalo nuevamente.',
    });
    expect(mapped.message).not.toContain('secret');
  });

  it('preserva sólo un traceId de transporte válido', () => {
    const withTrace = Object.assign(new Error('network'), {
      code: 'ECONNRESET',
      traceId: 'transport-trace-1',
    });
    const malformed = Object.assign(new Error('network'), {
      code: 'ECONNRESET',
      traceId: 'trace with spaces',
    });

    expect(mapper.mapError(withTrace).traceId).toBe('transport-trace-1');
    expect(mapper.mapError(malformed).traceId).toBeUndefined();
  });
});
