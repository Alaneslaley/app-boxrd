import { useLocalSearchParams } from 'expo-router';

import { PaymentDetailScreen } from '@/features/payments';

export default function PaymentDetailRoute() {
  const { paymentId, replayed } = useLocalSearchParams<{ paymentId?: string; replayed?: string }>();
  return <PaymentDetailScreen paymentId={paymentId ?? ''} replayed={replayed === 'true'} />;
}
