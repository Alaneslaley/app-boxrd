import { ApiError } from '@/core/http';

import { instructorTodaySummaryFromDto } from '../instructor-queries';

describe('instructor today summary mapper', () => {
  it('adapta los conteos y la sucursal publicados por backend', () => {
    expect(instructorTodaySummaryFromDto({ businessDate: '2026-07-28', name: 'Centro', activeStudents: 10, attendanceToday: 4, activeMemberships: 8, expiringSoonMemberships: 2, expiredMemberships: 1 })).toEqual({ businessDate: '2026-07-28', branchName: 'Centro', activeStudents: 10, attendanceToday: 4, activeMemberships: 8, expiringSoonMemberships: 2, expiredMemberships: 1 });
  });

  it('rechaza conteos negativos sin inventar un resumen', () => {
    expect(() => instructorTodaySummaryFromDto({ businessDate: '2026-07-28', name: 'Centro', activeStudents: -1, attendanceToday: 0, activeMemberships: 0, expiringSoonMemberships: 0, expiredMemberships: 0 })).toThrow(ApiError);
  });
});
