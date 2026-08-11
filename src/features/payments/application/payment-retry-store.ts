import * as SecureStore from 'expo-secure-store';

import { isUuid } from '@/core/validation';

import type { PaymentIntent, PaymentMethod, PendingPayment } from '../model/payment-models';
import { PAYMENT_INTENT_TTL_MS, paymentFingerprint } from './payment-intent';

export const PENDING_PAYMENT_KEY = 'gymbox.payment.pending.v2';
const LEGACY_PENDING_PAYMENT_KEY = 'gymbox.payment.pending.v1';

export type PendingPaymentStoreDependencies = Readonly<{
  now(): Date;
  fingerprint(input: Readonly<{
    membershipId: string;
    method: PaymentMethod;
    effectiveDate: string;
  }>): Promise<string>;
}>;

const defaults: PendingPaymentStoreDependencies = {
  now: () => new Date(),
  fingerprint: paymentFingerprint,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function validMethod(value: unknown): value is PaymentMethod {
  return value === 'CASH' || value === 'TRANSFER' || value === 'MANUAL_CARD';
}

function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function validIsoTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function paymentIntentFromPending(value: PendingPayment): PaymentIntent {
  return Object.freeze({
    idempotencyKey: value.idempotencyKey,
    fingerprint: value.fingerprint,
    membershipId: value.membershipId,
    method: value.method,
    effectiveDate: value.effectiveDate,
    createdAt: value.createdAt,
    expiresAt: value.expiresAt,
  });
}

async function validated(
  value: unknown,
  dependencies: PendingPaymentStoreDependencies,
): Promise<PendingPayment | undefined> {
  if (!isRecord(value)) return undefined;
  if (value.version !== 1 || value.state !== 'uncertain') return undefined;
  if (!isUuid(value.idempotencyKey) || !isUuid(value.membershipId)) return undefined;
  if (!validMethod(value.method) || !validDate(value.effectiveDate)) return undefined;
  if (typeof value.fingerprint !== 'string' || !/^[0-9a-f]{64}$/.test(value.fingerprint)) return undefined;
  if (!validIsoTimestamp(value.createdAt) || !validIsoTimestamp(value.expiresAt)) return undefined;

  const createdAt = Date.parse(value.createdAt);
  const expiresAt = Date.parse(value.expiresAt);
  if (expiresAt - createdAt !== PAYMENT_INTENT_TTL_MS) return undefined;
  if (dependencies.now().getTime() >= expiresAt) return undefined;

  const expected = await dependencies.fingerprint({
    membershipId: value.membershipId,
    method: value.method,
    effectiveDate: value.effectiveDate,
  });
  if (expected.toLowerCase() !== value.fingerprint) return undefined;

  return Object.freeze({
    version: 1,
    state: 'uncertain',
    idempotencyKey: value.idempotencyKey,
    fingerprint: value.fingerprint,
    membershipId: value.membershipId,
    method: value.method,
    effectiveDate: value.effectiveDate,
    createdAt: value.createdAt,
    expiresAt: value.expiresAt,
  });
}

async function removeStoredPayment(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(PENDING_PAYMENT_KEY),
    SecureStore.deleteItemAsync(LEGACY_PENDING_PAYMENT_KEY),
  ]);
}

export async function readPendingPayment(
  dependencies: PendingPaymentStoreDependencies = defaults,
): Promise<PendingPayment | undefined> {
  const raw = await SecureStore.getItemAsync(PENDING_PAYMENT_KEY);
  if (!raw) {
    const legacy = await SecureStore.getItemAsync(LEGACY_PENDING_PAYMENT_KEY);
    if (legacy) await SecureStore.deleteItemAsync(LEGACY_PENDING_PAYMENT_KEY);
    return undefined;
  }
  try {
    const value: unknown = JSON.parse(raw);
    const pending = await validated(value, dependencies);
    if (pending) return pending;
  } catch {
    // A corrupt local retry record must never trigger a payment.
  }
  await removeStoredPayment();
  return undefined;
}

export async function savePendingPayment(intent: PaymentIntent): Promise<void> {
  const value: PendingPayment = {
    version: 1,
    state: 'uncertain',
    ...intent,
  };
  await SecureStore.setItemAsync(PENDING_PAYMENT_KEY, JSON.stringify(value), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function clearPendingPayment(idempotencyKey?: string): Promise<void> {
  if (idempotencyKey) {
    const raw = await SecureStore.getItemAsync(PENDING_PAYMENT_KEY);
    if (raw) {
      try {
        const value: unknown = JSON.parse(raw);
        if (isRecord(value)
          && typeof value.idempotencyKey === 'string'
          && value.idempotencyKey !== idempotencyKey) return;
      } catch {
        // Un registro corrupto debe limpiarse al confirmar una operación.
      }
    }
  }
  await removeStoredPayment();
}

export { paymentIntentFromPending };
export type { PendingPayment } from '../model/payment-models';
