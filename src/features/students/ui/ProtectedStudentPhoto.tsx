import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useSession } from '@/core/session';
import { colors, radius, typography } from '@/shared/theme';

export function ProtectedStudentPhoto({ fileId, name }: { fileId?: string; name: string }) {
  const { protectedMediaSource } = useSession();
  const [failed, setFailed] = useState(false);
  const source = fileId ? protectedMediaSource?.(`/media/${fileId}`) : undefined;
  if (!source || failed) return <View accessibilityLabel={`${failed ? 'Foto no disponible' : 'Sin foto'} de ${name}`} style={styles.placeholder}><Text style={styles.text}>{failed ? 'Foto no disponible' : 'Sin foto'}</Text></View>;
  return <Image accessibilityLabel={`Foto de ${name}`} cachePolicy="memory" contentFit="cover" onError={() => setFailed(true)} source={source} style={styles.image} transition={150} />;
}

const styles = StyleSheet.create({
  image: { width: 88, height: 88, borderRadius: radius.lg, backgroundColor: colors.border },
  placeholder: { width: 88, height: 88, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.infoSoft },
  text: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
});
