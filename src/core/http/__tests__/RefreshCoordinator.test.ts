import {
  RefreshCoordinator,
  RefreshInvalidatedError,
} from '../RefreshCoordinator';

type Deferred<T> = Readonly<{
  promise: Promise<T>;
  resolve(value: T | PromiseLike<T>): void;
  reject(reason?: unknown): void;
}>;

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
}

describe('RefreshCoordinator', () => {
  it('comparte exactamente la misma Promise entre cinco refresh concurrentes', async () => {
    const gate = deferred<void>();
    const refreshAction = jest.fn<Promise<void>, []>(() => gate.promise);
    const coordinator = new RefreshCoordinator(refreshAction);

    const refreshes = Array.from({ length: 5 }, () => coordinator.refresh());

    expect(new Set(refreshes).size).toBe(1);
    expect(refreshes.every((refresh) => refresh === refreshes[0])).toBe(true);
    expect(coordinator.hasActiveRefresh()).toBe(true);

    await Promise.resolve();
    expect(refreshAction).toHaveBeenCalledTimes(1);

    gate.resolve(undefined);
    await Promise.all(refreshes);

    expect(coordinator.hasActiveRefresh()).toBe(false);
  });

  it('propaga el mismo fallo a todos y permite un refresh posterior', async () => {
    const failure = new Error('refresh rejected');
    const refreshAction = jest
      .fn<Promise<void>, []>()
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce(undefined);
    const coordinator = new RefreshCoordinator(refreshAction);

    const first = coordinator.refresh();
    const second = coordinator.refresh();
    const outcomes = await Promise.allSettled([first, second]);

    expect(first).toBe(second);
    expect(outcomes).toEqual([
      { status: 'rejected', reason: failure },
      { status: 'rejected', reason: failure },
    ]);
    expect(coordinator.hasActiveRefresh()).toBe(false);

    await expect(coordinator.refresh()).resolves.toBeUndefined();
    expect(refreshAction).toHaveBeenCalledTimes(2);
  });

  it('invalida un resultado tardío sin permitir que limpie el refresh nuevo', async () => {
    const firstGate = deferred<void>();
    const secondGate = deferred<void>();
    const refreshAction = jest
      .fn<Promise<void>, []>()
      .mockImplementationOnce(() => firstGate.promise)
      .mockImplementationOnce(() => secondGate.promise);
    const coordinator = new RefreshCoordinator(refreshAction);

    const staleRefresh = coordinator.refresh();
    await Promise.resolve();
    coordinator.invalidate();

    const currentRefresh = coordinator.refresh();
    await Promise.resolve();

    firstGate.resolve(undefined);
    await expect(staleRefresh).rejects.toBeInstanceOf(RefreshInvalidatedError);
    expect(coordinator.hasActiveRefresh()).toBe(true);

    secondGate.resolve(undefined);
    await expect(currentRefresh).resolves.toBeUndefined();

    expect(refreshAction).toHaveBeenCalledTimes(2);
    expect(coordinator.hasActiveRefresh()).toBe(false);
  });
});
