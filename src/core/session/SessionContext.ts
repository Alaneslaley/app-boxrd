import { createContext, useContext } from 'react';

import type { SessionCredentials } from './SessionGateway';
import type { SessionState } from './SessionState';

export type SessionContextValue = Readonly<{
  state: SessionState;
  busy: 'idle' | 'recovering' | 'signing-in' | 'signing-out';
  signIn(credentials: SessionCredentials): Promise<void>;
  signOut(): Promise<void>;
  retryBootstrap(): Promise<void>;
}>;

export const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession debe usarse dentro de SessionProvider.');
  return context;
}
