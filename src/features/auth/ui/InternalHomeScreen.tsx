import { StyleSheet, Text, View } from 'react-native';

import {
  formatBuildIdentifier,
  getEnvironment,
} from '@/core/config';
import { useSession } from '@/core/session';
import {
  AlertBanner,
  AppButton,
  Screen,
  StatusBadge,
} from '@/shared';
import { colors, spacing, typography } from '@/shared/theme';

export function InternalHomeScreen() {
  const { state, busy, signOut } = useSession();
  if (state.status !== 'authenticated') return null;

  const environment = getEnvironment();

  return (
    <Screen
      subtitle={`Sucursal: ${state.user.branchName}`}
      title={`Hola, ${state.user.fullName}`}
    >
      <StatusBadge label="Sesión autenticada" tone="success" />
      <AlertBanner
        message="Esta shell confirma sesión y autorización. Los módulos operativos comienzan en el Sprint 2."
        title="Sprint 1"
        tone="info"
      />
      <View style={styles.card}>
        <Text style={styles.heading}>Acceso actual</Text>
        <Text style={styles.body}>
          Roles: {state.user.roles.join(', ') || 'Sin rol informado'}
        </Text>
        <Text style={styles.body}>
          Permisos vigentes: {state.permissions.size}
        </Text>
      </View>
      <AppButton
        label="Cerrar sesión"
        loading={busy === 'signing-out'}
        variant="danger"
        onPress={() => {
          void signOut();
        }}
      />
      <Text style={styles.support}>
        {formatBuildIdentifier(environment)}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing[2],
    padding: spacing[4],
    backgroundColor: colors.surface,
  },
  heading: { ...typography.title, color: colors.text },
  body: { ...typography.body, color: colors.text },
  support: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
