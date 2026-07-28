import { createContext, useContext } from 'react';

import type { SessionCredentials } from './SessionGateway';
import type { HttpRequest, HttpResponse } from '@/core/http';
import type { ProtectedMediaSource, SessionState } from './SessionState';

export type SessionContextValue = Readonly<{
  state: SessionState;
  busy: 'idle' | 'recovering' | 'signing-in' | 'signing-out';
  signIn(credentials: SessionCredentials): Promise<void>;
  signOut(): Promise<void>;
  retryBootstrap(): Promise<void>;
  authorizedRequest?<TResponse>(
    request: Omit<HttpRequest, 'requiresAuth'>,
  ): Promise<HttpResponse<TResponse>>;
  protectedMediaSource?(path: `/media/${string}`): ProtectedMediaSource | undefined;
}>;

export const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession debe usarse dentro de SessionProvider.');
  return context;
}
