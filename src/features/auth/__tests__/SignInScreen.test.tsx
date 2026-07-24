import {
  fireEvent,
  userEvent,
  waitFor,
} from '@testing-library/react-native';

import {
  useSession,
  type SessionContextValue,
  type SessionCredentials,
} from '@/core/session';
import { renderWithProviders } from '@/test/render-with-providers';

import { useSignIn } from '../application/use-sign-in';
import { SignInScreen } from '../ui/SignInScreen';

jest.mock('@/core/session', () => ({
  ...jest.requireActual('@/core/session'),
  useSession: jest.fn(),
}));

jest.mock('../application/use-sign-in', () => ({
  useSignIn: jest.fn(),
}));

jest.mock('@/core/config', () => ({
  getEnvironment: jest.fn(() => ({
    environment: 'staging',
    apiBaseUrl: 'https://api.example.test',
    appVersion: '0.1.0',
    buildNumber: 'test',
    commit: 'abcdef123456',
    enableDemoSession: false,
  })),
  formatBuildIdentifier: jest.fn(
    () => '0.1.0 (test) · staging · abcdef12',
  ),
}));

const mockUseSession = jest.mocked(useSession);
const mockUseSignIn = jest.mocked(useSignIn);

function createSessionValue(
  overrides: Partial<SessionContextValue> = {},
): SessionContextValue {
  return {
    state: { status: 'anonymous' },
    busy: 'idle',
    signIn: jest
      .fn<Promise<void>, [SessionCredentials]>()
      .mockResolvedValue(undefined),
    signOut: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
    retryBootstrap: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('SignInScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSession.mockReturnValue(createSessionValue());
    mockUseSignIn.mockReturnValue({
      error: undefined,
      execute: jest.fn().mockResolvedValue(true),
      isOnline: true,
      isSubmitting: false,
    });
  });

  it('renderiza identidad, campos y datos de soporte no sensibles', async () => {
    const view = await renderWithProviders(<SignInScreen />);

    expect(view.getByText('GymBox')).toBeOnTheScreen();
    expect(view.getByLabelText('Correo electrónico')).toBeOnTheScreen();
    expect(view.getByLabelText('Contraseña')).toHaveProp(
      'secureTextEntry',
      true,
    );
    expect(
      view.getByText('0.1.0 (test) · staging · abcdef12'),
    ).toBeOnTheScreen();
  });

  it('muestra el estado offline y bloquea el inicio de sesión', async () => {
    mockUseSignIn.mockReturnValue({
      error: undefined,
      execute: jest.fn().mockResolvedValue(false),
      isOnline: false,
      isSubmitting: false,
    });

    const view = await renderWithProviders(<SignInScreen />);

    expect(view.getByText(/Sin conexión/)).toBeOnTheScreen();
    expect(
      view.getByRole('button', { name: 'Iniciar sesión' }),
    ).toBeDisabled();
  });

  it('presenta un error seguro y su traceId como código de soporte', async () => {
    mockUseSignIn.mockReturnValue({
      error: {
        message: 'El correo o la contraseña no son válidos.',
        traceId: 'trace-test-123',
      },
      execute: jest.fn().mockResolvedValue(false),
      isOnline: true,
      isSubmitting: false,
    });

    const view = await renderWithProviders(<SignInScreen />);

    expect(view.getByText(/No pudimos iniciar sesión/)).toBeOnTheScreen();
    expect(
      view.getByText(
        /El correo o la contraseña no son válidos\. Código de soporte: trace-test-123\./,
      ),
    ).toBeOnTheScreen();
    expect(view.queryByText(/access-token|refresh-token/i)).toBeNull();
  });

  it('permite reintentar un bootstrap recuperable cuando hay conexión', async () => {
    const retryBootstrap = jest
      .fn<Promise<void>, []>()
      .mockResolvedValue(undefined);
    mockUseSession.mockReturnValue(
      createSessionValue({
        retryBootstrap,
        state: {
          status: 'anonymous',
          notice: {
            message: 'No fue posible validar la sesión.',
            traceId: 'trace-bootstrap-test',
            retryable: true,
          },
        },
      }),
    );

    const view = await renderWithProviders(<SignInScreen />);

    expect(
      view.getByText(/No se pudo restaurar la sesión/),
    ).toBeOnTheScreen();
    expect(
      view.getByText(
        /No fue posible validar la sesión\. Código de soporte: trace-bootstrap-test\./,
      ),
    ).toBeOnTheScreen();

    await userEvent
      .setup()
      .press(
        view.getByRole('button', { name: 'Reintentar restauración' }),
      );
    expect(retryBootstrap).toHaveBeenCalledTimes(1);
  });

  it('delega credenciales ya normalizadas al flujo de sign-in', async () => {
    const execute = jest.fn().mockResolvedValue(true);
    mockUseSignIn.mockReturnValue({
      error: undefined,
      execute,
      isOnline: true,
      isSubmitting: false,
    });
    const view = await renderWithProviders(<SignInScreen />);

    await fireEvent.changeText(
      view.getByLabelText('Correo electrónico'),
      '  USER@Example.COM ',
    );
    await fireEvent.changeText(
      view.getByLabelText('Contraseña'),
      ' password-screen-test-only ',
    );
    await userEvent
      .setup()
      .press(view.getByRole('button', { name: 'Iniciar sesión' }));

    await waitFor(() => {
      expect(execute).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: ' password-screen-test-only ',
      });
    });
  });
});
