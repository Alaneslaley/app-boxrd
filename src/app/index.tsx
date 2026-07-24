import { useRouter } from 'expo-router';

import { PhaseZeroLandingScreen } from '@/features/phase-zero-demo';

export default function IndexRoute() {
  const router = useRouter();
  return (
    <PhaseZeroLandingScreen
      onOpenDesignSystem={() => router.push('/design-system')}
      onOpenProtected={() => router.push('/protected')}
      onOpenSignIn={() => router.push('/sign-in')}
    />
  );
}
