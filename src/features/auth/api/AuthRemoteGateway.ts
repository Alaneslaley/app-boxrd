import type { HttpClient } from '@/core/http';
import type {
  AuthTokens as GeneratedAuthTokens,
  UserSnapshot as GeneratedUserSnapshot,
} from '@/generated/api';

import type { AuthSession } from '../model/AuthSession';
import type { Credentials } from '../model/Credentials';
import type { CurrentUser } from '../model/CurrentUser';
import type { AuthGateway } from './AuthGateway';
import {
  toAuthSession,
  toCurrentUser,
  toLoginRequest,
  toRefreshRequest,
} from './auth-api-mapper';

export class AuthRemoteGateway implements AuthGateway {
  constructor(private readonly httpClient: HttpClient) {}

  async login(credentials: Credentials): Promise<AuthSession> {
    const response = await this.httpClient.request<GeneratedAuthTokens>({
      method: 'POST',
      path: '/auth/login',
      body: toLoginRequest(credentials),
      requiresAuth: false,
      allowRefresh: false,
    });
    return toAuthSession(response.data);
  }

  async refresh(refreshToken: string): Promise<AuthSession> {
    const response = await this.httpClient.request<GeneratedAuthTokens>({
      method: 'POST',
      path: '/auth/refresh',
      body: toRefreshRequest(refreshToken),
      requiresAuth: false,
      allowRefresh: false,
    });
    return toAuthSession(response.data);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.httpClient.request<void>({
      method: 'POST',
      path: '/auth/logout',
      body: toRefreshRequest(refreshToken),
      requiresAuth: true,
      allowRefresh: false,
    });
  }

  async me(): Promise<CurrentUser> {
    const response = await this.httpClient.request<GeneratedUserSnapshot>({
      method: 'GET',
      path: '/auth/me',
      requiresAuth: true,
      allowRefresh: true,
    });
    return toCurrentUser(response.data);
  }
}
