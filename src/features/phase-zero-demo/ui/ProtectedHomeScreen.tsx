import { View } from 'react-native';

import { PermissionGate } from '@/core/permissions';
import { useSession } from '@/core/session';
import { AlertBanner, AppButton, Screen, StatusBadge } from '@/shared';
import { spacing } from '@/shared/theme';

export function ProtectedHomeScreen({
  onAccessDenied,
  onOpenDesignSystem,
  onSignedOut,
}: {
  onAccessDenied: () => void;
  onOpenDesignSystem: () => void;
  onSignedOut: () => void;
}) {
  const { state, simulateSignOut } = useSession();
  if (state.status !== 'authenticated') return null;

  const signOut = () => {
    simulateSignOut();
    onSignedOut();
  };

  return (
    <Screen
      subtitle={`Bienvenido, ${state.user.displayName}.`}
      title="Ruta protegida"
    >
      <StatusBadge label="Acceso permitido" tone="success" />
      <PermissionGate
        fallback={
          <AlertBanner
            message="El permiso demo no está disponible."
            title="Permiso insuficiente"
            tone="danger"
          />
        }
        required="phase-zero.protected"
      >
        <AlertBanner
          message="El guard mejora la navegación; no sustituye la autorización del backend."
          title="Guard visual activo"
          tone="info"
        />
      </PermissionGate>
      <View style={{ gap: spacing[3] }}>
        <AppButton label="Demostrar acceso denegado" onPress={onAccessDenied} />
        <AppButton
          label="Ver componentes"
          variant="secondary"
          onPress={onOpenDesignSystem}
        />
        <AppButton label="Cerrar sesión simulada" variant="danger" onPress={signOut} />
      </View>
    </Screen>
  );
}
