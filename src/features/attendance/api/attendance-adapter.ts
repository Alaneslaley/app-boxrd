import { ApiError } from '@/core/http';
import { isUuid } from '@/core/validation';
import type {
  AttendanceResponse,
  CheckInRequest,
  CheckInResponse,
  PageResponseAttendanceResponse,
} from '@/generated/api';

import type {
  Attendance,
  AttendanceDecision,
  AttendancePage,
  CheckInResult,
} from '../model/attendance-models';

const DECISIONS = new Set<AttendanceDecision>([
  'ALLOWED',
  'ALREADY_REGISTERED',
  'BLOCKED_EXPIRED_MEMBERSHIP',
  'BLOCKED_INACTIVE_STUDENT',
]);

function malformed(field: string): never {
  throw new ApiError(
    502,
    'ATTENDANCE_CONTRACT_INVALID',
    `La respuesta de asistencia contiene un campo inválido (${field}).`,
    undefined,
    undefined,
  );
}

function record(value: unknown, field = 'root'): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) malformed(field);
  return value as Record<string, unknown>;
}

function uuid(value: unknown, field: string): string {
  return isUuid(value) ? value : malformed(field);
}

function text(value: unknown, field: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : malformed(field);
}

function optionalText(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  return text(value, field);
}

function optionalUuid(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  return uuid(value, field);
}

function optionalNonNegativeInteger(value: unknown, field: string): number | undefined {
  if (value === undefined || value === null) return undefined;
  return Number.isSafeInteger(value) && (value as number) >= 0
    ? value as number
    : malformed(field);
}

function nonNegativeInteger(value: unknown, field: string, fallback?: number): number {
  if (value === undefined && fallback !== undefined) return fallback;
  return Number.isSafeInteger(value) && (value as number) >= 0
    ? value as number
    : malformed(field);
}

function date(value: unknown, field: string): string {
  const result = text(value, field);
  return /^\d{4}-\d{2}-\d{2}$/.test(result) ? result : malformed(field);
}

function dateTime(value: unknown, field: string): string {
  const result = text(value, field);
  return Number.isNaN(Date.parse(result)) ? malformed(field) : result;
}

function decision(value: unknown): AttendanceDecision {
  return typeof value === 'string' && DECISIONS.has(value as AttendanceDecision)
    ? value as AttendanceDecision
    : malformed('decision');
}

export function checkInRequest(studentId: string): CheckInRequest {
  return { studentId: uuid(studentId, 'studentId') };
}

export function attendanceFromResponse(
  response: unknown,
  field = 'attendance',
): Attendance {
  const value = record(response, field) as AttendanceResponse;
  return {
    id: uuid(value.id, `${field}.id`),
    branchId: optionalUuid(value.branchId, `${field}.branchId`),
    studentId: uuid(value.studentId, `${field}.studentId`),
    attendanceDate: date(value.attendanceDate, `${field}.attendanceDate`),
    checkedInAt: dateTime(value.checkedInAt, `${field}.checkedInAt`),
    status: text(value.status, `${field}.status`),
    ageAtEvent: optionalNonNegativeInteger(value.ageAtEvent, `${field}.ageAtEvent`),
    ageCategoryAtEvent: optionalText(value.ageCategoryAtEvent, `${field}.ageCategoryAtEvent`),
    levelAtEvent: optionalText(value.levelAtEvent, `${field}.levelAtEvent`),
    membershipStatusAtEvent: optionalText(value.membershipStatusAtEvent, `${field}.membershipStatusAtEvent`),
    membershipEndDateAtEvent: value.membershipEndDateAtEvent === undefined
      ? undefined
      : date(value.membershipEndDateAtEvent, `${field}.membershipEndDateAtEvent`),
    studentName: optionalText(value.studentName, `${field}.studentName`),
  };
}

export function attendancePageFromResponse(response: unknown): AttendancePage {
  const value = record(response) as PageResponseAttendanceResponse;
  if (value.content !== undefined && !Array.isArray(value.content)) malformed('content');
  const itemsById = new Map<string, Attendance>();
  for (const [index, item] of (value.content ?? []).entries()) {
    const attendance = attendanceFromResponse(item, `content.${index}`);
    itemsById.set(attendance.id, attendance);
  }
  const page = nonNegativeInteger(value.page, 'page', 0);
  const size = value.size === undefined ? undefined : nonNegativeInteger(value.size, 'size');
  const totalElements = value.totalElements === undefined
    ? undefined
    : nonNegativeInteger(value.totalElements, 'totalElements');
  const totalPages = value.totalPages === undefined
    ? undefined
    : nonNegativeInteger(value.totalPages, 'totalPages');
  if (value.last !== undefined && typeof value.last !== 'boolean') malformed('last');
  return {
    items: [...itemsById.values()],
    page,
    size,
    totalElements,
    totalPages,
    last: value.last ?? (totalPages === undefined || page + 1 >= totalPages),
  };
}

export function checkInResultFromResponse(
  response: unknown,
  expectedStudentId: string,
): CheckInResult {
  const studentId = uuid(expectedStudentId, 'studentId');
  const value = record(response) as CheckInResponse;
  const resultDecision = decision(value.decision);
  const attendance = value.attendance === undefined
    ? undefined
    : attendanceFromResponse(value.attendance);
  if (attendance && attendance.studentId !== studentId) malformed('attendance.studentId');
  return {
    decision: resultDecision,
    studentId,
    studentName: optionalText(value.studentName, 'studentName') ?? attendance?.studentName,
    photoFileId: optionalUuid(value.photoFileId, 'photoFileId'),
    age: optionalNonNegativeInteger(value.age, 'age'),
    ageCategory: optionalText(value.ageCategory, 'ageCategory'),
    level: optionalText(value.level, 'level'),
    membershipStatus: optionalText(value.membershipStatus, 'membershipStatus'),
    membershipEndDate: value.membershipEndDate === undefined
      ? undefined
      : date(value.membershipEndDate, 'membershipEndDate'),
    attendance,
  };
}
