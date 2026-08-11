import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  AccessibilityInfo,
  ActivityIndicator,
  FlatList,
  findNodeHandle,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ApiError } from '@/core/http';
import { can } from '@/core/permissions';
import { useNetworkStatus } from '@/core/query';
import { useSession } from '@/core/session';
import { isUuid } from '@/core/validation';
import {
  ProtectedStudentPhoto,
  useStudentDetail,
  useStudentMemberships,
  type Membership,
} from '@/features/students';
import {
  AccessDeniedState,
  AlertBanner,
  AppButton,
  EmptyState,
  ErrorState,
  LoadingState,
  OfflineBanner,
  Screen,
  StatusBadge,
} from '@/shared';
import { colors, radius, spacing, typography } from '@/shared/theme';

import {
  dedupeAttendancePages,
  useAttendanceToday,
  useRegisterCheckIn,
  useStudentAttendance,
} from '../application/attendance';
import type {
  Attendance,
  AttendanceDecision,
  CheckInResult,
} from '../model/attendance-models';

function attendanceTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

function attendanceDescription(item: Attendance): string {
  return `${item.studentName ?? 'Alumno'}; ${item.attendanceDate}; ${attendanceTime(item.checkedInAt)}; ${item.status}`;
}

function AttendanceCard({ item }: { item: Attendance }) {
  return (
    <View accessibilityLabel={attendanceDescription(item)} style={styles.card}>
      <View style={styles.cardHeading}>
        <Text style={styles.name}>{item.studentName ?? 'Alumno sin nombre disponible'}</Text>
        <StatusBadge label={item.status} tone="success" />
      </View>
      <Text style={styles.text}>Fecha: {item.attendanceDate}</Text>
      <Text style={styles.text}>Hora: {attendanceTime(item.checkedInAt)}</Text>
      {item.membershipStatusAtEvent ? (
        <Text style={styles.hint}>Membresía al registrar: {item.membershipStatusAtEvent}</Text>
      ) : null}
    </View>
  );
}

function AttendanceList({
  data,
  emptyTitle,
  isFetchingNextPage,
  isRefetching,
  hasNextPage,
  onEndReached,
  onRefresh,
}: {
  data: readonly Attendance[];
  emptyTitle: string;
  isFetchingNextPage: boolean;
  isRefetching: boolean;
  hasNextPage: boolean;
  onEndReached(): void;
  onRefresh(): void;
}) {
  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={data}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <AttendanceCard item={item} />}
      ListEmptyComponent={<EmptyState title={emptyTitle} />}
      ListFooterComponent={isFetchingNextPage ? <ActivityIndicator accessibilityLabel="Cargando más asistencias" /> : null}
      onEndReached={hasNextPage ? onEndReached : undefined}
      onEndReachedThreshold={0.25}
      onRefresh={onRefresh}
      refreshing={isRefetching && !isFetchingNextPage}
    />
  );
}

