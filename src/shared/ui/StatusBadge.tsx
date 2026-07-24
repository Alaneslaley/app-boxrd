import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/shared/theme';

export type StatusTone = 'info' | 'success' | 'warning' | 'danger';

const tones = {
  info: { background: colors.infoSoft, foreground: colors.primary, icon: 'ⓘ' },
  success: { background: colors.successSoft, foreground: colors.success, icon: '✓' },
  warning: { background: colors.warningSoft, foreground: colors.warning, icon: '⚠' },
  danger: { background: colors.dangerSoft, foreground: colors.danger, icon: '⊘' },
} as const;

export function StatusBadge({ label, tone = 'info' }: { label: string; tone?: StatusTone }) {
  const palette = tones[tone];
  return (
    <View
      accessibilityLabel={`${label}. Estado ${tone}`}
      accessibilityRole="text"
      style={[styles.badge, { backgroundColor: palette.background }]}
    >
      <Text style={[styles.text, { color: palette.foreground }]}>
        {palette.icon} {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  text: typography.label,
});
