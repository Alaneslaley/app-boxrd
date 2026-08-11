import { useLocalSearchParams } from 'expo-router';

import { CheckInScreen } from '@/features/attendance';

export default function CheckInRoute() {
  const { studentId } = useLocalSearchParams<{ studentId?: string | string[] }>();
  return <CheckInScreen studentId={typeof studentId === 'string' ? studentId : ''} />;
}
