import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/core/http';
import { can } from '@/core/permissions';
import { useNetworkStatus } from '@/core/query';
import { useSession } from '@/core/session';
import { AccessDeniedState, AlertBanner, AppButton, ErrorState, LoadingState, OfflineBanner, Screen } from '@/shared';
import { colors, radius, spacing, typography } from '@/shared/theme';

import { useInstructorTodaySummary } from '../application/instructor-queries';

const labels = [
  ['Alumnos activos', 'activeStudents'], ['Asistencias hoy', 'attendanceToday'], ['Membresías activas', 'activeMemberships'], ['Próximas a vencer', 'expiringSoonMemberships'], ['Vencidas', 'expiredMemberships'],
] as const;

export function InstructorTodayScreen() {
  const router = useRouter();
  const { state, busy, signOut } = useSession();
  const { isOnline } = useNetworkStatus();
  const summary = useInstructorTodaySummary();
  if (state.status !== 'authenticated') return null;
  const canReadStudents = can(state.permissions, 'ALUMNOS_CONSULTAR');
  const canReadAttendance = can(state.permissions, 'ASISTENCIAS_CONSULTAR');
  const canReadCash = can(state.permissions, 'CAJA_CONSULTAR');
  if (summary.isPending) return <Screen title={`Hola, ${state.user.firstName}`} subtitle="Operación de hoy"><LoadingState message="Cargando resumen operativo…" /></Screen>;
  if (summary.isError) return <Screen title={`Hola, ${state.user.firstName}`} subtitle="Operación de hoy">{summary.error instanceof ApiError && summary.error.status === 403 ? <AccessDeniedState /> : <ErrorState onRetry={() => void summary.refetch()} traceId={summary.error instanceof ApiError ? summary.error.traceId : undefined} />}</Screen>;
  const data = summary.data;
  return <Screen title={`Hola, ${state.user.firstName}`} subtitle={`${data.branchName} · ${data.businessDate}`}>
    <OfflineBanner visible={!isOnline} />
    {summary.isStale ? <AlertBanner title="Datos por actualizar" tone="warning" message="Se actualizarán al recuperar conexión o al tocar Actualizar." /> : null}
    <View style={styles.grid}>{labels.map(([label, field]) => <View key={field} accessibilityLabel={`${label}: ${data[field]}`} style={styles.card}><Text style={styles.count}>{data[field]}</Text><Text style={styles.label}>{label}</Text></View>)}</View>
    <AppButton label="Actualizar resumen" loading={summary.isRefetching} onPress={() => void summary.refetch()} variant="secondary" />
    <Text style={styles.section}>Acciones rápidas</Text>
    <AppButton disabled={!canReadAttendance} label="Asistencia de hoy" onPress={() => router.push('./attendance')} />
    <AppButton disabled={!canReadStudents} label="Buscar alumnos" onPress={() => router.push('./students')} />
    <AppButton disabled={!canReadCash} label="Consultar caja" onPress={() => router.push('./cash')} variant="secondary" />
    {!canReadStudents ? <Text style={styles.hint}>Tu sesión no tiene permiso para consultar alumnos.</Text> : null}
    {!canReadAttendance ? <Text style={styles.hint}>Tu sesión no tiene permiso para consultar asistencias.</Text> : null}
    <AppButton label="Cerrar sesión" loading={busy === 'signing-out'} onPress={() => { void signOut(); }} variant="danger" />
  </Screen>;
}

const styles = StyleSheet.create({ grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3] }, card: { minWidth: '46%', flexGrow: 1, gap: spacing[1], borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing[4], backgroundColor: colors.surface }, count: { ...typography.heading, color: colors.text }, label: { ...typography.caption, color: colors.textMuted }, section: { ...typography.title, color: colors.text }, hint: { ...typography.caption, color: colors.textMuted } });
