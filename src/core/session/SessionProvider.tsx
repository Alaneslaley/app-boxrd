import { useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { SessionContext } from './SessionContext';
import type { SessionState } from './SessionState';

export type SessionProviderProps = PropsWithChildren<{
  initialState?: SessionState;
}>;

export function SessionProvider({
  children,
  initialState = { status: 'booting' },
}: SessionProviderProps) {
  const [state, setState] = useState<SessionState>(initialState);

  useEffect(() => {
    if (state.status !== 'booting') return undefined;
    const timeout = setTimeout(() => setState({ status: 'anonymous' }), 0);
    return () => clearTimeout(timeout);
  }, [state.status]);

  const value = useMemo(
    () => ({
      state,
      simulateSignIn: () =>
        setState({
          status: 'authenticated',
          user: {
            id: 'demo-instructor',
            displayName: 'Instructor de demostración',
            role: 'INSTRUCTOR',
          },
          permissions: new Set(['phase-zero.protected']),
        }),
      simulateSignOut: () => setState({ status: 'anonymous' }),
    }),
    [state],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
