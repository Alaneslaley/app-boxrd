import * as SplashScreen from 'expo-splash-screen';
import { useEffect, type PropsWithChildren } from 'react';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export function SplashScreenController({
  children,
  ready,
}: PropsWithChildren<{ ready: boolean }>) {
  useEffect(() => {
    if (ready) SplashScreen.hide();
  }, [ready]);

  return ready ? children : null;
}
