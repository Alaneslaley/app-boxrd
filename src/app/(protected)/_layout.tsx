import { Stack } from 'expo-router';

import { useSession } from '@/core/session';

export default function ProtectedLayout() {
  const { state } = useSession();
  const experience =
    state.status === 'authenticated' ? state.experience : undefined;

  return (
    <Stack screenOptions={{ headerBackTitle: 'Atrás' }}>
      <Stack.Protected guard={experience === 'internal'}>
        <Stack.Screen name="(instructor)" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={experience === 'student'}>
        <Stack.Screen
          name="experience-not-available"
          options={{ headerShown: false }}
        />
      </Stack.Protected>
      <Stack.Protected guard={experience === 'must-change-password'}>
        <Stack.Screen
          name="must-change-password"
          options={{ headerShown: false }}
        />
      </Stack.Protected>
      <Stack.Protected guard={experience === 'access-denied'}>
        <Stack.Screen name="access-denied" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}
