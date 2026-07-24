import { userEvent } from '@testing-library/react-native';
import type { ComponentType } from 'react';

import {
  useSession,
  type SessionContextValue,
  type SessionCredentials,
  type SessionExperience,
  type SessionState,
} from '@/core/session';
import { authenticatedSessionFixture } from '@/test/fixtures';
import { renderWithProviders } from '@/test/render-with-providers';

import { AuthAccessDeniedScreen } from '../ui/AuthAccessDeniedScreen';
import { ExperienceNotAvailableScreen } from '../ui/ExperienceNotAvailableScreen';
import { InternalHomeScreen } from '../ui/InternalHomeScreen';
import { MustChangePasswordScreen } from '../ui/MustChangePasswordScreen';

jest.mock('@/core/session', () => ({
  ...jest.requireActual('@/core/session'),
  useSession: jest.fn(),
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

function authenticatedState(
  experience: SessionExperience,
  roles: readonly string[],
  permissions: readonly string[],
  mustChangePassword = false,
): SessionState {
  if (authenticatedSessionFixture.status !== 'authenticated') {
    throw new Error('La fixture debe representar una sesión autenticada.');
  }

  return {
    ...authenticatedSessionFixture,
    experience,
    permissions: new Set(permissions),
    user: {
      ...authenticatedSessionFixture.user,
      roles,
      permissions,
      mustChangePassword,
    },
  };
}

function sessionValue(
  state: SessionState,
  signOut: jest.Mock<Promise<void>, []>,
  busy: SessionContextValue['busy'] = 'idle',
): SessionContextValue {
  return {
    state,
    busy,
    signIn: jest
      .fn<Promise<void>, [SessionCredentials]>()
      .mockResolvedValue(undefined),
    signOut,
    retryBootstrap: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
  };
}

type ControlledExperienceCase = Readonly<{
  name: string;
  Component: ComponentType;
  state: SessionState;
  title: string;
  message: RegExp;
}>;

const controlledExperiences: readonly ControlledExperienceCase[] = [
  {
    name: 'ALUMNO',
    Component: ExperienceNotAvailableScreen,
    state: authenticatedState('student', ['ALUMNO'], []),
    title: 'Experiencia en preparación',
    message:
      /La experiencia para alumnos estará disponible en una fase posterior\./,
  },
  {
    name: 'mustChangePassword',
    Component: MustChangePasswordScreen,
    state: authenticatedState(
      'must-change-password',
      ['INSTRUCTOR'],
      ['students.read'],
      true,
    ),
    title: 'Actualización de contraseña requerida',
    message:
      /Debes actualizar tu contraseña mediante el canal definido por administración/,
  },
  {
    name: 'access denied',
    Component: AuthAccessDeniedScreen,
    state: authenticatedState('access-denied', ['UNKNOWN'], []),
    title: 'Acceso denegado',
    message:
      /Tu sesión no tiene el permiso requerido\. El servidor seguirá siendo la autoridad\./,
  },
];

describe('pantallas de experiencia autenticada', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each(controlledExperiences)(
    'muestra el estado $name y conserva una salida local',
    async ({ Component, state, title, message }) => {
      const signOut = jest
        .fn<Promise<void>, []>()
        .mockResolvedValue(undefined);
      mockUseSession.mockReturnValue(sessionValue(state, signOut));

      const view = await renderWithProviders(<Component />);

      expect(view.getByText(title)).toBeOnTheScreen();
      expect(view.getByText(message)).toBeOnTheScreen();
      await userEvent
        .setup()
        .press(view.getByRole('button', { name: 'Cerrar sesión' }));
      expect(signOut).toHaveBeenCalledTimes(1);
    },
  );

  it('muestra la shell interna sin exponer el catálogo de permisos', async () => {
    const signOut = jest
      .fn<Promise<void>, []>()
      .mockResolvedValue(undefined);
    const state = authenticatedState(
      'internal',
      ['INSTRUCTOR'],
      ['students.read', 'attendance.read'],
    );
    mockUseSession.mockReturnValue(sessionValue(state, signOut));

    const view = await renderWithProviders(<InternalHomeScreen />);

    expect(view.getByText('Hola, Instructor Prueba')).toBeOnTheScreen();
    expect(view.getByText('Sucursal: Sucursal de prueba')).toBeOnTheScreen();
    expect(view.getByText('Roles: INSTRUCTOR')).toBeOnTheScreen();
    expect(view.getByText('Permisos vigentes: 2')).toBeOnTheScreen();
    expect(view.queryByText(/students\.read|attendance\.read/)).toBeNull();
    expect(
      view.getByText('0.1.0 (test) · staging · abcdef12'),
    ).toBeOnTheScreen();

    await userEvent
      .setup()
      .press(view.getByRole('button', { name: 'Cerrar sesión' }));
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('no renderiza la shell interna sin una sesión autenticada', async () => {
    mockUseSession.mockReturnValue(
      sessionValue(
        { status: 'anonymous' },
        jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
      ),
    );

    const view = await renderWithProviders(<InternalHomeScreen />);

    expect(view.queryByText(/Hola,/)).toBeNull();
    expect(
      view.queryByRole('button', { name: 'Cerrar sesión' }),
    ).toBeNull();
  });

  it('anuncia y bloquea el botón mientras el logout está en curso', async () => {
    const signOut = jest
      .fn<Promise<void>, []>()
      .mockResolvedValue(undefined);
    mockUseSession.mockReturnValue(
      sessionValue(
        authenticatedState('student', ['ALUMNO'], []),
        signOut,
        'signing-out',
      ),
    );

    const view = await renderWithProviders(
      <ExperienceNotAvailableScreen />,
    );
    const button = view.getByRole('button', { name: 'Cerrar sesión' });

    expect(button).toBeDisabled();
    expect(button).toBeBusy();
    await userEvent.setup().press(button);
    expect(signOut).not.toHaveBeenCalled();
  });
});
