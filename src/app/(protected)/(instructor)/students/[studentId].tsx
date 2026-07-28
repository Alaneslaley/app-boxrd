import { useLocalSearchParams } from 'expo-router';

import { StudentDetailScreen } from '@/features/students';

export default function StudentDetailRoute() {
  const { studentId } = useLocalSearchParams<{ studentId?: string }>();
  return <StudentDetailScreen studentId={studentId ?? ''} />;
}
