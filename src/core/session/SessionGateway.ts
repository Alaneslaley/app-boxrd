import type { CurrentUser } from './SessionState';

export type SessionCredentials = Readonly<{
  email: string;
  password: string;
  device?: string;
}>;

export type SessionTokens = Readonly<{
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}>;

/**
 * Puerto del núcleo de sesión. La implementación remota vive en features/auth,
 * de modo que core nunca depende de una feature ni de DTO generados.
 */
export interface SessionGateway {
  login(credentials: SessionCredentials): Promise<SessionTokens>;
  refresh(refreshToken: string): Promise<SessionTokens>;
  logout(refreshToken: string): Promise<void>;
  me(): Promise<CurrentUser>;
}
