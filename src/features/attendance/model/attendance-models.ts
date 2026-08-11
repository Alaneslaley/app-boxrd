export type AttendanceDecision =
  | 'ALLOWED'
  | 'ALREADY_REGISTERED'
  | 'BLOCKED_EXPIRED_MEMBERSHIP'
  | 'BLOCKED_INACTIVE_STUDENT';

export type Attendance = Readonly<{
  id: string;
  branchId?: string;
  studentId: string;
  attendanceDate: string;
  checkedInAt: string;
  status: string;
  ageAtEvent?: number;
  ageCategoryAtEvent?: string;
  levelAtEvent?: string;
  membershipStatusAtEvent?: string;
  membershipEndDateAtEvent?: string;
  studentName?: string;
}>;

export type AttendancePage = Readonly<{
  items: readonly Attendance[];
  page: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
  last: boolean;
}>;

export type CheckInResult = Readonly<{
  decision: AttendanceDecision;
  studentId: string;
  studentName?: string;
  photoFileId?: string;
  age?: number;
  ageCategory?: string;
  level?: string;
  membershipStatus?: string;
  membershipEndDate?: string;
  attendance?: Attendance;
}>;
