import { useLocalSearchParams } from 'expo-router';

import { RegisterPaymentScreen } from '@/features/payments';

export default function RegisterPaymentRoute() {
  const { membershipId, studentName } = useLocalSearchParams<{ membershipId?: string; studentName?: string }>();
  return <RegisterPaymentScreen membershipId={membershipId ?? ''} studentName={studentName} />;
}
