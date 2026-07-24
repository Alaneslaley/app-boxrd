import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { useState, type PropsWithChildren } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppStateQueryBridge, createQueryClient, NetworkQueryBridge } from '@/core/query';
import { SessionProvider, type SessionService } from '@/core/session';
import { ThemeProvider } from '@/shared/theme';

export type AppProvidersProps = PropsWithChildren<{
  createSessionService(queryClient: QueryClient): SessionService;
}>;

export function AppProviders({
  children,
  createSessionService,
}: AppProvidersProps) {
  const [[queryClient, sessionService]] = useState(() => {
    const client = createQueryClient();
    return [client, createSessionService(client)] as const;
  });

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <SessionProvider service={sessionService}>
            <NetworkQueryBridge>
              <AppStateQueryBridge />
              {children}
            </NetworkQueryBridge>
          </SessionProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
