import { Stack } from 'expo-router';

import { AppBootstrap, AppProviders, useSession } from '@/core';
import { createAuthSessionService } from '@/features/auth';
import { clearPendingPayment } from '@/features/payments';

const financialCleanup = { clear: clearPendingPayment };

function createSessionServiceWithFinancialCleanup(queryClient: Parameters<typeof createAuthSessionService>[0]) {
  return createAuthSessionService(queryClient, financialCleanup);
}

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
    <AppProviders createSessionService={createSessionServiceWithFinancialCleanup}>
      <AppBootstrap>
        <RootNavigator />
      </AppBootstrap>
    </AppProviders>
  );
}
