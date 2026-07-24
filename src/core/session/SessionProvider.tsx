import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

import { SessionContext } from './SessionContext';
import { sessionReducer } from './SessionReducer';
import {
  StaleSessionOperationError,
  type SessionService,
} from './SessionService';
import type { SessionCredentials } from './SessionGateway';
import type { SessionState } from './SessionState';

export type SessionProviderProps = PropsWithChildren<{
  initialState?: SessionState;
  service?: SessionService;
}>;

export function SessionProvider({
  children,
  initialState = { status: 'booting' },
  service,
}: SessionProviderProps) {
  const [state, dispatch] = useReducer(sessionReducer, initialState);
  const [busy, setBusy] = useState<
    'idle' | 'recovering' | 'signing-in' | 'signing-out'
  >('idle');
  const bootstrappedService = useRef<SessionService | undefined>(undefined);

  useEffect(() => {
    if (!service) return undefined;
    return service.subscribe((resolvedState) => {
      dispatch({ type: 'RESOLVE', state: resolvedState });
      setBusy('idle');
    });
  }, [service]);

  const retryBootstrap = useCallback(async () => {
    if (!service || busy !== 'idle') {
      if (!service) {
        dispatch({ type: 'RESOLVE', state: { status: 'anonymous' } });
      }
      return;
    }

    setBusy('recovering');
    try {
      const resolvedState = await service.bootstrap();
      dispatch({ type: 'RESOLVE', state: resolvedState });
    } catch (error) {
      if (!(error instanceof StaleSessionOperationError)) throw error;
    } finally {
      setBusy('idle');
    }
  }, [busy, service]);

  useEffect(() => {
    if (initialState.status !== 'booting') return;
    if (!service) {
      dispatch({ type: 'RESOLVE', state: { status: 'anonymous' } });
      return;
    }
    if (bootstrappedService.current === service) return;

    bootstrappedService.current = service;
    let active = true;
    void service
      .bootstrap()
      .then((resolvedState) => {
        if (active) dispatch({ type: 'RESOLVE', state: resolvedState });
      })
      .catch((error: unknown) => {
        if (!active || error instanceof StaleSessionOperationError) return;
        dispatch({
          type: 'RESOLVE',
          state: {
            status: 'anonymous',
            notice: {
              message:
                'No fue posible validar la sesión. Inténtalo nuevamente.',
              retryable: true,
            },
          },
        });
      });

    return () => {
      active = false;
    };
  }, [initialState.status, service]);

  const signIn = useCallback(
    async (credentials: SessionCredentials) => {
      if (!service || busy !== 'idle') return;
      setBusy('signing-in');
      try {
        const resolvedState = await service.signIn(credentials);
        dispatch({ type: 'RESOLVE', state: resolvedState });
      } catch (error) {
        if (!(error instanceof StaleSessionOperationError)) throw error;
      } finally {
        setBusy('idle');
      }
    },
    [busy, service],
  );

  const signOut = useCallback(async () => {
    if (!service || busy === 'signing-out') return;
    setBusy('signing-out');
    try {
      await service.logout();
      dispatch({ type: 'RESOLVE', state: { status: 'anonymous' } });
    } finally {
      setBusy('idle');
    }
  }, [busy, service]);

  const value = useMemo(
    () => ({
      state,
      busy,
      signIn,
      signOut,
      retryBootstrap,
    }),
    [busy, retryBootstrap, signIn, signOut, state],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
