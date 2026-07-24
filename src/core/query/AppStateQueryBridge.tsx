import { focusManager } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';

export function applyAppState(status: AppStateStatus): boolean {
  const focused = status === 'active';
  if (Platform.OS !== 'web') focusManager.setFocused(focused);
  return focused;
}

export function AppStateQueryBridge() {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', applyAppState);
    return () => subscription.remove();
  }, []);

  return null;
}
