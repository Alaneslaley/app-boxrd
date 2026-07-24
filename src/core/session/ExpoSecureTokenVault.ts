import * as SecureStore from 'expo-secure-store';

import type { TokenVault } from './TokenVault';

const REFRESH_TOKEN_KEY = 'gymbox.refresh-token';

export class ExpoSecureTokenVault implements TokenVault {
  getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  }

  setRefreshToken(token: string): Promise<void> {
    return SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  }

  clear(): Promise<void> {
    return SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  }
}
