import { AlertBanner, AppButton, Screen } from '@/shared';
import { useSession } from '@/core/session';

export function SimulatedSignInScreen({ onSignedIn }: { onSignedIn: () => void }) {
  const { simulateSignIn } = useSession();

  const signIn = () => {
    simulateSignIn();
    onSignedIn();
  };

  return (
    <Screen
      subtitle="Esta acción sólo cambia un estado en memoria. No acepta ni envía credenciales."
      title="Acceso de demostración"
    >
      <AlertBanner
        message="El login, refresh token y /auth/me pertenecen al Sprint 1 y siguen bloqueados por G0."
        title="Sin autenticación real"
        tone="warning"
      />
      <AppButton label="Activar sesión simulada" onPress={signIn} />
    </Screen>
  );
}
