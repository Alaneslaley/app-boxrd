import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';

import {
  SessionProvider,
  type SessionService,
  useSession,
} from '@/core/session';

function RetryConsumer() {
  const { retryBootstrap } = useSession();
  return (
    <Pressable
      accessibilityLabel="Reintentar sesión"
      accessibilityRole="button"
      onPress={() => {
        void retryBootstrap();
      }}
    >
      <Text>Reintentar sesión</Text>
    </Pressable>
  );
}

function sessionServiceStub(bootstrap: jest.Mock): SessionService {
  return {
    bootstrap,
    subscribe: () => () => undefined,
    signIn: jest.fn(),
    logout: jest.fn(),
  } as unknown as SessionService;
}

describe('SessionProvider', () => {
  it('ejecuta exactamente un bootstrap al reintentar desde anonymous', async () => {
    const bootstrap = jest.fn(async () => ({ status: 'anonymous' as const }));

    await render(
      <SessionProvider
        initialState={{ status: 'anonymous' }}
        service={sessionServiceStub(bootstrap)}
      >
        <RetryConsumer />
      </SessionProvider>,
    );

    await fireEvent.press(
      screen.getByRole('button', { name: 'Reintentar sesión' }),
    );

    await waitFor(() => expect(bootstrap).toHaveBeenCalledTimes(1));
  });

  it('ejecuta una sola restauración automática al montar en booting', async () => {
    const bootstrap = jest.fn(async () => ({ status: 'anonymous' as const }));

    await render(
      <SessionProvider service={sessionServiceStub(bootstrap)}>
        <RetryConsumer />
      </SessionProvider>,
    );

    await waitFor(() => expect(bootstrap).toHaveBeenCalledTimes(1));
  });
});
