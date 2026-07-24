import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
} from 'react-native';

import { colors, radius, spacing, typography } from '@/shared/theme';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

export type AppButtonProps = Omit<PressableProps, 'children' | 'style'> &
  Readonly<{
    label: string;
    variant?: ButtonVariant;
    loading?: boolean;
  }>;

const variantStyles = {
  primary: { backgroundColor: colors.primary, borderColor: colors.primary, color: colors.white },
  secondary: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    color: colors.primary,
  },
  danger: { backgroundColor: colors.danger, borderColor: colors.danger, color: colors.white },
} as const;

export function AppButton({
  label,
  variant = 'primary',
  loading = false,
  disabled,
  accessibilityLabel = label,
  ...props
}: AppButtonProps) {
  const palette = variantStyles[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: palette.backgroundColor, borderColor: palette.borderColor },
        pressed && styles.pressed,
        isDisabled && styles.disabled,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={palette.color} />
      ) : (
        <Text style={[styles.label, { color: palette.color }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 2,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  label: typography.label,
  pressed: { opacity: 0.84 },
  disabled: { opacity: 0.5 },
});
