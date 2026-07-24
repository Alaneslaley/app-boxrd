import { useState } from 'react';
import { View } from 'react-native';

import { formatBuildIdentifier, getEnvironment } from '@/core/config';
import { useNetworkStatus } from '@/core/query';
import { useSession } from '@/core/session';
import {
  AlertBanner,
  AppButton,
  OfflineBanner,
  Screen,
  StatusBadge,
} from '@/shared';
import { spacing } from '@/shared/theme';

export function PhaseZeroLandingScreen({
  onOpenProtected,
  onOpenSignIn,
  onOpenDesignSystem,
}: {
  onOpenProtected: () => void;
  onOpenSignIn: () => void;
  onOpenDesignSystem: () => void;
}) {
  const environment = getEnvironment();
  const { isOnline } = useNetworkStatus();
  const { state } = useSession();
  const [previewOffline, setPreviewOffline] = useState(false);

  return (
    <Screen
      subtitle="Fundación técnica para iniciar el Sprint 1, sin autenticación real."
      title="GymBox Mobile"
    >
      <OfflineBanner visible={!isOnline || previewOffline} />
      <StatusBadge
        label={state.status === 'authenticated' ? 'Sesión simulada activa' : 'Ruta pública'}
        tone={state.status === 'authenticated' ? 'success' : 'info'}
      />
      <AlertBanner
        message={formatBuildIdentifier(environment)}
        title="Build de diagnóstico"
        tone="info"
      />
      <View style={{ gap: spacing[3] }}>
        {state.status === 'authenticated' ? (
          <AppButton label="Abrir ruta protegida" onPress={onOpenProtected} />
        ) : (
          <AppButton label="Iniciar sesión simulada" onPress={onOpenSignIn} />
        )}
        <AppButton
          label="Ver design system"
          variant="secondary"
          onPress={onOpenDesignSystem}
        />
        <AppButton
          label={previewOffline ? 'Restaurar vista online' : 'Previsualizar modo offline'}
          variant="secondary"
          onPress={() => setPreviewOffline((current) => !current)}
        />
      </View>
    </Screen>
  );
}
