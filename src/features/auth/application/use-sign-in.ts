import { useCallback, useMemo, useState } from 'react';

import { ApiError } from '@/core/http';
import { useNetworkStatus } from '@/core/query';
import { useSession } from '@/core/session';

import type { Credentials } from '../model/Credentials';
import { SignInService } from './SignInService';

export type SignInError = Readonly<{
  message: string;
  traceId?: string;
}>;

function safeSignInError(error: unknown): SignInError {
  if (!(error instanceof ApiError)) {
    return { message: 'No pudimos iniciar sesión. Inténtalo nuevamente.' };
  }

  if (error.status === 401) {
    return {
      message: 'El correo o la contraseña no son válidos.',
      traceId: error.traceId,
    };
  }

  return {
    message: error.message,
    traceId: error.traceId,
  };
}

export function useSignIn() {
  const { signIn, busy } = useSession();
  const { isOnline } = useNetworkStatus();
  const [error, setError] = useState<SignInError | undefined>();
  const service = useMemo(() => new SignInService(signIn), [signIn]);

  const execute = useCallback(
    async (credentials: Credentials): Promise<boolean> => {
      if (!isOnline) {
        setError({
          message: 'Necesitas conexión para iniciar sesión.',
        });
        return false;
      }

      setError(undefined);
      try {
        await service.execute(credentials);
        return true;
      } catch (caught) {
        setError(safeSignInError(caught));
        return false;
      }
    },
    [isOnline, service],
  );

  return {
    error,
    execute,
    isOnline,
    isSubmitting: busy === 'signing-in',
  } as const;
}
