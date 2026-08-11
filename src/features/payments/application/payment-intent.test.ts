import { createHash } from 'node:crypto';
import * as Crypto from 'expo-crypto';

import type { IdempotencyKey, IdempotencyKeyFactory } from '@/core/idempotency';
import type { Clock } from '@/core/time';

import {
  PAYMENT_INTENT_TTL_MS,
  canonicalPaymentFingerprintInput,
  createPaymentIntent,
  paymentFingerprint,
  type PaymentIntentDependencies,
} from './payment-intent';

const membershipId = '92e46652-a5d1-4b4e-a366-3d85f33778c0';
const key = '2ec46652-a5d1-4b4e-a366-3d85f33778c0' as IdempotencyKey;

const clock: Clock = { now: () => new Date('2026-08-10T12:00:00.000Z') };
const keyFactory: IdempotencyKeyFactory = { create: () => key };
const fingerprint = jest.fn(async () => 'a'.repeat(64));
const dependencies: PaymentIntentDependencies = { clock, keyFactory, fingerprint };

describe('PaymentIntent', () => {
  beforeEach(() => { fingerprint.mockClear(); });

  it('nace inmutable sólo después de confirmar con UUID, fingerprint y TTL 24h', async () => {
    const intent = await createPaymentIntent({
      membershipId,
      method: 'CASH',
      effectiveDate: '2026-08-10',
    }, dependencies);

    expect(intent).toEqual({
      idempotencyKey: key,
      fingerprint: 'a'.repeat(64),
      membershipId,
      method: 'CASH',
      effectiveDate: '2026-08-10',
      createdAt: '2026-08-10T12:00:00.000Z',
      expiresAt: '2026-08-11T12:00:00.000Z',
    });
    expect(Object.isFrozen(intent)).toBe(true);
    expect(Date.parse(intent.expiresAt) - Date.parse(intent.createdAt)).toBe(PAYMENT_INTENT_TTL_MS);
  });

  it('usa exclusivamente los tres campos contractuales en orden fijo', async () => {
    await createPaymentIntent({ membershipId, method: 'TRANSFER', effectiveDate: '2026-08-10' }, dependencies);
    expect(fingerprint).toHaveBeenCalledWith(`${membershipId}|TRANSFER|2026-08-10`);
  });

  it.each([
    [{ membershipId: 'invalid', method: 'CASH' as const, effectiveDate: '2026-08-10' }, 'membershipId'],
    [{ membershipId, method: 'CASH' as const, effectiveDate: '2026-02-30' }, 'fecha'],
  ])('rechaza intención inválida (%s)', async (draft, message) => {
    await expect(createPaymentIntent(draft, dependencies)).rejects.toThrow(message);
  });

  it('rechaza key no criptográfica/no UUID', async () => {
    await expect(createPaymentIntent(
      { membershipId, method: 'CASH', effectiveDate: '2026-08-10' },
      { ...dependencies, keyFactory: { create: () => 'weak' as IdempotencyKey } },
    )).rejects.toThrow('UUID');
  });

  it('rechaza fingerprint que no sea SHA-256 hexadecimal', async () => {
    await expect(createPaymentIntent(
      { membershipId, method: 'CASH', effectiveDate: '2026-08-10' },
      { ...dependencies, fingerprint: async () => 'short' },
    )).rejects.toThrow('SHA-256');
  });
});

describe('payment fingerprint', () => {
  const base = { membershipId, method: 'CASH' as const, effectiveDate: '2026-08-10' };
  const digest = jest.fn(async (_algorithm: Crypto.CryptoDigestAlgorithm, value: string) =>
    createHash('sha256').update(value).digest('hex'));

  it('produce el mismo SHA-256 para el mismo payload', async () => {
    await expect(paymentFingerprint(base, digest)).resolves.toBe(await paymentFingerprint(base, digest));
    expect(digest).toHaveBeenCalledWith(
      Crypto.CryptoDigestAlgorithm.SHA256,
      canonicalPaymentFingerprintInput(base),
    );
  });

  it.each([
    [{ ...base, membershipId: '82e46652-a5d1-4b4e-a366-3d85f33778c0' }, 'membershipId'],
    [{ ...base, method: 'TRANSFER' as const }, 'method'],
    [{ ...base, effectiveDate: '2026-08-11' }, 'effectiveDate'],
  ])('cambia al modificar %s', async (changed, _field) => {
    expect(await paymentFingerprint(changed, digest)).not.toBe(await paymentFingerprint(base, digest));
  });

  it('conserva orden canónico estable', () => {
    expect(canonicalPaymentFingerprintInput(base)).toBe(`${membershipId}|CASH|2026-08-10`);
  });
});
