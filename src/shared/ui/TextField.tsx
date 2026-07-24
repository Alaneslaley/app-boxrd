import { forwardRef } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors, radius, spacing, typography } from '@/shared/theme';

export type TextFieldProps = TextInputProps &
  Readonly<{
    label: string;
    error?: string;
    hint?: string;
  }>;

export const TextField = forwardRef<TextInput, TextFieldProps>(
  function TextField(
    {
      label,
      error,
      hint,
      accessibilityLabel = label,
      ...props
    },
    ref,
  ) {
    return (
      <View style={styles.group}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
          ref={ref}
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={hint}
          style={[styles.input, error ? styles.inputError : undefined]}
          placeholderTextColor={colors.disabled}
          {...props}
        />
        {error ? (
          <Text
            accessibilityLiveRegion="assertive"
            accessibilityRole="alert"
            style={styles.error}
          >
            ⚠ {error}
          </Text>
        ) : hint ? (
          <Text style={styles.hint}>{hint}</Text>
        ) : null}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  group: { gap: spacing[2] },
  label: { ...typography.label, color: colors.text },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing[3],
    color: colors.text,
    backgroundColor: colors.surface,
    ...typography.body,
  },
  inputError: { borderColor: colors.danger, borderWidth: 2 },
  error: { ...typography.caption, color: colors.danger },
  hint: { ...typography.caption, color: colors.textMuted },
});
