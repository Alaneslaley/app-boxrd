import { useSession } from '@/core/session';
import { AppButton, Screen, StateMessage } from '@/shared';

export function ExperienceNotAvailableScreen() {
  const { busy, signOut } = useSession();
  return (
    <Screen scroll={false}>
      <StateMessage
        icon="🥊"
        title="Experiencia en preparación"
        message="La experiencia para alumnos estará disponible en una fase posterior."
        action={
          <AppButton
            label="Cerrar sesión"
            loading={busy === 'signing-out'}
            variant="danger"
            onPress={() => {
              void signOut();
            }}
          />
        }
      />
    </Screen>
  );
}
