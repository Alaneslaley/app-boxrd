import {
  attendancePageFromResponse,
  checkInRequest,
  checkInResultFromResponse,
} from './attendance-adapter';

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

describe('attendance adapter', () => {
  it('crea únicamente el payload contractual', () => {
    expect(checkInRequest(ids.student)).toEqual({ studentId: ids.student });
  });

  it('mapea una página y deduplica ids repetidos dentro de ella', () => {
    expect(attendancePageFromResponse({
      content: [attendance, { ...attendance, studentName: 'Ana Actualizada' }],
      page: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
      last: true,
    })).toEqual({
      items: [{ ...attendance, studentName: 'Ana Actualizada' }],
      page: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
      last: true,
    });
  });

  it.each(['ALLOWED', 'ALREADY_REGISTERED'] as const)(
    'acepta y mapea la decisión %s',
    (decision) => {
      expect(checkInResultFromResponse({ decision, attendance }, ids.student)).toMatchObject({
        decision,
        studentId: ids.student,
        studentName: 'Ana Prueba',
      });
    },
  );

  it('respeta que attendance es opcional en el contrato', () => {
    expect(checkInResultFromResponse({ decision: 'ALLOWED' }, ids.student)).toEqual({
      decision: 'ALLOWED',
      studentId: ids.student,
      studentName: undefined,
      photoFileId: undefined,
      age: undefined,
      ageCategory: undefined,
      level: undefined,
      membershipStatus: undefined,
      membershipEndDate: undefined,
      attendance: undefined,
    });
  });

  it.each([
    'BLOCKED_EXPIRED_MEMBERSHIP',
    'BLOCKED_INACTIVE_STUDENT',
  ] as const)('acepta el bloqueo %s sin asistencia creada', (decision) => {
    expect(checkInResultFromResponse({
      decision,
      studentName: 'Ana Prueba',
    }, ids.student)).toMatchObject({ decision, attendance: undefined });
  });

  it.each([
    [{ decision: 'UNKNOWN' }, 'decision'],
    [{ decision: 'ALLOWED', attendance: { ...attendance, studentId: ids.branch } }, 'attendance.studentId'],
  ])('rechaza una respuesta no contractual (%s)', (response, field) => {
    expect(() => checkInResultFromResponse(response, ids.student)).toThrow(
      expect.objectContaining({
        status: 502,
        code: 'ATTENDANCE_CONTRACT_INVALID',
        message: expect.stringContaining(field),
      }),
    );
  });

  it('falla cerrado si el backend omite metadata de siguiente página', () => {
    expect(attendancePageFromResponse({ content: [attendance], page: 0 })).toMatchObject({
      page: 0,
      last: true,
      size: undefined,
      totalElements: undefined,
      totalPages: undefined,
    });
  });
});
