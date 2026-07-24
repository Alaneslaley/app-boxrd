import { StyleSheet, Text } from 'react-native';

import {
  formatBuildIdentifier,
  getEnvironment,
} from '@/core/config';
import { useSession } from '@/core/session';
import {
  AlertBanner,
  AppButton,
  OfflineBanner,
  Screen,
} from '@/shared';
import { colors, typography } from '@/shared/theme';

import { useSignIn } from '../application/use-sign-in';
import { SignInForm } from './components/SignInForm';

export function SignInScreen() {
  const environment = getEnvironment();
  const { busy, retryBootstrap, state } = useSession();
  const { error, execute, isOnline, isSubmitting } = useSignIn();
  const bootstrapNotice =
    state.status === 'anonymous' ? state.notice : undefined;

  return (
    <Screen
      subtitle="Accede con las credenciales asignadas por Escuela de Box RD."
      title="GymBox"
    >
      <OfflineBanner visible={!isOnline} />
      {bootstrapNotice ? (
        <AlertBanner
          message={`${bootstrapNotice.message}${
            bootstrapNotice.traceId
              ? ` Código de soporte: ${bootstrapNotice.traceId}.`
              : ''
          }`}
          title="No se pudo restaurar la sesión"
          tone="warning"
          action={
            bootstrapNotice.retryable ? (
              <AppButton
                disabled={!isOnline || busy === 'recovering'}
                label="Reintentar restauración"
                loading={busy === 'recovering'}
                variant="secondary"
                onPress={() => {
                  void retryBootstrap();
                }}
              />
            ) : undefined
          }
        />
      ) : null}
      {error ? (
        <AlertBanner
          message={`${error.message}${
            error.traceId ? ` Código de soporte: ${error.traceId}.` : ''
          }`}
          title="No pudimos iniciar sesión"
          tone="danger"
        />
      ) : null}
      <SignInForm
        loading={isSubmitting}
        offline={!isOnline}
        onSubmit={execute}
      />
      <Text style={styles.support}>
        {formatBuildIdentifier(environment)}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  support: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
