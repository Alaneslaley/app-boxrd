import { userEvent } from '@testing-library/react-native';

import { authenticatedSessionFixture } from '@/test/fixtures';
import { renderWithProviders } from '@/test/render-with-providers';

import { AccessDeniedDemoScreen } from '../ui/AccessDeniedDemoScreen';
import { PhaseZeroLandingScreen } from '../ui/PhaseZeroLandingScreen';
import { ProtectedHomeScreen } from '../ui/ProtectedHomeScreen';

jest.mock('@/core/config', () => ({
  formatBuildIdentifier: () => '0.1.0 (test) · local · abc12345',
  getEnvironment: () => ({
    environment: 'local',
    apiBaseUrl: 'http://localhost:8080',
    appVersion: '0.1.0',
    buildNumber: 'test',
    commit: 'abc12345',
    enableDemoSession: true,
  }),
}));

describe('navegación demostrativa', () => {
  it('renderiza la ruta pública inicial y dispara navegación a sign-in', async () => {
    const onOpenSignIn = jest.fn();
    const view = await renderWithProviders(
      <PhaseZeroLandingScreen
        onOpenDesignSystem={jest.fn()}
        onOpenProtected={jest.fn()}
        onOpenSignIn={onOpenSignIn}
      />,
    );

    await userEvent.setup().press(
      view.getByRole('button', { name: 'Iniciar sesión simulada' }),
    );
    expect(onOpenSignIn).toHaveBeenCalledTimes(1);
  });

  it('permite la pantalla protegida con sesión', async () => {
    const view = await renderWithProviders(
      <ProtectedHomeScreen
        onAccessDenied={jest.fn()}
        onOpenDesignSystem={jest.fn()}
        onSignedOut={jest.fn()}
      />,
      authenticatedSessionFixture,
    );
    expect(view.getByText(/Acceso permitido/)).toBeOnTheScreen();
  });

  it('bloquea el contenido protegido sin sesión', async () => {
    const view = await renderWithProviders(
      <ProtectedHomeScreen
        onAccessDenied={jest.fn()}
        onOpenDesignSystem={jest.fn()}
        onSignedOut={jest.fn()}
      />,
    );
    expect(view.queryByText('Acceso permitido')).toBeNull();
  });

  it('muestra y abandona AccessDenied', async () => {
    const onGoBack = jest.fn();
    const view = await renderWithProviders(
      <AccessDeniedDemoScreen onGoBack={onGoBack} />,
      authenticatedSessionFixture,
    );
    expect(view.getByText('Acceso denegado')).toBeOnTheScreen();
    await userEvent.setup().press(view.getByRole('button', { name: 'Volver a una ruta segura' }));
    expect(onGoBack).toHaveBeenCalledTimes(1);
  });
});
