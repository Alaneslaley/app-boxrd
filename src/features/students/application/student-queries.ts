import { useQuery } from '@tanstack/react-query';

import { ApiError } from '@/core/http';
import { useSession } from '@/core/session';
import type {
  MembershipSnapshot as MembershipDto,
  StudentResponse as StudentDto,
} from '@/generated/api';

export const studentKeys = {
  all: () => ['students'] as const,
  detail: (studentId: string) => ['students', 'detail', studentId] as const,
};

export const membershipKeys = {
  byStudent: (studentId: string) => ['memberships', 'student', studentId] as const,
};

export type StudentDetail = Readonly<{
  id: string;
  fullName: string;
  phone?: string;
  age?: number;
  ageCategory?: string;
  level?: string;
  status?: string;
  photoFileId?: string;
}>;

export type Membership = Readonly<{
  id: string;
  planName?: string;
  planType?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  includedClasses?: number;
  remainingClasses?: number;
}>;

function clean(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function studentFromDto(value: StudentDto): StudentDetail {
  if (!value.id || !value.fullName?.trim()) {
    throw new ApiError(502, 'MALFORMED_STUDENT_RESPONSE', 'El servicio devolvió un alumno incompleto.', undefined, undefined);
  }
  return {
    id: value.id,
    fullName: value.fullName.trim(),
    phone: clean(value.phone),
    age: value.age,
    ageCategory: clean(value.ageCategory),
    level: clean(value.level),
    status: clean(value.status),
    photoFileId: clean(value.photoFileId),
  };
}

function membershipFromDto(value: MembershipDto): Membership {
  if (!value.id) throw new ApiError(502, 'MALFORMED_MEMBERSHIP_RESPONSE', 'El servicio devolvió una membresía incompleta.', undefined, undefined);
  return {
    id: value.id,
    planName: clean(value.planName), planType: clean(value.planType),
    startDate: clean(value.startDate), endDate: clean(value.endDate), status: clean(value.status),
    includedClasses: value.includedClasses, remainingClasses: value.remainingClasses,
  };
}

export function useStudentDetail(studentId: string, enabled: boolean) {
  const { authorizedRequest } = useSession();
  return useQuery({
    queryKey: studentKeys.detail(studentId),
    enabled: enabled && Boolean(authorizedRequest),
    staleTime: 60_000,
    queryFn: async ({ signal }) => {
      if (!authorizedRequest) throw new Error('La sesión no está disponible.');
      const response = await authorizedRequest<StudentDto>({ method: 'GET', path: `/students/${studentId}`, signal });
      return studentFromDto(response.data);
    },
  });
}

export function useStudentMemberships(studentId: string, enabled: boolean) {
  const { authorizedRequest } = useSession();
  return useQuery({
    queryKey: membershipKeys.byStudent(studentId),
    enabled: enabled && Boolean(authorizedRequest),
    staleTime: 30_000,
    queryFn: async ({ signal }) => {
      if (!authorizedRequest) throw new Error('La sesión no está disponible.');
      const response = await authorizedRequest<MembershipDto[]>({ method: 'GET', path: `/memberships/student/${studentId}`, signal });
      return response.data.map(membershipFromDto);
    },
  });
}
