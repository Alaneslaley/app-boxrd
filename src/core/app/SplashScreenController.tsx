import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, type PropsWithChildren } from 'react';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export function SplashScreenController({
  children,
  ready,
}: PropsWithChildren<{ ready: boolean }>) {
  const hidden = useRef(false);

  useEffect(() => {
    if (!ready || hidden.current) return;
    hidden.current = true;
    SplashScreen.hide();
  }, [ready]);

  return ready ? children : null;
}
