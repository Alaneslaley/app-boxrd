import type { Logger } from './Logger';

const REDACTED = '[REDACTED]';
const CIRCULAR = '[Circular]';
const MAX_DEPTH = '[MaxDepth]';
const UNAVAILABLE = '[Unavailable]';

const DEFAULT_SENSITIVE_KEYS = [
  'password',
  'passcode',
  'accessToken',
  'refreshToken',
  'authorization',
  'cookie',
  'set-cookie',
  'email',
  'firstName',
  'lastName',
  'fullName',
  'phone',
  'phoneNumber',
  'idempotencyKey',
  'openingAmount',
  'countedAmount',
  'expectedCash',
  'difference',
  'amount',
  'externalReference',
  'transferReference',
  'cardReference',
  'pan',
  'cvv',
] as const;

const BEARER_PATTERN = /\bBearer\s+[a-zA-Z0-9._~+/-]+=*/gi;
const JWT_PATTERN =
  /\b[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}\b/g;
const EMAIL_PATTERN = /\b[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g;
const INLINE_SECRET_PATTERN =
  /(\b(?:password|passcode|access[_ -]?token|refresh[_ -]?token|authorization|cookie|set-cookie)\b\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\r\n,;]+)/gi;

export type SanitizingLoggerOptions = Readonly<{
  additionalSensitiveKeys?: readonly string[];
  maxDepth?: number;
}>;

type LogLevel = 'debug' | 'warn' | 'error';

function normalizedKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

function sanitizedString(value: string): string {
  return value
    .replace(BEARER_PATTERN, `Bearer ${REDACTED}`)
    .replace(JWT_PATTERN, REDACTED)
    .replace(INLINE_SECRET_PATTERN, `$1${REDACTED}`)
    .replace(EMAIL_PATTERN, REDACTED);
}

function defineSafeProperty(
  target: Record<string, unknown>,
  key: string,
  value: unknown,
): void {
  Object.defineProperty(target, key, {
    configurable: true,
    enumerable: true,
    value,
    writable: true,
  });
}

function sanitizedValue(
  value: unknown,
  sensitiveKeys: ReadonlySet<string>,
  seen: WeakSet<object>,
  depth: number,
  maximumDepth: number,
): unknown {
  if (typeof value === 'string') return sanitizedString(value);
  if (
    value === null ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'undefined'
  ) {
    return value;
  }
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'symbol') return '[Symbol]';
  if (typeof value === 'function') return '[Function]';
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '[InvalidDate]' : value.toISOString();
  }

  if (depth >= maximumDepth) return MAX_DEPTH;
  if (seen.has(value)) return CIRCULAR;
  seen.add(value);

  try {
    if (Array.isArray(value)) {
      return value.map((item) =>
        sanitizedValue(item, sensitiveKeys, seen, depth + 1, maximumDepth),
      );
    }

    const result: Record<string, unknown> = {};
    if (value instanceof Error) {
      defineSafeProperty(result, 'name', sanitizedString(value.name));
      defineSafeProperty(result, 'message', sanitizedString(value.message));
    }

    for (const key of Object.keys(value)) {
      if (sensitiveKeys.has(normalizedKey(key))) {
        defineSafeProperty(result, key, REDACTED);
        continue;
      }

      try {
        defineSafeProperty(
          result,
          key,
          sanitizedValue(
            (value as Record<string, unknown>)[key],
            sensitiveKeys,
            seen,
            depth + 1,
            maximumDepth,
          ),
        );
      } catch {
        defineSafeProperty(result, key, UNAVAILABLE);
      }
    }

    return result;
  } finally {
    seen.delete(value);
  }
}

export class SanitizingLogger implements Logger {
  private readonly sensitiveKeys: ReadonlySet<string>;
  private readonly maximumDepth: number;

  constructor(
    private readonly delegate: Logger,
    options: SanitizingLoggerOptions = {},
  ) {
    this.sensitiveKeys = new Set(
      [...DEFAULT_SENSITIVE_KEYS, ...(options.additionalSensitiveKeys ?? [])].map(
        normalizedKey,
      ),
    );
    this.maximumDepth = Math.max(1, options.maxDepth ?? 8);
  }

  debug(message: string, context?: Readonly<Record<string, unknown>>): void {
    this.write('debug', message, context);
  }

  warn(message: string, context?: Readonly<Record<string, unknown>>): void {
    this.write('warn', message, context);
  }

  error(message: string, context?: Readonly<Record<string, unknown>>): void {
    this.write('error', message, context);
  }

  private write(
    level: LogLevel,
    message: string,
    context: Readonly<Record<string, unknown>> | undefined,
  ): void {
    const safeMessage = sanitizedString(message);
    if (context === undefined) {
      this.delegate[level](safeMessage);
      return;
    }

    let safeContext: Readonly<Record<string, unknown>>;
    try {
      safeContext = sanitizedValue(
        context,
        this.sensitiveKeys,
        new WeakSet(),
        0,
        this.maximumDepth,
      ) as Readonly<Record<string, unknown>>;
    } catch {
      safeContext = { sanitization: UNAVAILABLE };
    }

    this.delegate[level](safeMessage, safeContext);
  }
}
