import {
  onlineManager,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useRef } from 'react';

import { FinancialOperationLock } from '@/core/financial';
import { ApiError, type HttpRequest, type HttpResponse } from '@/core/http';
import { useSession } from '@/core/session';
import { instructorKeys } from '@/features/instructor';

import {
  cashRegisterFromResponse,
  closeRequestFromCommand,
  closedCashRegisterFromResponse,
  openRequestFromCommand,
} from '../api/cash-adapter';
import type { CloseCashCommand, OpenCashCommand } from '../model/cash-models';

type AuthorizedRequest = <TResponse>(
  request: Omit<HttpRequest, 'requiresAuth'>,
) => Promise<HttpResponse<TResponse>>;

export const cashKeys = {
  current: () => ['cash-register', 'current'] as const,
};

function absent(error: unknown): boolean {
  return error instanceof ApiError
    && error.status === 404
    && error.code === 'CASH_REGISTER_NOT_OPEN';
}

function offline(): never {
  throw new ApiError(
    0,
    'OFFLINE_FINANCIAL_OPERATION',
    'La caja actual requiere conexión.',
    undefined,
    undefined,
  );
}

export async function fetchCurrentCashRegister(
  authorizedRequest: AuthorizedRequest,
  signal?: AbortSignal,
) {
  try {
    const response = await authorizedRequest<unknown>({
      method: 'GET',
      path: '/cash-register/current',
      signal,
    });
    return cashRegisterFromResponse(response.data);
  } catch (error) {
    if (absent(error)) return null;
    throw error;
  }
}

export async function openCashRegister(
  authorizedRequest: AuthorizedRequest,
  command: OpenCashCommand,
) {
  const response = await authorizedRequest<unknown>({
    method: 'POST',
    path: '/cash-register/open',
    body: openRequestFromCommand(command),
    allowRefresh: false,
  });
  return cashRegisterFromResponse(response.data);
}

export async function closeCashRegister(
  authorizedRequest: AuthorizedRequest,
  command: CloseCashCommand,
) {
  const response = await authorizedRequest<unknown>({
    method: 'POST',
    path: '/cash-register/close',
    body: closeRequestFromCommand(command),
    allowRefresh: false,
  });
  return closedCashRegisterFromResponse(response.data);
}

export function useCurrentCashRegister(options: Readonly<{
  enabled?: boolean;
  permitted: boolean;
}>) {
  const { authorizedRequest } = useSession();
  return useQuery({
    queryKey: cashKeys.current(),
    enabled: (options.enabled ?? true) && options.permitted && Boolean(authorizedRequest),
    staleTime: 5_000,
    retry: false,
    networkMode: 'always',
    queryFn: async ({ signal }) => {
      if (!options.permitted) {
        throw new ApiError(403, 'FORBIDDEN', 'No tienes permiso para consultar caja.', undefined, undefined);
      }
      if (!onlineManager.isOnline()) offline();
      if (!authorizedRequest) throw new Error('La sesión no está disponible.');
      return fetchCurrentCashRegister(authorizedRequest, signal);
    },
  });
}

export async function invalidateCashState(
  client: ReturnType<typeof useQueryClient>,
): Promise<void> {
  await Promise.all([
    client.invalidateQueries({ queryKey: cashKeys.current() }),
    client.invalidateQueries({ queryKey: instructorKeys.todaySummary() }),
  ]);
}

export function useOpenCashRegister(options: Readonly<{ permitted: boolean }>) {
  const { authorizedRequest } = useSession();
  const client = useQueryClient();
  const lock = useRef(new FinancialOperationLock()).current;
  return useMutation({
    retry: 0,
    networkMode: 'always',
    mutationFn: (command: OpenCashCommand) => lock.run(
      {
        isOnline: () => onlineManager.isOnline(),
        isPermitted: () => options.permitted,
      },
      async () => {
        if (!authorizedRequest) throw new Error('La sesión no está disponible.');
        return openCashRegister(authorizedRequest, command);
      },
    ),
    onSuccess: async () => { await invalidateCashState(client); },
  });
}

export function useCloseCashRegister(options: Readonly<{ permitted: boolean }>) {
  const { authorizedRequest } = useSession();
  const client = useQueryClient();
  const lock = useRef(new FinancialOperationLock()).current;
  return useMutation({
    retry: 0,
    networkMode: 'always',
    mutationFn: (command: CloseCashCommand) => lock.run(
      {
        isOnline: () => onlineManager.isOnline(),
        isPermitted: () => options.permitted,
      },
      async () => {
        if (!authorizedRequest) throw new Error('La sesión no está disponible.');
        return closeCashRegister(authorizedRequest, command);
      },
    ),
    onSuccess: async () => { await invalidateCashState(client); },
  });
}
