import { Stack } from 'expo-router';

import { AppBootstrap, AppProviders, useSession } from '@/core';
import { createAuthSessionService } from '@/features/auth';

function RootNavigator() {
  const { state } = useSession();
  const anonymous = state.status === 'anonymous';
  const authenticated = state.status === 'authenticated';

  return (
    <Stack screenOptions={{ headerBackTitle: 'Atrás' }}>
      <Stack.Protected guard={anonymous}>
        <Stack.Screen name="(public)" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={authenticated}>
        <Stack.Screen name="(protected)" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Screen name="+not-found" options={{ title: 'No encontrada' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AppProviders createSessionService={createAuthSessionService}>
      <AppBootstrap>
        <RootNavigator />
      </AppBootstrap>
    </AppProviders>
  );
}
