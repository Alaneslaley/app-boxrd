import { QueryClientProvider } from '@tanstack/react-query';
import { useState, type PropsWithChildren } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppStateQueryBridge, createQueryClient, NetworkQueryBridge } from '@/core/query';
import { SessionProvider } from '@/core/session';
import { ThemeProvider } from '@/shared/theme';

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(createQueryClient);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <SessionProvider>
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