export function AttendanceTodayScreen() {
  const { state } = useSession();
  const { isOnline } = useNetworkStatus();
  const permitted = state.status === 'authenticated'
    && can(state.permissions, 'ASISTENCIAS_CONSULTAR');
  const query = useAttendanceToday({ permitted });
  const items = useMemo(() => dedupeAttendancePages(query.data?.pages), [query.data?.pages]);

  if (!permitted) return <Screen title="Asistencia de hoy"><AccessDeniedState /></Screen>;
  if (query.isPending && !query.data) {
    return (
      <Screen title="Asistencia de hoy">
        <OfflineBanner visible={!isOnline} />
        {!isOnline
          ? <EmptyState title="Sin datos disponibles sin conexión" message="Conéctate para consultar la asistencia de hoy." />
          : <LoadingState message="Cargando asistencias…" />}
      </Screen>
    );
  }
  if (query.isError && !query.data) {
    return (
      <Screen title="Asistencia de hoy">
        <OfflineBanner visible={!isOnline} />
        <ErrorState
          message={query.error instanceof ApiError ? query.error.message : undefined}
          onRetry={() => void query.refetch()}
          traceId={query.error instanceof ApiError ? query.error.traceId : undefined}
        />
      </Screen>
    );
  }

  return (
    <Screen title="Asistencia de hoy" subtitle={`${items.length} registros cargados`} scroll={false}>
      <OfflineBanner visible={!isOnline} />
      {!isOnline && items.length > 0 ? (
        <AlertBanner title="Datos guardados en memoria" tone="warning" message="Pueden estar desactualizados; no se persisten al cerrar sesión." />
      ) : null}
      <AttendanceList
        data={items}
        emptyTitle="Aún no hay asistencias hoy"
        hasNextPage={query.hasNextPage}
        isFetchingNextPage={query.isFetchingNextPage}
        isRefetching={query.isRefetching}
        onEndReached={() => {
          if (isOnline && query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
        }}
        onRefresh={() => { if (isOnline) void query.refetch(); }}
      />
    </Screen>
  );
}

export function AttendanceHistoryScreen({ studentId }: { studentId: string }) {
  const { state } = useSession();
  const { isOnline } = useNetworkStatus();
  const valid = isUuid(studentId);
  const permitted = state.status === 'authenticated'
    && can(state.permissions, 'ASISTENCIAS_CONSULTAR');
  const query = useStudentAttendance(studentId, { enabled: valid, permitted });
  const items = useMemo(() => dedupeAttendancePages(query.data?.pages), [query.data?.pages]);
  const name = items[0]?.studentName;

  if (!valid) return <Screen title="Historial de asistencia"><EmptyState title="Alumno no válido" /></Screen>;
  if (!permitted) return <Screen title="Historial de asistencia"><AccessDeniedState /></Screen>;
  if (query.isPending && !query.data) {
    return (
      <Screen title="Historial de asistencia">
        <OfflineBanner visible={!isOnline} />
        {!isOnline
          ? <EmptyState title="Sin historial disponible sin conexión" message="Conéctate para consultar este historial." />
          : <LoadingState message="Cargando historial…" />}
      </Screen>
    );
  }
  if (query.isError && !query.data) {
    return (
      <Screen title="Historial de asistencia">
        <ErrorState
          message={query.error instanceof ApiError ? query.error.message : undefined}
          onRetry={() => void query.refetch()}
          traceId={query.error instanceof ApiError ? query.error.traceId : undefined}
        />
      </Screen>
    );
  }

  return (
    <Screen title="Historial de asistencia" subtitle={name} scroll={false}>
      <OfflineBanner visible={!isOnline} />
      {!isOnline && items.length > 0 ? (
        <AlertBanner title="Historial en memoria" tone="warning" message="Puede estar desactualizado y se elimina al cerrar sesión." />
      ) : null}
      <AttendanceList
        data={items}
        emptyTitle="Este alumno aún no tiene asistencias"
        hasNextPage={query.hasNextPage}
        isFetchingNextPage={query.isFetchingNextPage}
        isRefetching={query.isRefetching}
        onEndReached={() => {
          if (isOnline && query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
        }}
        onRefresh={() => { if (isOnline) void query.refetch(); }}
      />
    </Screen>
  );
}

type DecisionPresentation = Readonly<{
  title: string;
  message: string;
  tone: 'success' | 'info' | 'warning' | 'danger';
}>;

export function decisionPresentation(decision: AttendanceDecision): DecisionPresentation {
  switch (decision) {
    case 'ALLOWED':
      return { title: 'Check-in registrado', message: 'La asistencia quedó confirmada por el servidor.', tone: 'success' };
    case 'ALREADY_REGISTERED':
      return { title: 'Asistencia ya registrada', message: 'El servidor confirmó que este alumno ya tenía check-in hoy. No se creó otro.', tone: 'info' };
    case 'BLOCKED_EXPIRED_MEMBERSHIP':
      return { title: 'Check-in bloqueado', message: 'La membresía está vencida. No se registró asistencia.', tone: 'warning' };
    case 'BLOCKED_INACTIVE_STUDENT':
      return { title: 'Check-in bloqueado', message: 'El alumno está inactivo. No se registró asistencia.', tone: 'danger' };
  }
}

function preferredMembership(memberships: readonly Membership[]): Membership | undefined {
  return memberships.find((item) => item.expirationStatus === 'ACTIVE')
    ?? memberships.find((item) => item.expirationStatus === 'EXPIRING_SOON')
    ?? memberships[0];
}

function CheckInResultCard({
  result,
  onToday,
  onHistory,
  onPayment,
}: {
  result: CheckInResult;
  onToday(): void;
  onHistory(): void;
  onPayment?: () => void;
}) {
  const presentation = decisionPresentation(result.decision);
  const resultRef = useRef<View>(null);

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(`${presentation.title}. ${presentation.message}`);
    const handle = findNodeHandle(resultRef.current);
    if (handle) AccessibilityInfo.setAccessibilityFocus(handle);
  }, [presentation.message, presentation.title]);

  return (
    <View ref={resultRef} accessible accessibilityRole="alert" style={styles.result}>
      <AlertBanner title={presentation.title} message={presentation.message} tone={presentation.tone} />
      {result.studentName ? <Text style={styles.name}>{result.studentName}</Text> : null}
      {result.attendance ? (
        <Text style={styles.text}>Hora confirmada: {attendanceTime(result.attendance.checkedInAt)}</Text>
      ) : null}
      {result.membershipStatus ? <Text style={styles.text}>Membresía: {result.membershipStatus}</Text> : null}
      {result.membershipEndDate ? <Text style={styles.text}>Vencimiento: {result.membershipEndDate}</Text> : null}
      {onPayment ? <AppButton label="Registrar pago" onPress={onPayment} /> : null}
      <AppButton label="Ver asistencia de hoy" onPress={onToday} variant="secondary" />
      <AppButton label="Ver historial" onPress={onHistory} variant="secondary" />
    </View>
  );
}

