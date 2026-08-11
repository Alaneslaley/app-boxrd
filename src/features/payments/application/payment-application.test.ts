import * as SecureStore from 'expo-secure-store';
import type { QueryClient } from '@tanstack/react-query';

import { ApiError } from '@/core/http';

import type { PaymentIntent } from '../model/payment-models';
import {
  invalidatePaymentState,
  isUncertainPaymentError,
  persistPaymentIfUncertain,
  registerPaymentAndReconcileLocalRetry,
  registerPaymentOnce,
} from './payments';

jest.mock('expo-secure-store', () => ({
  deleteItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
}));

const ids = {
  payment: '11111111-1111-4111-8111-111111111111',
  branch: '22222222-2222-4222-8222-222222222222',
  student: '33333333-3333-4333-8333-333333333333',
  membership: '44444444-4444-4444-8444-444444444444',
  key: '55555555-5555-4555-8555-555555555555',
};
const intent: PaymentIntent = {
  idempotencyKey: ids.key,
  fingerprint: 'a'.repeat(64),
  membershipId: ids.membership,
  method: 'CASH',
  effectiveDate: '2026-08-10',
  createdAt: '2026-08-10T12:00:00.000Z',
  expiresAt: '2026-08-11T12:00:00.000Z',
};
const payment = {
  id: ids.payment,
  folio: 'PAY-0001',
  branchId: ids.branch,
  studentId: ids.student,
  membershipId: ids.membership,
  amount: 850,
  currency: 'MXN',
  method: 'CASH',
  concept: 'MEMBERSHIP_RENEWAL',
  status: 'REGISTERED',
  effectiveDate: '2026-08-10',
  createdAt: '2026-08-10T12:01:00Z',
} as const;

function response(status: 200 | 201, replayed: 'true' | 'false') {
  const headers = new Headers();
  headers.set('Idempotency-Replayed', replayed);
  return { status, headers, data: payment };
}

describe('payment application', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(SecureStore.setItemAsync).mockResolvedValue();
  });

  it('envía request/header exactos y valida creación 201/false', async () => {
    const authorizedRequest = jest.fn(async (_request: unknown) => response(201, 'false'));

    await expect(registerPaymentOnce(authorizedRequest as never, intent)).resolves.toMatchObject({
      outcome: 'created', payment: { id: ids.payment },
    });
    expect(authorizedRequest).toHaveBeenCalledWith({
      method: 'POST',
      path: '/payments',
      headers: { 'Idempotency-Key': ids.key },
      body: {
        membershipId: ids.membership,
        method: 'CASH',
        effectiveDate: '2026-08-10',
      },
      allowRefresh: false,
    });
  });

  it('valida replay 200/true y reutiliza la misma intención sin cambiar key/payload', async () => {
    const authorizedRequest = jest.fn(async (_request: unknown) => response(200, 'true'));

    await expect(registerPaymentOnce(authorizedRequest as never, intent)).resolves.toMatchObject({ outcome: 'replayed' });
    await expect(registerPaymentOnce(authorizedRequest as never, intent)).resolves.toMatchObject({ outcome: 'replayed' });

    expect(authorizedRequest).toHaveBeenCalledTimes(2);
    expect(authorizedRequest.mock.calls[0]?.[0]).toEqual(authorizedRequest.mock.calls[1]?.[0]);
  });

  it('conserva éxito confirmado aunque falle el cleanup local del pending', async () => {
    const authorizedRequest = jest.fn(async (_request: unknown) => response(200, 'true'));
    const cleanup = jest.fn().mockRejectedValue(new Error('SecureStore unavailable'));

    await expect(registerPaymentAndReconcileLocalRetry(
      authorizedRequest as never,
      intent,
      cleanup,
    )).resolves.toMatchObject({ outcome: 'replayed', payment: { id: ids.payment } });
    expect(cleanup).toHaveBeenCalledWith(ids.key);
  });

  it('no reclasifica un fallo de resguardo local como transport uncertain', () => {
    expect(isUncertainPaymentError(new ApiError(
      0,
      'PAYMENT_UNCERTAIN_STORAGE_FAILED',
      'No se pudo guardar el reintento.',
      undefined,
      undefined,
    ))).toBe(false);
  });

  it('persiste sólo transport failure como uncertain y no lo reintenta', async () => {
    const error = new ApiError(0, 'REQUEST_TIMEOUT', 'Timeout.', undefined, 'trace-timeout');

    await persistPaymentIfUncertain(error, intent);

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'gymbox.payment.pending.v2',
      JSON.stringify({ version: 1, state: 'uncertain', ...intent }),
      { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY },
    );
  });

  it.each([
    new ApiError(500, 'SERVER_ERROR', 'Error interno.', undefined, 'trace-500'),
    new ApiError(409, 'IDEMPOTENCY_KEY_CONFLICT', 'Conflicto.', undefined, 'trace-409'),
    new ApiError(0, 'OFFLINE_FINANCIAL_OPERATION', 'Offline local.', undefined, undefined),
  ])('no persiste HTTP/local %s como uncertain', async (error) => {
    await persistPaymentIfUncertain(error, intent);
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  it('invalida keys precisas después de CASH confirmado', async () => {
    const invalidateQueries = jest.fn(async () => undefined);
    const client = { invalidateQueries } as unknown as QueryClient;

    await invalidatePaymentState(client, intent, {
      ...payment,
      method: 'CASH',
    });

    expect(invalidateQueries.mock.calls).toEqual([
      [{ queryKey: ['payments'] }],
      [{ queryKey: ['payments', 'detail', ids.payment] }],
      [{ queryKey: ['payments', 'receipt', ids.payment] }],
      [{ queryKey: ['memberships', 'detail', ids.membership] }],
      [{ queryKey: ['memberships', 'student', ids.student] }],
      [{ queryKey: ['instructor', 'today', 'summary'] }],
      [{ queryKey: ['cash-register', 'current'] }],
    ]);
  });

  it('TRANSFER no invalida caja, pero reconcilia pago/membresía/resumen', async () => {
    const invalidateQueries = jest.fn(async () => undefined);
    const client = { invalidateQueries } as unknown as QueryClient;

    await invalidatePaymentState(client, { ...intent, method: 'TRANSFER' }, {
      ...payment,
      method: 'TRANSFER',
    });

    expect(invalidateQueries).toHaveBeenCalledTimes(6);
    expect(invalidateQueries).not.toHaveBeenCalledWith({ queryKey: ['cash-register', 'current'] });
  });
});
