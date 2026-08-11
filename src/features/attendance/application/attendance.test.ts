import type { QueryClient } from '@tanstack/react-query';

import {
  attendanceTodayPath,
  dedupeAttendancePages,
  invalidateAttendanceState,
  registerCheckInOnce,
  studentAttendancePath,
} from './attendance';

const ids = {
  attendance: '11111111-1111-4111-8111-111111111111',
  branch: '22222222-2222-4222-8222-222222222222',
  student: '33333333-3333-4333-8333-333333333333',
};
const attendance = {
  id: ids.attendance,
  branchId: ids.branch,
  studentId: ids.student,
  attendanceDate: '2026-08-10',
  checkedInAt: '2026-08-10T14:30:00Z',
  status: 'REGISTERED',
  studentName: 'Ana Prueba',
};

describe('attendance application', () => {
  it('construye rutas paginadas exactas', () => {
    expect(attendanceTodayPath(2)).toBe('/attendance/today?page=2&size=20');
    expect(studentAttendancePath(ids.student, 3)).toBe(
      `/attendance/student/${ids.student}?page=3&size=20`,
    );
  });

  it('envía un único POST sin refresh automático ni campos adicionales', async () => {
    const authorizedRequest = jest.fn(async () => ({
      status: 200,
      headers: new Headers(),
      data: { decision: 'ALLOWED', attendance },
    }));

    await expect(registerCheckInOnce(authorizedRequest as never, ids.student))
      .resolves.toMatchObject({ decision: 'ALLOWED', studentId: ids.student });
    expect(authorizedRequest).toHaveBeenCalledTimes(1);
    expect(authorizedRequest).toHaveBeenCalledWith({
      method: 'POST',
      path: '/attendance/check-in',
      body: { studentId: ids.student },
      allowRefresh: false,
    });
  });

  it('deduplica registros entre páginas', () => {
    const pages = [
      { items: [attendance], page: 0, size: 20, totalElements: 1, totalPages: 2, last: false },
      { items: [{ ...attendance, status: 'UPDATED' }], page: 1, size: 20, totalElements: 1, totalPages: 2, last: true },
    ];
    expect(dedupeAttendancePages(pages)).toEqual([{ ...attendance, status: 'UPDATED' }]);
  });

  it('invalida hoy, historial y resumen después del resultado autoritativo', async () => {
    const invalidateQueries = jest.fn(async () => undefined);
    const client = { invalidateQueries } as unknown as QueryClient;

    await invalidateAttendanceState(client, ids.student);

    expect(invalidateQueries.mock.calls).toEqual([
      [{ queryKey: ['attendance', 'today', { size: 20 }] }],
      [{ queryKey: ['attendance', 'student', ids.student, { size: 20 }] }],
      [{ queryKey: ['instructor', 'today', 'summary'] }],
    ]);
  });
});
