import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { ApiError } from '@/core/http';
import { ExpoIdempotencyKeyFactory, type IdempotencyKey } from '@/core/idempotency';
import { useSession } from '@/core/session';
import { cashKeys } from '@/features/cash';
import { instructorKeys } from '@/features/instructor';
import { membershipKeys } from '@/features/students';
import type { PaymentSnapshot, ReceiptSnapshot, RegisterRequest } from '@/generated/api';

import { clearPendingPayment, savePendingPayment, type PendingPayment } from './payment-retry-store';

export const paymentKeys = {
  all: () => ['payments'] as const,
  detail: (paymentId: string) => ['payments', 'detail', paymentId] as const,
  receipt: (paymentId: string) => ['payments', 'receipt', paymentId] as const,
};

export type PaymentRegistration = Readonly<{
  request: RegisterRequest;
  idempotencyKey: IdempotencyKey;
}>;

export type RegisteredPayment = Readonly<{
  payment: PaymentSnapshot;
  replayed: boolean;
}>;

export function createPaymentRegistration(request: RegisterRequest): PaymentRegistration {
  return { request, idempotencyKey: new ExpoIdempotencyKeyFactory().create() };
}

function isUncertain(error: unknown): boolean {
  return error instanceof ApiError
    && error.status === 0
    && error.code !== 'REQUEST_CANCELLED';
}

function toPending(value: PaymentRegistration): PendingPayment {
  return { idempotencyKey: value.idempotencyKey, request: value.request };
}

function invalidateFinancialState(client: QueryClient): Promise<void> {
  return Promise.all([
    client.invalidateQueries({ queryKey: paymentKeys.all() }),
    client.invalidateQueries({ queryKey: cashKeys.current() }),
    client.invalidateQueries({ queryKey: membershipKeys.all() }),
    client.invalidateQueries({ queryKey: instructorKeys.todaySummary() }),
  ]).then(() => undefined);
}

export function useRegisterPayment() {
  const { authorizedRequest } = useSession();
  const client = useQueryClient();
  return useMutation({
    retry: 0,
    networkMode: 'always',
    mutationFn: async (registration: PaymentRegistration): Promise<RegisteredPayment> => {
      if (!authorizedRequest) throw new Error('La sesión no está disponible.');
      try {
        const response = await authorizedRequest<PaymentSnapshot>({
          method: 'POST',
          path: '/payments',
          headers: { 'Idempotency-Key': registration.idempotencyKey },
          body: registration.request,
          allowRefresh: false,
        });
        await clearPendingPayment(registration.idempotencyKey);
        const replayed = response.headers.get('Idempotency-Replayed')?.toLowerCase() === 'true'
          || response.status === 200;
        return { payment: response.data, replayed };
      } catch (error) {
        if (isUncertain(error)) await savePendingPayment(toPending(registration));
        throw error;
      }
    },
    onSuccess: async () => { await invalidateFinancialState(client); },
  });
}

export function usePaymentDetail(paymentId: string, enabled: boolean) {
  const { authorizedRequest } = useSession();
  return useQuery({
    queryKey: paymentKeys.detail(paymentId), enabled: enabled && Boolean(authorizedRequest), staleTime: 30_000,
    queryFn: async ({ signal }) => {
      if (!authorizedRequest) throw new Error('La sesión no está disponible.');
      return (await authorizedRequest<PaymentSnapshot>({ method: 'GET', path: `/payments/${paymentId}`, signal })).data;
    },
  });
}

export function usePaymentReceipt(paymentId: string, enabled: boolean) {
  const { authorizedRequest } = useSession();
  return useQuery({
    queryKey: paymentKeys.receipt(paymentId), enabled: enabled && Boolean(authorizedRequest), staleTime: 10_000,
    queryFn: async ({ signal }) => {
      if (!authorizedRequest) throw new Error('La sesión no está disponible.');
      return (await authorizedRequest<ReceiptSnapshot>({ method: 'GET', path: `/payments/${paymentId}/receipt`, signal })).data;
    },
  });
}
