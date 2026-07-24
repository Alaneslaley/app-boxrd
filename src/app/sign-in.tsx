import { useRouter } from 'expo-router';

import { SimulatedSignInScreen } from '@/features/phase-zero-demo';

export default function SignInRoute() {
  const router = useRouter();
  return <SimulatedSignInScreen onSignedIn={() => router.replace('/protected')} />;
}
