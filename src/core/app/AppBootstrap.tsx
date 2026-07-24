import type { PropsWithChildren } from 'react';

import { getEnvironment } from '@/core/config';
import { useSession } from '@/core/session';

import { SplashScreenController } from './SplashScreenController';

export function AppBootstrap({ children }: PropsWithChildren) {
  const { state } = useSession();
  getEnvironment();
  return (
    <SplashScreenController ready={state.status !== 'booting'}>
      {children}
    </SplashScreenController>
  );
}