export function CheckInScreen({ studentId }: { studentId: string }) {
  const router = useRouter();
  const { state } = useSession();
  const { isOnline } = useNetworkStatus();
  const [confirming, setConfirming] = useState(false);
  const valid = isUuid(studentId);
  const permitted = state.status === 'authenticated'
    && can(state.permissions, 'ASISTENCIAS_REGISTRAR')
    && can(state.permissions, 'ALUMNOS_CONSULTAR');
  const mayReadMemberships = state.status === 'authenticated'
    && can(state.permissions, 'MEMBRESIAS_CONSULTAR');
  const mayRegisterPayment = state.status === 'authenticated'
    && can(state.permissions, 'PAGOS_REGISTRAR');
  const student = useStudentDetail(studentId, valid && permitted);
  const memberships = useStudentMemberships(
    studentId,
    valid && permitted && mayReadMemberships,
  );
  const mutation = useRegisterCheckIn({ permitted });
  const selectedMembership = preferredMembership(memberships.data ?? []);
  const expiredMembership = memberships.data?.find(
    (item) => item.expirationStatus === 'EXPIRED' && item.planId,
  );

  if (!valid) return <Screen title="Registrar check-in"><EmptyState title="Alumno no válido" /></Screen>;
  if (!permitted) return <Screen title="Registrar check-in"><AccessDeniedState /></Screen>;
  if (student.isPending) return <Screen title="Registrar check-in"><LoadingState message="Verificando alumno…" /></Screen>;
  if (student.isError) {
    return (
      <Screen title="Registrar check-in">
        <ErrorState
          message={student.error instanceof ApiError ? student.error.message : undefined}
          onRetry={() => void student.refetch()}
          traceId={student.error instanceof ApiError ? student.error.traceId : undefined}
        />
      </Screen>
    );
  }

  const value = student.data;
  if (mutation.data) {
    const paymentMembership = mutation.data.decision === 'BLOCKED_EXPIRED_MEMBERSHIP'
      && mayRegisterPayment
      ? expiredMembership
      : undefined;
    return (
      <Screen title="Resultado del check-in">
        <CheckInResultCard
          result={mutation.data}
          onHistory={() => router.replace({
            pathname: './student/[studentId]',
            params: { studentId },
          })}
          onPayment={paymentMembership?.planId ? () => router.push({
            pathname: '../payments/register',
            params: {
              membershipId: paymentMembership.id,
              planId: paymentMembership.planId,
              studentId,
              studentName: value.fullName,
            },
          }) : undefined}
          onToday={() => router.replace('./')}
        />
      </Screen>
    );
  }

  return (
    <Screen title="Registrar check-in" subtitle="Confirma la identidad antes de enviar">
      <OfflineBanner visible={!isOnline} />
      <View style={styles.identity}>
        <ProtectedStudentPhoto fileId={value.photoFileId} name={value.fullName} />
        <View style={styles.grow}>
          <Text style={styles.name}>{value.fullName}</Text>
          {value.status ? <StatusBadge label={value.status} /> : null}
          {value.age !== undefined ? <Text style={styles.text}>Edad: {value.age}</Text> : null}
          {value.level ? <Text style={styles.text}>Nivel: {value.level}</Text> : null}
        </View>
      </View>
      {!mayReadMemberships ? (
        <AlertBanner title="Membresía no visible" tone="warning" message="Tu sesión no puede consultar membresías; el servidor tomará la decisión autoritativa." />
      ) : memberships.isPending ? (
        <LoadingState message="Verificando membresía…" />
      ) : memberships.isError ? (
        <AlertBanner title="No se pudo verificar la membresía" tone="warning" message="Puedes reintentar la consulta antes de confirmar." action={<AppButton label="Reintentar membresía" variant="secondary" onPress={() => void memberships.refetch()} />} />
      ) : selectedMembership ? (
        <View style={styles.card}>
          <Text style={styles.name}>{selectedMembership.planName ?? 'Membresía'}</Text>
          <StatusBadge
            label={selectedMembership.expirationStatus}
            tone={selectedMembership.expirationStatus === 'ACTIVE' ? 'success' : selectedMembership.expirationStatus === 'EXPIRING_SOON' ? 'warning' : 'danger'}
          />
          {selectedMembership.endDate ? <Text style={styles.text}>Vence: {selectedMembership.endDate}</Text> : null}
        </View>
      ) : <EmptyState title="Sin membresía visible" message="El servidor decidirá si permite el check-in." />}
      {!isOnline ? (
        <AlertBanner title="Check-in deshabilitado" tone="warning" message="No se encola ni se guarda una asistencia sin conexión." />
      ) : null}
      {confirming ? (
        <View style={styles.confirmation}>
          <Text style={styles.name}>Confirmar check-in</Text>
          <Text style={styles.text}>Alumno: {value.fullName}</Text>
          <Text style={styles.hint}>Se enviará una sola solicitud y la decisión final será del servidor.</Text>
          <AppButton
            label="Registrar check-in ahora"
            disabled={!isOnline}
            loading={mutation.isPending}
            onPress={() => mutation.mutate(studentId)}
          />
          <AppButton
            label="Cancelar"
            disabled={mutation.isPending}
            onPress={() => setConfirming(false)}
            variant="secondary"
          />
        </View>
      ) : (
        <AppButton
          label="Revisar check-in"
          disabled={!isOnline}
          onPress={() => setConfirming(true)}
        />
      )}
      {mutation.isError ? (
        <ErrorState
          message={mutation.error instanceof ApiError ? mutation.error.message : undefined}
          traceId={mutation.error instanceof ApiError ? mutation.error.traceId : undefined}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing[2],
    padding: spacing[4],
  },
  cardHeading: { alignItems: 'flex-start', gap: spacing[2] },
  confirmation: {
    backgroundColor: colors.infoSoft,
    borderColor: colors.primary,
    borderRadius: radius.md,
    borderWidth: 2,
    gap: spacing[3],
    padding: spacing[4],
  },
  grow: { flex: 1, gap: spacing[2] },
  hint: { ...typography.caption, color: colors.textMuted },
  identity: { alignItems: 'center', flexDirection: 'row', gap: spacing[4] },
  list: { flexGrow: 1, gap: spacing[3], paddingBottom: spacing[5] },
  name: { ...typography.title, color: colors.text },
  result: { gap: spacing[3] },
  text: { ...typography.body, color: colors.text },
});
