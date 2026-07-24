import { useSession } from '@/core/session';
import { AccessDeniedState, AppButton, Screen } from '@/shared';

export function AuthAccessDeniedScreen() {
  const { busy, signOut } = useSession();
  return (
    <Screen scroll={false}>
      <AccessDeniedState
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
