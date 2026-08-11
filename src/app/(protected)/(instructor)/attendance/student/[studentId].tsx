import { useLocalSearchParams } from 'expo-router';

import { AttendanceHistoryScreen } from '@/features/attendance';

export default function AttendanceHistoryRoute() {
  const { studentId } = useLocalSearchParams<{ studentId?: string | string[] }>();
  return <AttendanceHistoryScreen studentId={typeof studentId === 'string' ? studentId : ''} />;
}
