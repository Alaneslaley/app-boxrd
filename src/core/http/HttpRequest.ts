export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type HttpRequest = Readonly<{
  method: HttpMethod;
  path: `/${string}`;
  headers?: Readonly<Record<string, string>>;
  body?: unknown;
  requiresAuth?: boolean;
  allowRefresh?: boolean;
  alreadyRetried?: boolean;
  signal?: AbortSignal;
  timeoutMs?: number;
}>;
