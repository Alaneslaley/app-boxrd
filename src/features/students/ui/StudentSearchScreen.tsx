import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ApiError } from '@/core/http';
import { can } from '@/core/permissions';
import { useNetworkStatus } from '@/core/query';
import { useSession } from '@/core/session';
import { AccessDeniedState, AlertBanner, AppButton, EmptyState, ErrorState, LoadingState, OfflineBanner, Screen, StatusBadge, TextField } from '@/shared';
import { colors, radius, spacing, typography } from '@/shared/theme';

import { dedupeStudentPages, normalizeStudentSearch, STUDENT_SEARCH_MIN_LENGTH, useStudentSearch, type StudentSummary } from '../application/student-queries';
import { ProtectedStudentPhoto } from './ProtectedStudentPhoto';

const DEBOUNCE_MS = 350;

function toneFor(status?: string) {
  return status?.toUpperCase().includes('ACTIVE') ? 'success' : 'info' as const;
}

export function StudentSearchScreen() {
  const router = useRouter();
  const { state } = useSession();
  const { isOnline } = useNetworkStatus();
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setSearch(normalizeStudentSearch(input)), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [input]);
  const permitted = state.status === 'authenticated' && can(state.permissions, 'ALUMNOS_CONSULTAR');
  const query = useStudentSearch(search);
  const results = useMemo(() => dedupeStudentPages(query.data?.pages), [query.data?.pages]);
  const tooShort = search.length > 0 && search.length < STUDENT_SEARCH_MIN_LENGTH;
  if (!permitted) return <Screen><AccessDeniedState /></Screen>;

  const renderStudent = ({ item }: { item: StudentSummary }) => <Pressable accessibilityLabel={`Abrir ficha de ${item.fullName}`} accessibilityRole="button" onPress={() => router.push({ pathname: './[studentId]', params: { studentId: item.id } })} style={styles.row}>
    <ProtectedStudentPhoto fileId={item.photoFileId} name={item.fullName} />
    <View style={styles.grow}><Text style={styles.name}>{item.fullName}</Text>{item.phone ? <Text style={styles.text}>{item.phone}</Text> : null}<View style={styles.meta}>{item.age !== undefined ? <Text style={styles.text}>{item.age} años</Text> : null}{item.level ? <Text style={styles.text}>{item.level}</Text> : null}</View>{item.status ? <StatusBadge label={item.status} tone={toneFor(item.status)} /> : null}</View>
  </Pressable>;

  return <Screen scroll={false} title="Alumnos" subtitle="Busca por nombre o teléfono.">
    <TextField accessibilityHint="La búsqueda se realiza en el servidor." autoCapitalize="words" autoCorrect={false} label="Nombre o teléfono" onChangeText={setInput} placeholder="Mínimo 2 caracteres" value={input} />
    {input ? <AppButton label="Limpiar búsqueda" onPress={() => setInput('')} variant="secondary" /> : null}
    <OfflineBanner visible={!isOnline} />
    {tooShort ? <AlertBanner title="Escribe al menos 2 caracteres" tone="info" message="La búsqueda empezará automáticamente." /> : null}
    {query.isError ? query.error instanceof ApiError && query.error.status === 403 ? <AccessDeniedState /> : <ErrorState onRetry={() => void query.refetch()} traceId={query.error instanceof ApiError ? query.error.traceId : undefined} /> : null}
    {query.isPending && search.length >= STUDENT_SEARCH_MIN_LENGTH ? <LoadingState message="Buscando alumnos…" /> : null}
    {!search ? <EmptyState title="Busca un alumno" message="Escribe nombre, apellido, nombre completo o teléfono." /> : null}
    {search.length >= STUDENT_SEARCH_MIN_LENGTH && !query.isPending && !query.isError ? <FlatList contentContainerStyle={styles.list} data={results} keyExtractor={(student) => student.id} ListEmptyComponent={<EmptyState title="Sin resultados" message="No encontramos alumnos con esa búsqueda." />} ListFooterComponent={query.isFetchingNextPage ? <LoadingState message="Cargando más alumnos…" /> : query.hasNextPage ? null : <Text style={styles.end}>Fin de los resultados</Text>} onEndReached={() => { if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage(); }} onEndReachedThreshold={0.4} onRefresh={() => void query.refetch()} refreshing={query.isRefetching && !query.isFetchingNextPage} renderItem={renderStudent} /> : null}
  </Screen>;
}

const styles = StyleSheet.create({
  list: { gap: spacing[3], paddingBottom: spacing[5] }, row: { flexDirection: 'row', gap: spacing[3], borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing[3], backgroundColor: colors.surface }, grow: { flex: 1, gap: spacing[1] }, name: { ...typography.title, color: colors.text }, text: { ...typography.caption, color: colors.textMuted }, meta: { flexDirection: 'row', gap: spacing[3] }, end: { ...typography.caption, color: colors.textMuted, textAlign: 'center', padding: spacing[3] },
});
