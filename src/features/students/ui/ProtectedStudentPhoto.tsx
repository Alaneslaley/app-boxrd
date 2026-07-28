import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { useSession } from '@/core/session';
import { colors, radius, typography } from '@/shared/theme';

export function ProtectedStudentPhoto({ fileId, name }: { fileId?: string; name: string }) {
  const { protectedMediaSource } = useSession();
  const source = fileId ? protectedMediaSource?.(`/media/${fileId}`) : undefined;
  if (!source) return <View accessibilityLabel={`Sin foto de ${name}`} style={styles.placeholder}><Text style={styles.text}>Sin foto</Text></View>;
  return <Image accessibilityLabel={`Foto de ${name}`} contentFit="cover" onError={() => undefined} source={source} style={styles.image} transition={150} />;
}

const styles = StyleSheet.create({
  image: { width: 88, height: 88, borderRadius: radius.lg, backgroundColor: colors.border },
  placeholder: { width: 88, height: 88, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.infoSoft },
  text: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
});
