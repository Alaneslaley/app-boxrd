import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';

import { AppButton, PasswordField, TextField } from '@/shared';
import { spacing } from '@/shared/theme';

import {
  credentialsSchema,
  type CredentialsInput,
  type NormalizedCredentials,
} from '../../api/auth-schemas';

export type SignInFormProps = Readonly<{
  loading: boolean;
  offline: boolean;
  onSubmit(credentials: NormalizedCredentials): Promise<boolean>;
}>;

export function SignInForm({
  loading,
  offline,
  onSubmit,
}: SignInFormProps) {
  const {
    control,
    formState: { isSubmitting },
    handleSubmit,
    resetField,
  } = useForm<CredentialsInput, unknown, NormalizedCredentials>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onSubmit',
  });

  const submit = handleSubmit(async (values) => {
    const success = await onSubmit(values);
    if (success) resetField('password');
  });
  const busy = loading || isSubmitting;

  return (
    <View style={{ gap: spacing[4] }}>
      <Controller
        control={control}
        name="email"
        render={({ field: { onBlur, onChange, ref, value }, fieldState }) => (
          <TextField
            ref={ref}
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            editable={!busy}
            error={fieldState.error?.message}
            keyboardType="email-address"
            label="Correo electrónico"
            onBlur={onBlur}
            onChangeText={onChange}
            placeholder="nombre@ejemplo.com"
            returnKeyType="next"
            textContentType="username"
            value={value}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field: { onBlur, onChange, ref, value }, fieldState }) => (
          <PasswordField
            ref={ref}
            autoCapitalize="none"
            autoComplete="current-password"
            editable={!busy}
            error={fieldState.error?.message}
            label="Contraseña"
            onBlur={onBlur}
            onChangeText={onChange}
            onSubmitEditing={() => {
              void submit();
            }}
            returnKeyType="done"
            value={value}
          />
        )}
      />
      <AppButton
        accessibilityHint={
          offline
            ? 'Recupera la conexión para poder autenticarte.'
            : 'Envía tus credenciales de forma segura.'
        }
        disabled={offline || busy}
        label="Iniciar sesión"
        loading={busy}
        onPress={() => {
          void submit();
        }}
      />
    </View>
  );
}
