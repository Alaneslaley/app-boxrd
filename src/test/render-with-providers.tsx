import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SessionProvider, type SessionState } from '@/core/session';
import { ThemeProvider } from '@/shared/theme';

import { createTestQueryClient } from './create-test-query-client';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

export function renderWithProviders(
  element: ReactElement,
  sessionState: SessionState = { status: 'anonymous' },
) {
  const queryClient = createTestQueryClient();
  return render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <SessionProvider initialState={sessionState}>{element}</SessionProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}
