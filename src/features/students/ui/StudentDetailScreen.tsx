import { StyleSheet, Text, View } from 'react-native';

import { can } from '@/core/permissions';
import { useSession } from '@/core/session';
import { AccessDeniedState, EmptyState, ErrorState, LoadingState, Screen, StatusBadge } from '@/shared';
import { colors, spacing, typography } from '@/shared/theme';

import { useStudentDetail, useStudentMemberships } from '../application/student-queries';
import { ProtectedStudentPhoto } from './ProtectedStudentPhoto';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const toneFor = (status?: string) => status?.toUpperCase().includes('ACTIVE') ? 'success' : status?.toUpperCase().includes('EXPIRED') ? 'danger' : 'info' as const;

export function StudentDetailScreen({ studentId }: { studentId: string }) {
  const { state } = useSession();
  const valid = UUID.test(studentId);
  const permitted = state.status === 'authenticated' && can(state.permissions, 'ALUMNOS_CONSULTAR');
  const student = useStudentDetail(studentId, valid && permitted);
  const membershipsAllowed = state.status === 'authenticated' && can(state.permissions, 'MEMBRESIAS_CONSULTAR');
  const memberships = useStudentMemberships(studentId, valid && permitted && membershipsAllowed);
  if (!valid) return <Screen><EmptyState title="Alumno no encontrado" message="El identificador del alumno no es válido." /></Screen>;
  if (!permitted) return <Screen><AccessDeniedState /></Screen>;
  if (student.isPending) return <Screen><LoadingState message="Cargando ficha del alumno…" /></Screen>;
  if (student.isError) return <Screen><ErrorState onRetry={() => void student.refetch()} traceId={student.error instanceof Error && 'traceId' in student.error ? String(student.error.traceId ?? '') : undefined} /></Screen>;
  const value = student.data;
  return <Screen title="Ficha del alumno" subtitle={value.fullName}>
    <View style={styles.identity}><ProtectedStudentPhoto fileId={value.photoFileId} name={value.fullName} /><View style={styles.grow}><Text style={styles.name}>{value.fullName}</Text>{value.status ? <StatusBadge label={value.status} tone={toneFor(value.status)} /> : <StatusBadge label="Estado no disponible" />}</View></View>
    <View style={styles.card}>{value.phone ? <Text style={styles.text}>Teléfono: {value.phone}</Text> : null}{value.age !== undefined ? <Text style={styles.text}>Edad: {value.age}</Text> : null}{value.ageCategory ? <Text style={styles.text}>Categoría: {value.ageCategory}</Text> : null}{value.level ? <Text style={styles.text}>Nivel: {value.level}</Text> : null}</View>
    <Text style={styles.section}>Membresías</Text>
    {!membershipsAllowed ? <AccessDeniedState /> : memberships.isPending ? <LoadingState message="Cargando membresías…" /> : memberships.isError ? <ErrorState onRetry={() => void memberships.refetch()} /> : memberships.data.length === 0 ? <EmptyState title="Sin membresía registrada" /> : memberships.data.map((membership) => <View key={membership.id} style={styles.card}><Text style={styles.name}>{membership.planName ?? 'Plan no disponible'}</Text>{membership.planType ? <Text style={styles.text}>Tipo: {membership.planType}</Text> : null}{membership.endDate ? <Text style={styles.text}>Vence: {membership.endDate}</Text> : null}{membership.status ? <StatusBadge label={membership.status} tone={toneFor(membership.status)} /> : <StatusBadge label="Estado no disponible" />}{membership.remainingClasses !== undefined ? <Text style={styles.text}>Clases restantes: {membership.remainingClasses}</Text> : null}</View>)}
  </Screen>;
}
const styles = StyleSheet.create({ identity: { flexDirection: 'row', gap: spacing[4], alignItems: 'center' }, grow: { flex: 1, gap: spacing[2] }, card: { gap: spacing[2], borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: spacing[4], backgroundColor: colors.surface }, name: { ...typography.title, color: colors.text }, text: { ...typography.body, color: colors.text }, section: { ...typography.heading, color: colors.text } });
