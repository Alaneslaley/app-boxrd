export type ApiErrorPayload = Readonly<{
  code: string;
  message: string;
  details?: Readonly<Record<string, unknown>>;
  timestamp?: string;
  traceId?: string;
}>;

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: Readonly<Record<string, unknown>> | undefined,
    readonly timestamp: string | undefined,
    readonly traceId: string | undefined,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
