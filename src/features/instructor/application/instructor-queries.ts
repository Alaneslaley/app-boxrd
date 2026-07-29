import { useQuery } from '@tanstack/react-query';

import { ApiError } from '@/core/http';
import { useSession } from '@/core/session';
import type { InstructorTodaySummary as InstructorTodaySummaryDto } from '@/generated/api';

export const instructorKeys = {
  todaySummary: () => ['instructor', 'today', 'summary'] as const,
};

export type InstructorTodaySummary = Readonly<{
  businessDate: string;
  branchName: string;
  activeStudents: number;
  attendanceToday: number;
  activeMemberships: number;
  expiringSoonMemberships: number;
  expiredMemberships: number;
}>;

function count(value: number | undefined, field: string): number {
  if (value === undefined || !Number.isSafeInteger(value) || value < 0) {
    throw new ApiError(502, 'MALFORMED_SUMMARY_RESPONSE', `El resumen contiene un conteo inválido (${field}).`, undefined, undefined);
  }
  return value;
}

export function instructorTodaySummaryFromDto(value: InstructorTodaySummaryDto): InstructorTodaySummary {
  if (!value.businessDate?.trim() || !value.name?.trim()) {
    throw new ApiError(502, 'MALFORMED_SUMMARY_RESPONSE', 'El resumen operativo está incompleto.', undefined, undefined);
  }
  return {
    businessDate: value.businessDate,
    branchName: value.name,
    activeStudents: count(value.activeStudents, 'activeStudents'),
    attendanceToday: count(value.attendanceToday, 'attendanceToday'),
    activeMemberships: count(value.activeMemberships, 'activeMemberships'),
    expiringSoonMemberships: count(value.expiringSoonMemberships, 'expiringSoonMemberships'),
    expiredMemberships: count(value.expiredMemberships, 'expiredMemberships'),
  };
}

export function useInstructorTodaySummary() {
  const { authorizedRequest } = useSession();
  return useQuery({
    queryKey: instructorKeys.todaySummary(), staleTime: 30_000, enabled: Boolean(authorizedRequest),
    queryFn: async ({ signal }) => {
      if (!authorizedRequest) throw new Error('La sesión no está disponible.');
      const response = await authorizedRequest<InstructorTodaySummaryDto>({ method: 'GET', path: '/instructor/today/summary', signal });
      return instructorTodaySummaryFromDto(response.data);
    },
  });
}
