import { Stack } from 'expo-router';

import { AppBootstrap, AppProviders, useSession } from '@/core';
import { LoadingState } from '@/shared';

function RootNavigator() {
  const { state } = useSession();
  if (state.status === 'booting') return <LoadingState />;

  return (
    <Stack screenOptions={{ headerBackTitle: 'Atrás' }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Protected guard={state.status === 'anonymous'}>
        <Stack.Screen name="sign-in" options={{ title: 'Acceso demo' }} />
      </Stack.Protected>
      <Stack.Protected guard={state.status === 'authenticated'}>
        <Stack.Screen name="protected" options={{ headerShown: false }} />
        <Stack.Screen name="access-denied" options={{ title: 'Sin permiso' }} />
      </Stack.Protected>
      <Stack.Screen name="design-system" options={{ title: 'Componentes' }} />
      <Stack.Screen name="+not-found" options={{ title: 'No encontrada' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AppProviders>
      <AppBootstrap>
        <RootNavigator />
      </AppBootstrap>
    </AppProviders>
  );
}
