import { useLocalSearchParams } from 'expo-router';

import { RegisterPaymentScreen } from '@/features/payments';

export default function RegisterPaymentRoute() {
  const { membershipId, planId, studentId, studentName } = useLocalSearchParams<{
    membershipId?: string;
    planId?: string;
    studentId?: string;
    studentName?: string;
  }>();
  return <RegisterPaymentScreen
    membershipId={membershipId ?? ''}
    planId={planId ?? ''}
    studentId={studentId}
    studentName={studentName}
  />;
}
