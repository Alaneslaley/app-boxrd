import { useRouter } from 'expo-router';

import { ProtectedHomeScreen } from '@/features/phase-zero-demo';

export default function ProtectedRoute() {
  const router = useRouter();
  return (
    <ProtectedHomeScreen
      onAccessDenied={() => router.push('/access-denied')}
      onOpenDesignSystem={() => router.push('/design-system')}
      onSignedOut={() => router.replace('/')}
    />
  );
}
