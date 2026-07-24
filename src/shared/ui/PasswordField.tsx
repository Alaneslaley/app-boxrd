import { useState } from 'react';
import { View } from 'react-native';

import { spacing } from '@/shared/theme';

import { AppButton } from './AppButton';
import { TextField, type TextFieldProps } from './TextField';

export function PasswordField(props: Omit<TextFieldProps, 'secureTextEntry'>) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={{ gap: spacing[2] }}>
      <TextField {...props} secureTextEntry={!visible} textContentType="password" />
      <AppButton
        label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        variant="secondary"
        onPress={() => setVisible((current) => !current)}
      />
    </View>
  );
}
