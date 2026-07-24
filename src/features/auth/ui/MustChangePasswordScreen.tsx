import { useSession } from '@/core/session';
import { AppButton, Screen, StateMessage } from '@/shared';

export function MustChangePasswordScreen() {
  const { busy, signOut } = useSession();
  return (
    <Screen scroll={false}>
      <StateMessage
        icon="🔑"
        title="Actualización de contraseña requerida"
        message="Debes actualizar tu contraseña mediante el canal definido por administración antes de usar GymBox."
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
