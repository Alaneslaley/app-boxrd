import {
  onlineManager,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { useRef } from 'react';

import { ApiError, type HttpRequest, type HttpResponse } from '@/core/http';
import { useSession } from '@/core/session';
import { instructorKeys } from '@/features/instructor';
import type { PageResponseAttendanceResponse } from '@/generated/api';

import {
  attendancePageFromResponse,
  checkInRequest,
  checkInResultFromResponse,
} from '../api/attendance-adapter';
import type { AttendancePage, CheckInResult } from '../model/attendance-models';
import { AttendanceOperationLock } from './attendance-operation-lock';

export const ATTENDANCE_PAGE_SIZE = 20;

type AuthorizedRequest = <TResponse>(
  request: Omit<HttpRequest, 'requiresAuth'>,
) => Promise<HttpResponse<TResponse>>;

export const attendanceKeys = {
  all: () => ['attendance'] as const,
  today: () => ['attendance', 'today', { size: ATTENDANCE_PAGE_SIZE }] as const,
  history: (studentId: string) => ['attendance', 'student', studentId, { size: ATTENDANCE_PAGE_SIZE }] as const,
};

function queryPath(path: string, page: number): `${string}?${string}` {
  const query = new URLSearchParams({ page: String(page), size: String(ATTENDANCE_PAGE_SIZE) });
  return `${path}?${query.toString()}`;
}

export function attendanceTodayPath(page: number): `/attendance/today?${string}` {
  return queryPath('/attendance/today', page) as `/attendance/today?${string}`;
}

export function studentAttendancePath(
  studentId: string,
  page: number,
): `/attendance/student/${string}?${string}` {
  return queryPath(`/attendance/student/${studentId}`, page) as `/attendance/student/${string}?${string}`;
}

export async function fetchAttendancePage(
  authorizedRequest: AuthorizedRequest,
  path: `/attendance/today?${string}` | `/attendance/student/${string}?${string}`,
  signal?: AbortSignal,
): Promise<AttendancePage> {
  const response = await authorizedRequest<PageResponseAttendanceResponse>({
    method: 'GET',
    path,
    signal,
  });
  return attendancePageFromResponse(response.data);
}

export function dedupeAttendancePages(
  pages: readonly AttendancePage[] | undefined,
) {
  const byId = new Map<string, AttendancePage['items'][number]>();
  for (const page of pages ?? []) {
    for (const attendance of page.items) byId.set(attendance.id, attendance);
  }
  return [...byId.values()];
}

export async function registerCheckInOnce(
  authorizedRequest: AuthorizedRequest,
  studentId: string,
): Promise<CheckInResult> {
  const response = await authorizedRequest<unknown>({
    method: 'POST',
    path: '/attendance/check-in',
    body: checkInRequest(studentId),
    allowRefresh: false,
  });
  return checkInResultFromResponse(response.data, studentId);
}

export async function invalidateAttendanceState(
  client: QueryClient,
  studentId: string,
): Promise<void> {
  await Promise.all([
    client.invalidateQueries({ queryKey: attendanceKeys.today() }),
    client.invalidateQueries({ queryKey: attendanceKeys.history(studentId) }),
    client.invalidateQueries({ queryKey: instructorKeys.todaySummary() }),
  ]);
}

function forbidden(message: string): never {
  throw new ApiError(403, 'FORBIDDEN', message, undefined, undefined);
}

export function useAttendanceToday(options: Readonly<{ permitted: boolean }>) {
  const { authorizedRequest } = useSession();
  return useInfiniteQuery({
    queryKey: attendanceKeys.today(),
    enabled: options.permitted && Boolean(authorizedRequest),
    initialPageParam: 0,
    staleTime: 15_000,
    retry: false,
    queryFn: async ({ pageParam, signal }) => {
      if (!options.permitted) forbidden('No tienes permiso para consultar asistencias.');
      if (!authorizedRequest) throw new Error('La sesión no está disponible.');
      return fetchAttendancePage(authorizedRequest, attendanceTodayPath(pageParam), signal);
    },
    getNextPageParam: (lastPage) => lastPage.last ? undefined : lastPage.page + 1,
  });
}

export function useStudentAttendance(
  studentId: string,
  options: Readonly<{ enabled: boolean; permitted: boolean }>,
) {
  const { authorizedRequest } = useSession();
  return useInfiniteQuery({
    queryKey: attendanceKeys.history(studentId),
    enabled: options.enabled && options.permitted && Boolean(authorizedRequest),
    initialPageParam: 0,
    staleTime: 30_000,
    retry: false,
    queryFn: async ({ pageParam, signal }) => {
      if (!options.permitted) forbidden('No tienes permiso para consultar asistencias.');
      if (!authorizedRequest) throw new Error('La sesión no está disponible.');
      return fetchAttendancePage(authorizedRequest, studentAttendancePath(studentId, pageParam), signal);
    },
    getNextPageParam: (lastPage) => lastPage.last ? undefined : lastPage.page + 1,
  });
}

export function useRegisterCheckIn(options: Readonly<{ permitted: boolean }>) {
  const { authorizedRequest } = useSession();
  const client = useQueryClient();
  const lock = useRef(new AttendanceOperationLock()).current;
  return useMutation({
    retry: 0,
    networkMode: 'always',
    mutationFn: (studentId: string) => lock.run(
      studentId,
      {
        isOnline: () => onlineManager.isOnline(),
        isPermitted: () => options.permitted,
      },
      async () => {
        if (!authorizedRequest) throw new Error('La sesión no está disponible.');
        return registerCheckInOnce(authorizedRequest, studentId);
      },
    ),
    onSuccess: async (result) => {
      if (result.decision === 'ALLOWED' || result.decision === 'ALREADY_REGISTERED') {
        await invalidateAttendanceState(client, result.studentId);
      }
    },
  });
}
