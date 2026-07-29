import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { ApiError } from '@/core/http';
import { useSession } from '@/core/session';
import type {
  MembershipSnapshot as MembershipDto,
  PageResponseStudentSummaryResponse,
  StudentResponse as StudentDto,
  StudentSummaryResponse as StudentSummaryDto,
} from '@/generated/api';

export const STUDENT_SEARCH_MIN_LENGTH = 2;
export const STUDENT_PAGE_SIZE = 20;

export const studentKeys = {
  all: () => ['students'] as const,
  list: (search: string) => ['students', 'list', { search, size: STUDENT_PAGE_SIZE }] as const,
  detail: (studentId: string) => ['students', 'detail', studentId] as const,
};

export const membershipKeys = {
  byStudent: (studentId: string) => ['memberships', 'student', studentId] as const,
};

export type StudentSummary = Readonly<{
  id: string;
  fullName: string;
  phone?: string;
  age?: number;
  ageCategory?: string;
  level?: string;
  status?: string;
  photoFileId?: string;
}>;

export type StudentDetail = StudentSummary;

export type MembershipExpirationStatus =
  | 'ACTIVE'
  | 'EXPIRING_SOON'
  | 'EXPIRED'
  | 'INACTIVE'
  | 'UNKNOWN';

export type Membership = Readonly<{
  id: string;
  planName?: string;
  planType?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  expirationStatus: MembershipExpirationStatus;
  daysUntilExpiration?: number;
  includedClasses?: number;
  remainingClasses?: number;
}>;

export type StudentPage = Readonly<{
  items: readonly StudentSummary[];
  page: number;
  last: boolean;
}>;

function clean(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export function normalizeStudentSearch(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function studentSearchPath(search: string, page: number): `/students?${string}` {
  const query = new URLSearchParams({ search, page: String(page), size: String(STUDENT_PAGE_SIZE) });
  return `/students?${query.toString()}`;
}

function studentFromDto(value: StudentSummaryDto | StudentDto): StudentSummary {
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

export function membershipExpirationStatusFromValue(value: string | undefined): MembershipExpirationStatus {
  switch (value) {
    case 'ACTIVE':
    case 'EXPIRING_SOON':
    case 'EXPIRED':
    case 'INACTIVE':
      return value;
    default:
      return 'UNKNOWN';
  }
}

export function membershipFromDto(value: MembershipDto): Membership {
  if (!value.id) throw new ApiError(502, 'MALFORMED_MEMBERSHIP_RESPONSE', 'El servicio devolvió una membresía incompleta.', undefined, undefined);
  return {
    id: value.id,
    planName: clean(value.planName), planType: clean(value.planType),
    startDate: clean(value.startDate), endDate: clean(value.endDate), status: clean(value.status),
    expirationStatus: membershipExpirationStatusFromValue(value.expirationStatus),
    daysUntilExpiration: value.daysUntilExpiration,
    includedClasses: value.includedClasses, remainingClasses: value.remainingClasses,
  };
}

function pageFromDto(value: PageResponseStudentSummaryResponse): StudentPage {
  const itemsById = new Map<string, StudentSummary>();
  for (const item of value.content ?? []) {
    const student = studentFromDto(item);
    itemsById.set(student.id, student);
  }
  return { items: [...itemsById.values()], page: value.page ?? 0, last: value.last === true };
}

export function useStudentSearch(search: string) {
  const { authorizedRequest } = useSession();
  const normalizedSearch = normalizeStudentSearch(search);
  const enabled = normalizedSearch.length >= STUDENT_SEARCH_MIN_LENGTH && Boolean(authorizedRequest);
  return useInfiniteQuery({
    queryKey: studentKeys.list(normalizedSearch),
    enabled,
    initialPageParam: 0,
    staleTime: 60_000,
    queryFn: async ({ pageParam, signal }) => {
      if (!authorizedRequest) throw new Error('La sesión no está disponible.');
      const response = await authorizedRequest<PageResponseStudentSummaryResponse>({ method: 'GET', path: studentSearchPath(normalizedSearch, pageParam), signal });
      return pageFromDto(response.data);
    },
    getNextPageParam: (lastPage) => lastPage.last ? undefined : lastPage.page + 1,
  });
}

export function dedupeStudentPages(pages: readonly StudentPage[] | undefined): readonly StudentSummary[] {
  const byId = new Map<string, StudentSummary>();
  for (const page of pages ?? []) for (const student of page.items) byId.set(student.id, student);
  return [...byId.values()];
}

export function useStudentDetail(studentId: string, enabled: boolean) {
  const { authorizedRequest } = useSession();
  return useQuery({
    queryKey: studentKeys.detail(studentId), enabled: enabled && Boolean(authorizedRequest), staleTime: 60_000,
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
    queryKey: membershipKeys.byStudent(studentId), enabled: enabled && Boolean(authorizedRequest), staleTime: 30_000,
    queryFn: async ({ signal }) => {
      if (!authorizedRequest) throw new Error('La sesión no está disponible.');
      const response = await authorizedRequest<MembershipDto[]>({ method: 'GET', path: `/memberships/student/${studentId}`, signal });
      return response.data.map(membershipFromDto);
    },
  });
}
