import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ApiError } from '@/core/http';
import { can } from '@/core/permissions';
import { useSession } from '@/core/session';
import { AccessDeniedState, AppButton, EmptyState, ErrorState, LoadingState, Screen, StatusBadge } from '@/shared';
import { colors, spacing, typography } from '@/shared/theme';

import { useStudentDetail, useStudentMemberships, type Membership } from '../application/student-queries';
import { ProtectedStudentPhoto } from './ProtectedStudentPhoto';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const studentTone = (status?: string) => status?.toUpperCase().includes('ACTIVE') ? 'success' : 'info' as const;

export function membershipExpirationPresentation(membership: Membership): Readonly<{ label: string; tone: 'success' | 'warning' | 'danger' | 'info'; detail?: string }> {
  switch (membership.expirationStatus) {
    case 'ACTIVE': return { label: 'Activa', tone: 'success' };
    case 'EXPIRING_SOON': return { label: 'Próxima a vencer', tone: 'warning', detail: membership.daysUntilExpiration === 0 ? 'Vence hoy' : membership.daysUntilExpiration === 1 ? 'Vence mañana' : membership.daysUntilExpiration !== undefined ? `Vence en ${membership.daysUntilExpiration} días` : undefined };
    case 'EXPIRED': return { label: 'Vencida', tone: 'danger' };
    case 'INACTIVE': return { label: 'Inactiva', tone: 'info' };
    default: return { label: 'Estado no disponible', tone: 'info' };
  }
}

export function StudentDetailScreen({ studentId }: { studentId: string }) {
  const router = useRouter();
  const { state } = useSession();
  const valid = UUID.test(studentId);
  const permitted = state.status === 'authenticated' && can(state.permissions, 'ALUMNOS_CONSULTAR');
  const student = useStudentDetail(studentId, valid && permitted);
  const membershipsAllowed = state.status === 'authenticated' && can(state.permissions, 'MEMBRESIAS_CONSULTAR');
  const canRegisterPayment = state.status === 'authenticated' && can(state.permissions, 'PAGOS_REGISTRAR');
  const memberships = useStudentMemberships(studentId, valid && permitted && membershipsAllowed);
  if (!valid) return <Screen><EmptyState title="Alumno no encontrado" message="El identificador del alumno no es válido." /></Screen>;
  if (!permitted) return <Screen><AccessDeniedState /></Screen>;
  if (student.isPending) return <Screen><LoadingState message="Cargando ficha del alumno…" /></Screen>;
  if (student.isError) return <Screen><ErrorState onRetry={() => void student.refetch()} traceId={student.error instanceof ApiError ? student.error.traceId : undefined} /></Screen>;
  const value = student.data;
  return <Screen title="Ficha del alumno" subtitle={value.fullName}>
    <View style={styles.identity}><ProtectedStudentPhoto fileId={value.photoFileId} name={value.fullName} /><View style={styles.grow}><Text style={styles.name}>{value.fullName}</Text>{value.status ? <StatusBadge label={value.status} tone={studentTone(value.status)} /> : <StatusBadge label="Estado no disponible" />}</View></View>
    <View style={styles.card}>{value.phone ? <Text style={styles.text}>Teléfono: {value.phone}</Text> : null}{value.age !== undefined ? <Text style={styles.text}>Edad: {value.age}</Text> : null}{value.ageCategory ? <Text style={styles.text}>Categoría: {value.ageCategory}</Text> : null}{value.level ? <Text style={styles.text}>Nivel: {value.level}</Text> : null}</View>
    <Text style={styles.section}>Membresías</Text>
    {!membershipsAllowed ? <AccessDeniedState /> : memberships.isPending ? <LoadingState message="Cargando membresías…" /> : memberships.isError ? <ErrorState onRetry={() => void memberships.refetch()} traceId={memberships.error instanceof ApiError ? memberships.error.traceId : undefined} /> : memberships.data.length === 0 ? <EmptyState title="Sin membresía registrada" /> : memberships.data.map((membership) => { const expiration = membershipExpirationPresentation(membership); return <View key={membership.id} style={styles.card}><Text style={styles.name}>{membership.planName ?? 'Plan no disponible'}</Text>{membership.planType ? <Text style={styles.text}>Tipo: {membership.planType}</Text> : null}{membership.endDate ? <Text style={styles.text}>Vence: {membership.endDate}</Text> : null}<StatusBadge label={expiration.label} tone={expiration.tone} />{expiration.detail ? <Text accessibilityLabel={expiration.detail} style={styles.text}>{expiration.detail}</Text> : null}{membership.remainingClasses !== undefined ? <Text style={styles.text}>Clases restantes: {membership.remainingClasses}</Text> : null}{canRegisterPayment ? <AppButton label="Registrar pago" onPress={() => router.push({ pathname: '../../payments/register', params: { membershipId: membership.id, studentName: value.fullName } })} /> : null}</View>; })}
  </Screen>;
}
const styles = StyleSheet.create({ identity: { flexDirection: 'row', gap: spacing[4], alignItems: 'center' }, grow: { flex: 1, gap: spacing[2] }, card: { gap: spacing[2], borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: spacing[4], backgroundColor: colors.surface }, name: { ...typography.title, color: colors.text }, text: { ...typography.body, color: colors.text }, section: { ...typography.heading, color: colors.text } });
