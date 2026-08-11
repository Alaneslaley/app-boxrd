import * as SecureStore from 'expo-secure-store';

import {
  PENDING_PAYMENT_KEY,
  clearPendingPayment,
  paymentIntentFromPending,
  readPendingPayment,
  savePendingPayment,
  type PendingPaymentStoreDependencies,
} from '../payment-retry-store';

jest.mock('expo-secure-store', () => ({
  deleteItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
}));

const getItemAsync = jest.mocked(SecureStore.getItemAsync);
const setItemAsync = jest.mocked(SecureStore.setItemAsync);
const deleteItemAsync = jest.mocked(SecureStore.deleteItemAsync);

const intent = {
  idempotencyKey: '2ec46652-a5d1-4b4e-a366-3d85f33778c0',
  fingerprint: 'a'.repeat(64),
  membershipId: '92e46652-a5d1-4b4e-a366-3d85f33778c0',
  method: 'CASH' as const,
  effectiveDate: '2026-08-10',
  createdAt: '2026-08-10T12:00:00.000Z',
  expiresAt: '2026-08-11T12:00:00.000Z',
};

const pending = { version: 1 as const, state: 'uncertain' as const, ...intent };
const dependencies: PendingPaymentStoreDependencies = {
  now: () => new Date('2026-08-10T18:00:00.000Z'),
  fingerprint: jest.fn(async () => 'a'.repeat(64)),
};

describe('payment retry store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getItemAsync.mockResolvedValue(null);
    setItemAsync.mockResolvedValue();
    deleteItemAsync.mockResolvedValue();
  });

  it('guarda sólo la intención mínima y la misma llave en SecureStore protegido', async () => {
    await savePendingPayment(intent);

    expect(setItemAsync).toHaveBeenCalledWith(
      PENDING_PAYMENT_KEY,
      JSON.stringify(pending),
      { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY },
    );
    const serialized = setItemAsync.mock.calls[0]?.[1] ?? '';
    expect(serialized).not.toContain('request');
    expect(serialized).not.toContain('amount');
    expect(serialized).not.toContain('studentName');
  });

  it('restaura únicamente una operación válida, sin autoenviarla', async () => {
    getItemAsync.mockResolvedValue(JSON.stringify(pending));

    const restored = await readPendingPayment(dependencies);

    expect(restored).toEqual(pending);
    expect(paymentIntentFromPending(restored!)).toEqual(intent);
    expect(dependencies.fingerprint).toHaveBeenCalledWith({
      membershipId: intent.membershipId,
      method: intent.method,
      effectiveDate: intent.effectiveDate,
    });
    expect(deleteItemAsync).not.toHaveBeenCalled();
  });

  it('elimina un registro corrupto para que nunca pueda disparar un pago', async () => {
    getItemAsync.mockResolvedValue('{not-json');

    await expect(readPendingPayment(dependencies)).resolves.toBeUndefined();
    expect(deleteItemAsync).toHaveBeenCalledWith(PENDING_PAYMENT_KEY);
  });

  it.each([
    ['UUID inválido', { idempotencyKey: 'not-a-uuid' }],
    ['fingerprint alterado', { fingerprint: 'b'.repeat(64) }],
    ['TTL distinto', { expiresAt: '2026-08-12T12:00:00.000Z' }],
    ['timestamp inválido', { createdAt: 'yesterday' }],
  ])('descarta restore por %s', async (_name, change) => {
    getItemAsync.mockResolvedValue(JSON.stringify({ ...pending, ...change }));

    await expect(readPendingPayment(dependencies)).resolves.toBeUndefined();
    expect(deleteItemAsync).toHaveBeenCalledWith(PENDING_PAYMENT_KEY);
  });

  it('descarta una intención expirada a las 24 horas', async () => {
    getItemAsync.mockResolvedValue(JSON.stringify(pending));

    await expect(readPendingPayment({
      ...dependencies,
      now: () => new Date(intent.expiresAt),
    })).resolves.toBeUndefined();
  });

  it('descarta una intención cuyo fingerprint recalculado ya no coincide', async () => {
    getItemAsync.mockResolvedValue(JSON.stringify(pending));

    await expect(readPendingPayment({
      ...dependencies,
      fingerprint: async () => 'c'.repeat(64),
    })).resolves.toBeUndefined();
  });

  it('no borra una operación distinta al confirmar otra llave', async () => {
    getItemAsync.mockResolvedValue(JSON.stringify(pending));

    await clearPendingPayment('other-key');

    expect(deleteItemAsync).not.toHaveBeenCalled();
  });

  it('borra la intención actual y el formato legado al confirmar', async () => {
    getItemAsync.mockResolvedValue(JSON.stringify(pending));

    await clearPendingPayment(intent.idempotencyKey);

    expect(deleteItemAsync).toHaveBeenCalledWith(PENDING_PAYMENT_KEY);
    expect(deleteItemAsync).toHaveBeenCalledWith('gymbox.payment.pending.v1');
  });

  it('elimina un registro legado sin restaurar su request arbitrario', async () => {
    getItemAsync
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(JSON.stringify({ idempotencyKey: intent.idempotencyKey, request: {} }));

    await expect(readPendingPayment(dependencies)).resolves.toBeUndefined();
    expect(deleteItemAsync).toHaveBeenCalledWith('gymbox.payment.pending.v1');
  });
});
