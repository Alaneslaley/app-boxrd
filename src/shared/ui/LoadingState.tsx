import { ActivityIndicator } from 'react-native';

import { colors } from '@/shared/theme';

import { StateMessage } from './StateMessage';

export function LoadingState({ message = 'Preparando la aplicación…' }: { message?: string }) {
  return (
    <StateMessage
      action={<ActivityIndicator accessibilityLabel="Cargando" color={colors.primary} />}
      icon="◌"
      message={message}
      title="Cargando"
    />
  );
}
