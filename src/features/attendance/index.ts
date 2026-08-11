export {
  attendanceKeys,
  dedupeAttendancePages,
  useAttendanceToday,
  useRegisterCheckIn,
  useStudentAttendance,
} from './application/attendance';
export type {
  Attendance,
  AttendanceDecision,
  AttendancePage,
  CheckInResult,
} from './model/attendance-models';
export {
  AttendanceHistoryScreen,
  AttendanceTodayScreen,
  CheckInScreen,
} from './ui/AttendanceScreens';
