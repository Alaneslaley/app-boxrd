import * as SecureStore from 'expo-secure-store';

import type { RegisterRequest } from '@/generated/api';

const PENDING_PAYMENT_KEY = 'gymbox.payment.pending.v1';

export type PendingPayment = Readonly<{
  idempotencyKey: string;
  request: RegisterRequest;
}>;

function valid(value: unknown): value is PendingPayment {
  if (!value || typeof value !== 'object') return false;
  const pending = value as Record<string, unknown>;
  const request = pending.request as Record<string, unknown> | undefined;
  return typeof pending.idempotencyKey === 'string'
    && Boolean(pending.idempotencyKey.trim())
    && typeof request?.membershipId === 'string'
    && (request?.method === 'CASH' || request?.method === 'TRANSFER' || request?.method === 'MANUAL_CARD')
    && typeof request?.effectiveDate === 'string';
}

export async function readPendingPayment(): Promise<PendingPayment | undefined> {
  const raw = await SecureStore.getItemAsync(PENDING_PAYMENT_KEY);
  if (!raw) return undefined;
  try {
    const value: unknown = JSON.parse(raw);
    if (valid(value)) return value;
  } catch {
    // A corrupt local retry record must never trigger a payment.
  }
  await SecureStore.deleteItemAsync(PENDING_PAYMENT_KEY);
  return undefined;
}

export async function savePendingPayment(value: PendingPayment): Promise<void> {
  await SecureStore.setItemAsync(PENDING_PAYMENT_KEY, JSON.stringify(value), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function clearPendingPayment(idempotencyKey?: string): Promise<void> {
  if (idempotencyKey) {
    const pending = await readPendingPayment();
    if (pending?.idempotencyKey !== idempotencyKey) return;
  }
  await SecureStore.deleteItemAsync(PENDING_PAYMENT_KEY);
}
