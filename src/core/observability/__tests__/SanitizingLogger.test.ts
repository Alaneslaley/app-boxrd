import type { Logger } from '../Logger';
import { SanitizingLogger } from '../SanitizingLogger';

function createDelegate(): jest.Mocked<Logger> {
  return {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

describe('SanitizingLogger', () => {
  it.each(['debug', 'warn', 'error'] as const)(
    'delega el nivel %s con el mensaje y contexto sanitizados',
    (level) => {
      const delegate = createDelegate();
      const logger = new SanitizingLogger(delegate);

      logger[level]('Operación de usuario@example.com', {
        status: 401,
        traceId: 'trace-1',
        password: 'plain-password',
        access_token: 'access-secret',
        refreshToken: 'refresh-secret',
        headers: {
          Authorization: 'Bearer bearer-secret',
          cookie: 'session=cookie-secret',
          'Set-Cookie': 'session=server-secret',
        },
        profile: {
          email: 'user@example.com',
          firstName: 'Ada',
          lastName: 'Lovelace',
        },
      });

      expect(delegate[level]).toHaveBeenCalledWith(
        'Operación de [REDACTED]',
        {
          status: 401,
          traceId: 'trace-1',
          password: '[REDACTED]',
          access_token: '[REDACTED]',
          refreshToken: '[REDACTED]',
          headers: {
            Authorization: '[REDACTED]',
            cookie: '[REDACTED]',
            'Set-Cookie': '[REDACTED]',
          },
          profile: {
            email: '[REDACTED]',
            firstName: '[REDACTED]',
            lastName: '[REDACTED]',
          },
        },
      );
    },
  );

  it('elimina secretos embebidos en mensajes aunque la clave no esté estructurada', () => {
    const delegate = createDelegate();
    const logger = new SanitizingLogger(delegate);
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature123';

    logger.error(
      `Authorization: Bearer bearer-secret, password=plain secret; jwt=${jwt}`,
    );

    const [message] = delegate.error.mock.calls[0] ?? [];
    expect(message).toContain('[REDACTED]');
    expect(message).not.toContain('bearer-secret');
    expect(message).not.toContain('plain secret');
    expect(message).not.toContain(jwt);
  });

  it('no muta el contexto original', () => {
    const delegate = createDelegate();
    const logger = new SanitizingLogger(delegate);
    const context = {
      nested: {
        password: 'original-secret',
        values: ['visible', { accessToken: 'access-secret' }],
      },
    };

    logger.debug('Operación', context);

    expect(context).toEqual({
      nested: {
        password: 'original-secret',
        values: ['visible', { accessToken: 'access-secret' }],
      },
    });
    expect(delegate.debug.mock.calls[0]?.[1]).not.toBe(context);
  });

  it('maneja referencias circulares sin lanzar', () => {
    const delegate = createDelegate();
    const logger = new SanitizingLogger(delegate);
    const circular: Record<string, unknown> = { operation: 'refresh' };
    circular.self = circular;

    expect(() => logger.warn('Ciclo', circular)).not.toThrow();
    expect(delegate.warn).toHaveBeenCalledWith('Ciclo', {
      operation: 'refresh',
      self: '[Circular]',
    });
  });

  it('sanitiza Error sin incluir stack y conserva metadatos seguros', () => {
    const delegate = createDelegate();
    const logger = new SanitizingLogger(delegate);
    const error = Object.assign(
      new Error('Fallo para user@example.com con Bearer raw-token'),
      {
        code: 'NETWORK_ERROR',
        traceId: 'trace-error',
        refreshToken: 'refresh-secret',
      },
    );

    logger.error('Falló', { error });

    const loggedError = (
      delegate.error.mock.calls[0]?.[1]?.error as Readonly<Record<string, unknown>>
    );
    expect(loggedError).toEqual({
      name: 'Error',
      message: 'Fallo para [REDACTED] con Bearer [REDACTED]',
      code: 'NETWORK_ERROR',
      traceId: 'trace-error',
      refreshToken: '[REDACTED]',
    });
    expect(loggedError).not.toHaveProperty('stack');
  });

  it('permite ampliar claves sensibles y limita la profundidad', () => {
    const delegate = createDelegate();
    const logger = new SanitizingLogger(delegate, {
      additionalSensitiveKeys: ['memberId'],
      maxDepth: 2,
    });

    logger.debug('Profundidad', {
      member_id: 'member-secret',
      levelOne: {
        levelTwo: {
          value: 'hidden-by-depth',
        },
      },
    });

    expect(delegate.debug).toHaveBeenCalledWith('Profundidad', {
      member_id: '[REDACTED]',
      levelOne: {
        levelTwo: '[MaxDepth]',
      },
    });
  });

  it('redacta la telemetría financiera y las claves de idempotencia', () => {
    const delegate = createDelegate();
    const logger = new SanitizingLogger(delegate);

    logger.warn('Pago incierto', {
      idempotencyKey: 'uuid-no-registrable',
      openingAmount: 100,
      countedAmount: 200,
      expectedCash: 150,
      difference: 50,
      amount: 1000,
      transferReference: 'referencia-no-publica',
      cardReference: 'metadato-no-publico',
      PAN: '4111111111111111',
      CVV: '123',
      traceId: 'trace-safe',
    });

    expect(delegate.warn).toHaveBeenCalledWith('Pago incierto', {
      idempotencyKey: '[REDACTED]',
      openingAmount: '[REDACTED]',
      countedAmount: '[REDACTED]',
      expectedCash: '[REDACTED]',
      difference: '[REDACTED]',
      amount: '[REDACTED]',
      transferReference: '[REDACTED]',
      cardReference: '[REDACTED]',
      PAN: '[REDACTED]',
      CVV: '[REDACTED]',
      traceId: 'trace-safe',
    });
  });

  it('preserva la aridad cuando no existe contexto', () => {
    const delegate = createDelegate();
    const logger = new SanitizingLogger(delegate);

    logger.debug('Sin contexto');

    expect(delegate.debug).toHaveBeenCalledWith('Sin contexto');
    expect(delegate.debug.mock.calls[0]).toHaveLength(1);
  });

  it('no interrumpe la aplicación cuando un contexto no puede inspeccionarse', () => {
    const delegate = createDelegate();
    const logger = new SanitizingLogger(delegate);
    const unreadable = new Proxy(
      {},
      {
        ownKeys() {
          throw new Error('No disponible');
        },
      },
    );

    expect(() => logger.warn('Contexto protegido', unreadable)).not.toThrow();
    expect(delegate.warn).toHaveBeenCalledWith('Contexto protegido', {
      sanitization: '[Unavailable]',
    });
  });
});
