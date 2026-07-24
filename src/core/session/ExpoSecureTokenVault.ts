import * as SecureStore from 'expo-secure-store';

import type { TokenVault } from './TokenVault';

export const REFRESH_TOKEN_KEY = 'gymbox.auth.refresh-token.v1';

export class ExpoSecureTokenVault implements TokenVault {
  async getRefreshToken(): Promise<string | null> {
    const value = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    if (value === null) return null;
    if (!value.trim()) {
      await this.clear();
      return null;
    }
    return value;
  }

  async setRefreshToken(token: string): Promise<void> {
    if (!token.trim()) throw new Error('El refresh token no puede estar vacío.');
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  }

  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  }
}
