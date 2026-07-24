import { createContext, useContext } from 'react';

import type { SessionState } from './SessionState';

export type SessionContextValue = Readonly<{
  state: SessionState;
  simulateSignIn: () => void;
  simulateSignOut: () => void;
}>;

export const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession debe usarse dentro de SessionProvider.');
  return context;
}
