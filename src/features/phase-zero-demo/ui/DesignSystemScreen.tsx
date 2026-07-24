import { useState } from 'react';
import { View } from 'react-native';

import {
  AccessDeniedState,
  AlertBanner,
  AppButton,
  EmptyState,
  ErrorState,
  LoadingState,
  OfflineBanner,
  PasswordField,
  Screen,
  StatusBadge,
  TextField,
} from '@/shared';
import { spacing } from '@/shared/theme';

export function DesignSystemScreen() {
  const [text, setText] = useState('');
  return (
    <Screen
      subtitle="Los estados combinan símbolo, texto y color; los controles tienen al menos 48 dp."
      title="Design system"
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
        <StatusBadge label="Información" />
        <StatusBadge label="Correcto" tone="success" />
        <StatusBadge label="Atención" tone="warning" />
        <StatusBadge label="Bloqueado" tone="danger" />
      </View>
      <AlertBanner
        message="El rojo queda reservado para error, bloqueo, fraude o riesgo."
        title="Semántica de estados"
        tone="warning"
      />
      <OfflineBanner visible />
      <TextField
        hint="Campo de muestra; no se envía al servidor."
        label="Texto de demostración"
        value={text}
        onChangeText={setText}
      />
      <PasswordField
        label="Contraseña de demostración"
        value=""
        onChangeText={() => undefined}
      />
      <View style={{ gap: spacing[2] }}>
        <AppButton label="Acción principal" />
        <AppButton label="Acción secundaria" variant="secondary" />
        <AppButton disabled label="Acción deshabilitada" />
      </View>
      <LoadingState />
      <EmptyState />
      <ErrorState traceId="demo-trace-id" />
      <AccessDeniedState />
    </Screen>
  );
}
