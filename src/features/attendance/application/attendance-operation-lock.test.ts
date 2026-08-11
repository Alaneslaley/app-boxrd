import {
  AttendanceOperationLock,
  type AttendanceOperationPreconditions,
} from './attendance-operation-lock';

const studentId = '33333333-3333-4333-8333-333333333333';
const ready = { isOnline: () => true, isPermitted: () => true };

describe('AttendanceOperationLock', () => {
  it('impide una segunda operación concurrente para el mismo alumno', async () => {
    const lock = new AttendanceOperationLock();
    let finish: () => void = () => undefined;
    const pending = lock.run(studentId, ready, () => new Promise<void>((resolve) => {
      finish = resolve;
    }));

    await expect(lock.run(studentId, ready, async () => undefined)).rejects.toMatchObject({
      status: 409,
      code: 'ATTENDANCE_OPERATION_IN_PROGRESS',
    });
    finish();
    await pending;
  });

  const rejectedPreconditions: readonly [AttendanceOperationPreconditions, string][] = [
    [{ isOnline: (): boolean => false, isPermitted: (): boolean => true }, 'OFFLINE_ATTENDANCE_OPERATION'],
    [{ isOnline: (): boolean => true, isPermitted: (): boolean => false }, 'FORBIDDEN'],
  ];

  it.each(rejectedPreconditions)('frena precondición local sin ejecutar HTTP', async (preconditions, code) => {
    const operation = jest.fn(async () => undefined);
    await expect(new AttendanceOperationLock().run(studentId, preconditions, operation))
      .rejects.toEqual(expect.objectContaining({ code }));
    expect(operation).not.toHaveBeenCalled();
  });

  it('libera el alumno después de un error', async () => {
    const lock = new AttendanceOperationLock();
    await expect(lock.run(studentId, ready, async () => {
      throw new Error('fallo');
    })).rejects.toThrow('fallo');
    await expect(lock.run(studentId, ready, async () => 'ok')).resolves.toBe('ok');
  });
});
