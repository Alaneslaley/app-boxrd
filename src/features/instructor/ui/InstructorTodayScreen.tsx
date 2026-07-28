import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { can } from '@/core/permissions';
import { useSession } from '@/core/session';
import { AlertBanner, AppButton, Screen } from '@/shared';
import { colors, spacing, typography } from '@/shared/theme';

export function InstructorTodayScreen() {
  const router = useRouter();
  const { state, busy, signOut } = useSession();
  if (state.status !== 'authenticated') return null;
  const canReadStudents = can(state.permissions, 'ALUMNOS_CONSULTAR');
  return <Screen title={`Hola, ${state.user.firstName}`} subtitle="Operación de hoy">
    <AlertBanner title="Resumen operativo" tone="info" message="El contrato actual sólo publica registros de asistencia paginados, no un resumen agregado. Se muestran accesos seguros sin inventar conteos." />
    <View style={{ gap: spacing[2] }}><Text style={{ ...typography.title, color: colors.text }}>Acciones rápidas</Text>
      <AppButton disabled={!canReadStudents} label="Buscar alumnos" onPress={() => router.push('./students')} />
      {!canReadStudents ? <Text style={{ ...typography.caption, color: colors.textMuted }}>Tu sesión no tiene permiso para consultar alumnos.</Text> : null}
    </View>
    <AppButton label="Cerrar sesión" loading={busy === 'signing-out'} onPress={() => { void signOut(); }} variant="danger" />
  </Screen>;
}
