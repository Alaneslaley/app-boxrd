import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/shared/theme';

import type { StatusTone } from './StatusBadge';

const tones = {
  info: { background: colors.infoSoft, foreground: colors.primary, icon: 'ⓘ' },
  success: { background: colors.successSoft, foreground: colors.success, icon: '✓' },
  warning: { background: colors.warningSoft, foreground: colors.warning, icon: '⚠' },
  danger: { background: colors.dangerSoft, foreground: colors.danger, icon: '⊘' },
} as const;

export function AlertBanner({
  title,
  message,
  tone = 'info',
  action,
}: {
  title: string;
  message: string;
  tone?: StatusTone;
  action?: ReactNode;
}) {
  const palette = tones[tone];
  return (
    <View
      accessibilityLiveRegion={tone === 'danger' ? 'assertive' : 'polite'}
      style={[styles.banner, { backgroundColor: palette.background }]}
    >
      <Text style={[styles.title, { color: palette.foreground }]}>
        {palette.icon} {title}
      </Text>
      <Text style={styles.message}>{message}</Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { gap: spacing[2], borderRadius: radius.md, padding: spacing[4] },
  title: typography.title,
  message: { ...typography.body, color: colors.text },
});
