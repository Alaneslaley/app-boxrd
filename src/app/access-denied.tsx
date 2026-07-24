import { useRouter } from 'expo-router';

import { AccessDeniedDemoScreen } from '@/features/phase-zero-demo';

export default function AccessDeniedRoute() {
  const router = useRouter();
  return <AccessDeniedDemoScreen onGoBack={() => router.replace('/protected')} />;
}
