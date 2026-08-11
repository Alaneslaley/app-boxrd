import { ApiError } from '@/core/http';

import { FinancialOperationLock } from './FinancialOperationLock';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

describe('FinancialOperationLock', () => {
  it('bloquea el segundo submit síncrono y ejecuta una sola operación', async () => {
    const lock = new FinancialOperationLock();
    const request = deferred<string>();
    const execute = jest.fn(() => request.promise);
    const preconditions = { isOnline: () => true, isPermitted: () => true };

    const first = lock.run(preconditions, execute);
    const second = lock.run(preconditions, execute);

    await expect(second).rejects.toMatchObject({
      status: 409,
      code: 'FINANCIAL_OPERATION_IN_PROGRESS',
    });
    expect(execute).toHaveBeenCalledTimes(1);
    request.resolve('ok');
    await expect(first).resolves.toBe('ok');
  });

  it('revalida offline y no crea una operación HTTP', async () => {
    const execute = jest.fn(async () => 'ok');
    const lock = new FinancialOperationLock();

    await expect(lock.run(
      { isOnline: () => false, isPermitted: () => true },
      execute,
    )).rejects.toMatchObject({ status: 0, code: 'OFFLINE_FINANCIAL_OPERATION' });
    expect(execute).not.toHaveBeenCalled();
  });

  it('revalida permiso y no crea una operación HTTP', async () => {
    const execute = jest.fn(async () => 'ok');
    const lock = new FinancialOperationLock();

    await expect(lock.run(
      { isOnline: () => true, isPermitted: () => false },
      execute,
    )).rejects.toBeInstanceOf(ApiError);
    expect(execute).not.toHaveBeenCalled();
  });
});
