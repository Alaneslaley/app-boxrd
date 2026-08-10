import { useLocalSearchParams } from 'expo-router';

import { PaymentDetailScreen } from '@/features/payments';

export default function PaymentDetailRoute() {
  const { paymentId } = useLocalSearchParams<{ paymentId?: string }>();
  return <PaymentDetailScreen paymentId={paymentId ?? ''} />;
}
