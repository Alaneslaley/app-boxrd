export type ApiErrorPayload = Readonly<{
  code: string;
  message: string;
  details?: Readonly<Record<string, unknown>>;
  timestamp?: string;
  traceId?: string;
}>;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: Readonly<Record<string, unknown>> | undefined;
  readonly timestamp: string | undefined;
  readonly traceId: string | undefined;

  constructor(
    status: number,
    code: string,
    message: string,
    details: Readonly<Record<string, unknown>> | undefined,
    traceId: string | undefined,
  );

  constructor(
    status: number,
    code: string,
    message: string,
    details: Readonly<Record<string, unknown>> | undefined,
    timestamp: string | undefined,
    traceId: string | undefined,
  );

  constructor(
    status: number,
    code: string,
    message: string,
    details: Readonly<Record<string, unknown>> | undefined,
    timestampOrTraceId: string | undefined,
    traceId?: string,
  ) {
    super(message);

    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;

    const includesTimestamp = arguments.length >= 6;
    this.timestamp = includesTimestamp ? timestampOrTraceId : undefined;
    this.traceId = includesTimestamp ? traceId : timestampOrTraceId;

    Object.setPrototypeOf(this, new.target.prototype);
  }
}
