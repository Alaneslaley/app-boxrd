import { QueryClient } from '@tanstack/react-query';

import { ApiError } from '@/core/http';

const NON_RETRYABLE_STATUS = new Set([401, 403, 409, 422]);

export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError) {
    if (NON_RETRYABLE_STATUS.has(error.status)) return false;
    if (error.status < 500) return false;
  }
  return failureCount < 1;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: shouldRetryQuery,
        retryDelay: 1_000,
        refetchOnReconnect: true,
        refetchOnWindowFocus: true,
      },
      mutations: {
        retry: 0,
        networkMode: 'online',
      },
    },
  });
}
