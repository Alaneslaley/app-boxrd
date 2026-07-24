import type { TokenVault } from '@/core/session';

export class FakeTokenVault implements TokenVault {
  private refreshToken: string | null = null;

  async getRefreshToken(): Promise<string | null> {
    return this.refreshToken;
  }

  async setRefreshToken(token: string): Promise<void> {
    this.refreshToken = token;
  }

  async clear(): Promise<void> {
    this.refreshToken = null;
  }
}
