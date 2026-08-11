import * as Crypto from 'expo-crypto';

import {
  ExpoIdempotencyKeyFactory,
  type IdempotencyKeyFactory,
} from '@/core/idempotency';
import { SystemClock, type Clock } from '@/core/time';
import { isUuid } from '@/core/validation';

import type { PaymentDraft, PaymentIntent, PaymentMethod } from '../model/payment-models';

export const PAYMENT_INTENT_TTL_MS = 24 * 60 * 60 * 1_000;

export type PaymentIntentDependencies = Readonly<{
  clock: Clock;
  keyFactory: IdempotencyKeyFactory;
  fingerprint(canonicalInput: string): Promise<string>;
}>;

const methods = new Set<PaymentMethod>(['CASH', 'TRANSFER', 'MANUAL_CARD']);

function validBusinessDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function canonicalPaymentFingerprintInput(input: Readonly<{
  membershipId: string;
  method: PaymentMethod;
  effectiveDate: string;
}>): string {
  return `${input.membershipId}|${input.method}|${input.effectiveDate}`;
}

export async function paymentFingerprint(input: Readonly<{
  membershipId: string;
  method: PaymentMethod;
  effectiveDate: string;
}>, digest: typeof Crypto.digestStringAsync = Crypto.digestStringAsync): Promise<string> {
  return digest(
    Crypto.CryptoDigestAlgorithm.SHA256,
    canonicalPaymentFingerprintInput(input),
  );
}

const defaults: PaymentIntentDependencies = {
  clock: new SystemClock(),
  keyFactory: new ExpoIdempotencyKeyFactory(),
  fingerprint: async (value) => Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    value,
  ),
};

export async function createPaymentIntent(
  draft: Pick<PaymentDraft, 'membershipId' | 'method' | 'effectiveDate'>,
  dependencies: PaymentIntentDependencies = defaults,
): Promise<PaymentIntent> {
  if (!isUuid(draft.membershipId)) throw new Error('membershipId no es un UUID válido.');
  if (!methods.has(draft.method)) throw new Error('El método de pago no es válido.');
  if (!validBusinessDate(draft.effectiveDate)) throw new Error('La fecha efectiva no es válida.');

  const idempotencyKey = dependencies.keyFactory.create();
  if (!isUuid(idempotencyKey)) throw new Error('La llave de idempotencia no es un UUID válido.');
  const now = dependencies.clock.now();
  const createdAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + PAYMENT_INTENT_TTL_MS).toISOString();
  const fingerprint = await dependencies.fingerprint(
    canonicalPaymentFingerprintInput(draft),
  );
  if (!/^[0-9a-f]{64}$/i.test(fingerprint)) {
    throw new Error('El fingerprint SHA-256 no es válido.');
  }

  return Object.freeze({
    idempotencyKey,
    fingerprint: fingerprint.toLowerCase(),
    membershipId: draft.membershipId,
    method: draft.method,
    effectiveDate: draft.effectiveDate,
    createdAt,
    expiresAt,
  });
}
