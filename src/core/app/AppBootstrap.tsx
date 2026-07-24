import type { PropsWithChildren } from 'react';

import { getEnvironment } from '@/core/config';

import { SplashScreenController } from './SplashScreenController';

export function AppBootstrap({ children }: PropsWithChildren) {
  getEnvironment();
  return <SplashScreenController ready>{children}</SplashScreenController>;
}
