import { useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { financialErrorPresentation } from '@/core/financial';
import { ApiError } from '@/core/http';
import { can } from '@/core/permissions';
import { useNetworkStatus } from '@/core/query';
import { useSession } from '@/core/session';
import {
  AccessDeniedState,
  AlertBanner,
  AppButton,
  ErrorState,
  LoadingState,
  OfflineBanner,
  Screen,
  TextField,
} from '@/shared';
import { colors, radius, spacing, typography } from '@/shared/theme';

import {
  useCloseCashRegister,
  useCurrentCashRegister,
  useOpenCashRegister,
} from '../application/cash';
import {
  cashDifferenceLabel,
  parseMoneyInput,
  type ClosedCashRegister,
} from '../model/cash-models';

function FinancialError({ error }: { error: unknown }) {
  const presentation = financialErrorPresentation(error);
  const support = presentation.traceId
    ? `${presentation.message} Código de soporte: ${presentation.traceId}.`
    : presentation.message;
  return <AlertBanner title={presentation.title} message={support} tone="danger" />;
}

function signedMoney(value: number): string {
  if (value > 0) return `+$${value.toFixed(2)}`;
  if (value < 0) return `-$${Math.abs(value).toFixed(2)}`;
  return '$0.00';
}

export function CashRegisterScreen() {
  const router = useRouter();
  const { state } = useSession();
  const { isOnline } = useNetworkStatus();
  const read = state.status === 'authenticated' && can(state.permissions, 'CAJA_CONSULTAR');
  const mayOpen = state.status === 'authenticated' && can(state.permissions, 'CAJA_ABRIR');
  const mayClose = state.status === 'authenticated' && can(state.permissions, 'CAJA_CERRAR');
  const query = useCurrentCashRegister({ permitted: read, enabled: isOnline });

  if (!read) return <Screen title="Caja"><AccessDeniedState /></Screen>;
  if (!isOnline) {
    return <Screen title="Caja">
      <OfflineBanner visible />
      <Text style={styles.text}>La caja actual no puede confirmarse sin conexión.</Text>
    </Screen>;
  }
  if (query.isPending) {
    return <Screen title="Caja"><LoadingState message="Consultando caja…" /></Screen>;
  }
  if (query.isError) {
    if (query.error instanceof ApiError && query.error.status === 403) {
      return <Screen title="Caja"><AccessDeniedState /></Screen>;
    }
    const presentation = financialErrorPresentation(query.error);
    return <Screen title="Caja">
      <ErrorState
        message={presentation.message}
        onRetry={() => void query.refetch()}
        traceId={presentation.traceId}
      />
    </Screen>;
  }
  if (!query.data) {
    return <Screen title="Caja">
      <Text style={styles.title}>No hay una caja abierta</Text>
      {mayOpen ? <AppButton label="Abrir caja" onPress={() => router.push('./open')} /> : null}
      <AppButton label="Actualizar" variant="secondary" loading={query.isRefetching} onPress={() => void query.refetch()} />
    </Screen>;
  }

  const cash = query.data;
  return <Screen title="Caja" subtitle={cash.branchName ?? 'Sucursal actual'}>
    <View style={styles.card}>
      <Text style={styles.title}>Caja abierta · {cash.currency}</Text>
      <Text style={styles.text}>Inicial: ${cash.initialCash.toFixed(2)}</Text>
      <Text style={styles.text}>Esperado: ${cash.expectedCash.toFixed(2)}</Text>
      <Text style={styles.caption}>Abierta: {cash.openedAt}</Text>
    </View>
    {mayClose ? <AppButton label="Cerrar caja" variant="danger" onPress={() => router.push('./close')} /> : null}
    <AppButton label="Actualizar" variant="secondary" loading={query.isRefetching} onPress={() => void query.refetch()} />
  </Screen>;
}

export function OpenCashRegisterScreen() {
  const router = useRouter();
  const { state } = useSession();
  const { isOnline } = useNetworkStatus();
  const permitted = state.status === 'authenticated' && can(state.permissions, 'CAJA_ABRIR');
  const mutation = useOpenCashRegister({ permitted });
  const [input, setInput] = useState('');
  const [confirming, setConfirming] = useState(false);
  const parsed = parseMoneyInput(input);

  if (!permitted) return <Screen title="Abrir caja"><AccessDeniedState /></Screen>;

  const changeAmount = (value: string) => {
    setInput(value);
    setConfirming(false);
  };

  return <Screen title="Abrir caja" subtitle="Moneda fija: MXN">
    <OfflineBanner visible={!isOnline} />
    <TextField
      label="Monto inicial"
      value={input}
      onChangeText={changeAmount}
      keyboardType="decimal-pad"
      error={input.length > 0 && parsed === undefined ? 'Captura un monto válido con máximo dos decimales.' : undefined}
    />
    {confirming && parsed !== undefined ? (
      <View style={styles.confirmation}>
        <Text style={styles.title}>Confirma la apertura</Text>
        <Text style={styles.text}>Monto inicial: ${parsed.toFixed(2)} MXN</Text>
        <Text style={styles.caption}>El saldo esperado será calculado por el servidor.</Text>
        <AppButton
          label="Abrir caja ahora"
          disabled={!isOnline}
          loading={mutation.isPending}
          onPress={() => mutation.mutate({ openingAmount: parsed }, { onSuccess: () => router.back() })}
        />
        <AppButton label="Corregir monto" variant="secondary" disabled={mutation.isPending} onPress={() => setConfirming(false)} />
      </View>
    ) : (
      <AppButton label="Revisar apertura" disabled={!isOnline || parsed === undefined} onPress={() => setConfirming(true)} />
    )}
    {mutation.isError ? <FinancialError error={mutation.error} /> : null}
  </Screen>;
}

export function CloseCashRegisterScreen() {
  const router = useRouter();
  const { state } = useSession();
  const { isOnline } = useNetworkStatus();
  const mayRead = state.status === 'authenticated' && can(state.permissions, 'CAJA_CONSULTAR');
  const mayClose = state.status === 'authenticated' && can(state.permissions, 'CAJA_CERRAR');
  const permitted = mayRead && mayClose;
  const cash = useCurrentCashRegister({ permitted: mayRead, enabled: isOnline });
  const mutation = useCloseCashRegister({ permitted: mayClose });
  const [input, setInput] = useState('');
  const [notes, setNotes] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [closed, setClosed] = useState<ClosedCashRegister>();
  const parsed = parseMoneyInput(input);

  if (!permitted) return <Screen title="Cerrar caja"><AccessDeniedState /></Screen>;
  if (!isOnline && !closed) {
    return <Screen title="Cerrar caja">
      <OfflineBanner visible />
      <Text style={styles.text}>El cierre no se guarda ni se envía sin conexión.</Text>
    </Screen>;
  }
  if (cash.isPending && !closed) {
    return <Screen title="Cerrar caja"><LoadingState message="Consultando caja…" /></Screen>;
  }
  if (cash.isError && !closed) {
    const presentation = financialErrorPresentation(cash.error);
    return <Screen title="Cerrar caja">
      <ErrorState message={presentation.message} onRetry={() => void cash.refetch()} traceId={presentation.traceId} />
    </Screen>;
  }
  if (closed) return <ClosedCashResult value={closed} onDone={() => router.back()} />;
  if (!cash.data) {
    return <Screen title="Cerrar caja">
      <AlertBanner title="No hay caja abierta" message="Abre una caja antes de intentar el cierre." tone="warning" />
    </Screen>;
  }

  const current = cash.data;
  const updateAmount = (value: string) => {
    setInput(value);
    setConfirming(false);
  };

  return <Screen title="Cerrar caja" subtitle={`Caja ${current.id}`}>
    <OfflineBanner visible={!isOnline} />
    <View style={styles.card}>
      <Text style={styles.text}>Esperado por servidor: ${current.expectedCash.toFixed(2)} MXN</Text>
    </View>
    <TextField
      label="Monto contado"
      value={input}
      onChangeText={updateAmount}
      keyboardType="decimal-pad"
      error={input.length > 0 && parsed === undefined ? 'Captura un monto válido con máximo dos decimales.' : undefined}
    />
    <TextField
      label="Notas (opcional)"
      value={notes}
      onChangeText={(value) => { setNotes(value); setConfirming(false); }}
      maxLength={500}
      multiline
      hint={`${notes.length}/500`}
    />
    {confirming && parsed !== undefined ? (
      <View style={styles.confirmation}>
        <Text style={styles.title}>Confirma el cierre</Text>
        <Text style={styles.text}>Esperado: ${current.expectedCash.toFixed(2)} MXN</Text>
        <Text style={styles.text}>Contado: ${parsed.toFixed(2)} MXN</Text>
        <Text style={styles.caption}>La diferencia final será calculada por el servidor.</Text>
        <AppButton
          label="Cerrar caja ahora"
          variant="danger"
          disabled={!isOnline}
          loading={mutation.isPending}
          onPress={() => mutation.mutate(
            {
              cashRegisterId: current.id,
              countedAmount: parsed,
              ...(notes.trim() ? { notes } : {}),
            },
            { onSuccess: setClosed },
          )}
        />
        <AppButton label="Corregir datos" variant="secondary" disabled={mutation.isPending} onPress={() => setConfirming(false)} />
      </View>
    ) : (
      <AppButton label="Revisar cierre" variant="danger" disabled={!isOnline || parsed === undefined} onPress={() => setConfirming(true)} />
    )}
    {mutation.isError ? <FinancialError error={mutation.error} /> : null}
  </Screen>;
}

function ClosedCashResult({ value, onDone }: { value: ClosedCashRegister; onDone(): void }) {
  const label = cashDifferenceLabel(value.difference);
  const tone = value.difference === 0 ? 'success' : value.difference > 0 ? 'warning' : 'danger';
  return <Screen title="Cierre de caja confirmado" subtitle={value.closedAt}>
    <AlertBanner title={label} tone={tone} message={`Diferencia confirmada: ${signedMoney(value.difference)} ${value.currency}`} />
    <View style={styles.card}>
      <Text style={styles.text}>Esperado: ${value.expectedCash.toFixed(2)} {value.currency}</Text>
      <Text style={styles.text}>Contado: ${value.countedCash.toFixed(2)} {value.currency}</Text>
      <Text style={styles.text}>Diferencia: {signedMoney(value.difference)} {value.currency}</Text>
      <Text style={styles.text}>Estado: {value.status}</Text>
      <Text style={styles.text}>Cerrada por: {value.closedByName ?? value.closedBy}</Text>
      {value.notes ? <Text style={styles.text}>Notas: {value.notes}</Text> : null}
    </View>
    <AppButton label="Volver a caja" onPress={onDone} />
  </Screen>;
}

const styles = StyleSheet.create({
  card: {
    gap: spacing[2], padding: spacing[4], borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, backgroundColor: colors.surface,
  },
  confirmation: {
    gap: spacing[3], padding: spacing[4], borderWidth: 2, borderColor: colors.primary,
    borderRadius: radius.md, backgroundColor: colors.infoSoft,
  },
  title: { ...typography.title, color: colors.text },
  text: { ...typography.body, color: colors.text },
  caption: { ...typography.caption, color: colors.textMuted },
});
