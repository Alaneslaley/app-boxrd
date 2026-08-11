import {
  onlineManager,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { useRef } from 'react';

import { FinancialOperationLock } from '@/core/financial';
import { ApiError, type HttpRequest, type HttpResponse } from '@/core/http';
import { SystemClock, ZonedBusinessDateProvider } from '@/core/time';
import { useSession } from '@/core/session';
import { cashKeys } from '@/features/cash';
import { instructorKeys } from '@/features/instructor';
import { membershipKeys } from '@/features/students';

import {
  paymentFromResponse,
  paymentQuotesFromResponse,
  paymentRequestFromIntent,
  receiptFromResponse,
  registeredPaymentFromResponse,
} from '../api/payment-adapter';
import type {
  Payment,
  PaymentIntent,
  RegisteredPayment,
} from '../model/payment-models';
import { clearPendingPayment, savePendingPayment } from './payment-retry-store';

const businessDateProvider = new ZonedBusinessDateProvider(new SystemClock());

type AuthorizedRequest = <TResponse>(
  request: Omit<HttpRequest, 'requiresAuth'>,
) => Promise<HttpResponse<TResponse>>;

export const paymentKeys = {
  all: () => ['payments'] as const,
  detail: (paymentId: string) => ['payments', 'detail', paymentId] as const,
  receipt: (paymentId: string) => ['payments', 'receipt', paymentId] as const,
  quote: (planId: string) => ['payments', 'quote', planId] as const,
};

export function currentBusinessDate(): string {
  return businessDateProvider.today();
}

export function isUncertainPaymentError(error: unknown): boolean {
  return error instanceof ApiError
    && error.status === 0
    && error.code !== 'REQUEST_CANCELLED'
    && error.code !== 'OFFLINE_FINANCIAL_OPERATION'
    && error.code !== 'PAYMENT_UNCERTAIN_STORAGE_FAILED';
}

export async function registerPaymentOnce(
  authorizedRequest: AuthorizedRequest,
  intent: PaymentIntent,
): Promise<RegisteredPayment> {
  const response = await authorizedRequest<unknown>({
    method: 'POST',
    path: '/payments',
    headers: { 'Idempotency-Key': intent.idempotencyKey },
    body: paymentRequestFromIntent(intent),
    allowRefresh: false,
  });
  return registeredPaymentFromResponse(response);
}

export async function registerPaymentAndReconcileLocalRetry(
  authorizedRequest: AuthorizedRequest,
  intent: PaymentIntent,
  cleanup: (idempotencyKey: string) => Promise<void> = clearPendingPayment,
): Promise<RegisteredPayment> {
  const registered = await registerPaymentOnce(authorizedRequest, intent);
  try {
    await cleanup(intent.idempotencyKey);
  } catch {
    // El pago ya fue confirmado. Un pending residual sólo puede reproducir la
    // misma intención; nunca debe convertir el éxito autoritativo en fallo.
  }
  return registered;
}

export async function persistPaymentIfUncertain(
  error: unknown,
  intent: PaymentIntent,
): Promise<void> {
  if (!isUncertainPaymentError(error)) return;
  await savePendingPayment(intent);
}

export async function invalidatePaymentState(
  client: QueryClient,
  intent: PaymentIntent,
  payment: Payment,
): Promise<void> {
  const invalidations = [
    client.invalidateQueries({ queryKey: paymentKeys.all() }),
    client.invalidateQueries({ queryKey: paymentKeys.detail(payment.id) }),
    client.invalidateQueries({ queryKey: paymentKeys.receipt(payment.id) }),
    client.invalidateQueries({ queryKey: membershipKeys.detail(intent.membershipId) }),
    client.invalidateQueries({ queryKey: membershipKeys.byStudent(payment.studentId) }),
    client.invalidateQueries({ queryKey: instructorKeys.todaySummary() }),
  ];
  if (intent.method === 'CASH') {
    invalidations.push(client.invalidateQueries({ queryKey: cashKeys.current() }));
  }
  await Promise.all(invalidations);
}

export function usePaymentQuote(
  planId: string,
  options: Readonly<{ enabled: boolean; permitted: boolean }>,
) {
  const { authorizedRequest } = useSession();
  return useQuery({
    queryKey: paymentKeys.quote(planId),
    enabled: options.enabled && options.permitted && Boolean(authorizedRequest),
    staleTime: 60_000,
    retry: false,
    queryFn: async ({ signal }) => {
      if (!options.permitted) {
        throw new ApiError(403, 'FORBIDDEN', 'No tienes permiso para consultar el plan.', undefined, undefined);
      }
      if (!authorizedRequest) throw new Error('La sesión no está disponible.');
      const response = await authorizedRequest<unknown>({
        method: 'GET',
        path: '/plans?page=0&size=100&includeInactive=true',
        signal,
      });
      const quote = paymentQuotesFromResponse(response.data)
        .find((candidate) => candidate.planId === planId);
      if (!quote) {
        throw new ApiError(404, 'PLAN_NOT_FOUND', 'No se encontró el plan de la membresía.', undefined, undefined);
      }
      return quote;
    },
  });
}

export function useRegisterPayment(options: Readonly<{ permitted: boolean }>) {
  const { authorizedRequest } = useSession();
  const client = useQueryClient();
  const lock = useRef(new FinancialOperationLock()).current;
  return useMutation({
    retry: 0,
    networkMode: 'always',
    mutationFn: (intent: PaymentIntent): Promise<RegisteredPayment> => lock.run(
      {
        isOnline: () => onlineManager.isOnline(),
        isPermitted: () => options.permitted,
      },
      async () => {
        if (!authorizedRequest) throw new Error('La sesión no está disponible.');
        try {
          return await registerPaymentAndReconcileLocalRetry(authorizedRequest, intent);
        } catch (error) {
          if (isUncertainPaymentError(error)) {
            try {
              await persistPaymentIfUncertain(error, intent);
            } catch (storageError) {
              throw new ApiError(
                0,
                'PAYMENT_UNCERTAIN_STORAGE_FAILED',
                'No fue posible confirmar el pago ni guardar el reintento seguro. No registres otro cobro.',
                { storageError: storageError instanceof Error ? storageError.name : 'unknown' },
                error instanceof ApiError ? error.traceId : undefined,
              );
            }
          }
          throw error;
        }
      },
    ),
    onSuccess: async (registered, intent) => {
      client.setQueryData(paymentKeys.detail(registered.payment.id), registered.payment);
      await invalidatePaymentState(client, intent, registered.payment);
    },
  });
}

export function usePaymentDetail(
  paymentId: string,
  options: Readonly<{ enabled: boolean; permitted: boolean }>,
) {
  const { authorizedRequest } = useSession();
  return useQuery({
    queryKey: paymentKeys.detail(paymentId),
    enabled: options.enabled && options.permitted && Boolean(authorizedRequest),
    staleTime: 30_000,
    retry: false,
    queryFn: async ({ signal }) => {
      if (!options.permitted) {
        throw new ApiError(403, 'FORBIDDEN', 'No tienes permiso para consultar pagos.', undefined, undefined);
      }
      if (!authorizedRequest) throw new Error('La sesión no está disponible.');
      const response = await authorizedRequest<unknown>({
        method: 'GET',
        path: `/payments/${paymentId}`,
        signal,
      });
      return paymentFromResponse(response.data);
    },
  });
}

export function usePaymentReceipt(
  paymentId: string,
  options: Readonly<{ enabled: boolean; permitted: boolean }>,
) {
  const { authorizedRequest } = useSession();
  return useQuery({
    queryKey: paymentKeys.receipt(paymentId),
    enabled: options.enabled && options.permitted && Boolean(authorizedRequest),
    staleTime: 10_000,
    retry: false,
    queryFn: async ({ signal }) => {
      if (!options.permitted) {
        throw new ApiError(403, 'FORBIDDEN', 'No tienes permiso para consultar recibos.', undefined, undefined);
      }
      if (!authorizedRequest) throw new Error('La sesión no está disponible.');
      const response = await authorizedRequest<unknown>({
        method: 'GET',
        path: `/payments/${paymentId}/receipt`,
        signal,
      });
      return receiptFromResponse(response.data);
    },
  });
}
