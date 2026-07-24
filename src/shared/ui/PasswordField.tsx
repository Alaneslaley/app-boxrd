import { forwardRef, useState } from 'react';
import { View, type TextInput } from 'react-native';

import { spacing } from '@/shared/theme';

import { AppButton } from './AppButton';
import { TextField, type TextFieldProps } from './TextField';

export const PasswordField = forwardRef<
  TextInput,
  Omit<TextFieldProps, 'secureTextEntry'>
>(function PasswordField(props, ref) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={{ gap: spacing[2] }}>
      <TextField
        {...props}
        ref={ref}
        secureTextEntry={!visible}
        textContentType="password"
      />
      <AppButton
        accessibilityHint={
          visible
            ? 'Oculta el contenido del campo contraseña.'
            : 'Muestra temporalmente el contenido del campo contraseña.'
        }
        label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        variant="secondary"
        onPress={() => setVisible((current) => !current)}
      />
    </View>
  );
});
