import * as SecureStore from 'expo-secure-store';

import { clearPendingPayment, readPendingPayment, savePendingPayment } from '../payment-retry-store';

jest.mock('expo-secure-store', () => ({
  deleteItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
}));

const getItemAsync = jest.mocked(SecureStore.getItemAsync);
const setItemAsync = jest.mocked(SecureStore.setItemAsync);
const deleteItemAsync = jest.mocked(SecureStore.deleteItemAsync);

const pending = {
  idempotencyKey: '2ec46652-a5d1-4b4e-a366-3d85f33778c0',
  request: { membershipId: '92e46652-a5d1-4b4e-a366-3d85f33778c0', method: 'CASH' as const, effectiveDate: '2026-07-29' },
};

describe('payment retry store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getItemAsync.mockResolvedValue(null);
    setItemAsync.mockResolvedValue();
    deleteItemAsync.mockResolvedValue();
  });

  it('guarda el request y la misma llave de idempotencia en SecureStore protegido', async () => {
    await savePendingPayment(pending);

    expect(setItemAsync).toHaveBeenCalledWith(
      'gymbox.payment.pending.v1',
      JSON.stringify(pending),
      { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY },
    );
  });

  it('recupera únicamente una operación pendiente con forma válida', async () => {
    getItemAsync.mockResolvedValue(JSON.stringify(pending));

    await expect(readPendingPayment()).resolves.toEqual(pending);
    expect(deleteItemAsync).not.toHaveBeenCalled();
  });

  it('elimina un registro corrupto para que nunca pueda disparar un pago', async () => {
    getItemAsync.mockResolvedValue('{not-json');

    await expect(readPendingPayment()).resolves.toBeUndefined();
    expect(deleteItemAsync).toHaveBeenCalledWith('gymbox.payment.pending.v1');
  });

  it('no borra una operación distinta al confirmar otra llave', async () => {
    getItemAsync.mockResolvedValue(JSON.stringify(pending));

    await clearPendingPayment('other-key');

    expect(deleteItemAsync).not.toHaveBeenCalled();
  });
});
