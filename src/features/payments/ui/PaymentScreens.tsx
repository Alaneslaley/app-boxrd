import { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { financialErrorPresentation } from '@/core/financial';
import { ApiError } from '@/core/http';
import { can } from '@/core/permissions';
import { useNetworkStatus } from '@/core/query';
import { useSession } from '@/core/session';
import { isUuid } from '@/core/validation';
import { useCurrentCashRegister } from '@/features/cash';
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

import { createPaymentIntent } from '../application/payment-intent';
import {
  paymentIntentFromPending,
  readPendingPayment,
} from '../application/payment-retry-store';
import {
  currentBusinessDate,
  isUncertainPaymentError,
  usePaymentDetail,
  usePaymentQuote,
  usePaymentReceipt,
  useRegisterPayment,
} from '../application/payments';
import type { PaymentMethod, PendingPayment } from '../model/payment-models';

const methods: readonly Readonly<{ value: PaymentMethod; label: string }>[] = [
  { value: 'CASH', label: 'Efectivo' },
  { value: 'TRANSFER', label: 'Transferencia' },
  { value: 'MANUAL_CARD', label: 'Tarjeta manual' },
];

function paymentTone(status: 'PENDING' | 'READY' | 'FAILED'): 'info' | 'success' | 'danger' {
  return status === 'READY' ? 'success' : status === 'FAILED' ? 'danger' : 'info';
}

function FinancialError({ error }: { error: unknown }) {
  const presentation = financialErrorPresentation(error);
  const message = presentation.traceId
    ? `${presentation.message} Código de soporte: ${presentation.traceId}.`
    : presentation.message;
  return <AlertBanner title={presentation.title} message={message} tone="danger" />;
}

export type RegisterPaymentScreenProps = Readonly<{
  membershipId: string;
  planId: string;
  studentId?: string;
  studentName?: string;
}>;

export function RegisterPaymentScreen({
  membershipId,
  planId,
  studentId,
  studentName,
}: RegisterPaymentScreenProps) {
  const router = useRouter();
  const { state } = useSession();
  const { isOnline } = useNetworkStatus();
  const permitted = state.status === 'authenticated' && can(state.permissions, 'PAGOS_REGISTRAR');
  const mayReadCash = state.status === 'authenticated' && can(state.permissions, 'CAJA_CONSULTAR');
  const validRoute = isUuid(membershipId) && isUuid(planId)
    && (studentId === undefined || isUuid(studentId));
  const mutation = useRegisterPayment({ permitted });
  const quote = usePaymentQuote(planId, { enabled: validRoute && isOnline, permitted });
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [pending, setPending] = useState<PendingPayment>();
  const [pendingLoaded, setPendingLoaded] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [cashError, setCashError] = useState<unknown>();
  const effectiveDate = currentBusinessDate();
  const cash = useCurrentCashRegister({
    permitted: mayReadCash,
    enabled: permitted && validRoute && method === 'CASH' && isOnline,
  });

  const reloadPending = () => readPendingPayment()
    .then(setPending)
    .finally(() => setPendingLoaded(true));
  useEffect(() => { void reloadPending(); }, []);

  if (!validRoute) {
    return <Screen title="Registrar pago">
      <EmptyState title="Membresía no válida" message="La navegación no contiene identificadores financieros válidos." />
    </Screen>;
  }
  if (!permitted) return <Screen title="Registrar pago"><AccessDeniedState /></Screen>;
  if (!pendingLoaded) {
    return <Screen title="Registrar pago"><LoadingState message="Verificando pagos pendientes…" /></Screen>;
  }

  const navigateToPayment = (paymentId: string, outcome: 'created' | 'replayed') => {
    setPending(undefined);
    router.replace({
      pathname: './[paymentId]',
      params: { paymentId, replayed: outcome === 'replayed' ? 'true' : 'false' },
    });
  };

  const retryPending = () => {
    if (!pending) return;
    mutation.mutate(paymentIntentFromPending(pending), {
      onSuccess: ({ payment, outcome }) => navigateToPayment(payment.id, outcome),
      onError: () => { void reloadPending(); },
    });
  };

  const confirmPayment = async () => {
    setCashError(undefined);
    if (!quote.data) return;
    if (method === 'CASH') {
      if (!mayReadCash) {
        setCashError(new ApiError(403, 'FORBIDDEN', 'No tienes permiso para confirmar la caja.', undefined, undefined));
        return;
      }
      const current = await cash.refetch();
      if (current.error) {
        setCashError(current.error);
        return;
      }
      if (!current.data) {
        setCashError(new ApiError(404, 'CASH_REGISTER_NOT_OPEN', 'No existe una caja abierta.', undefined, undefined));
        return;
      }
    }

    const intent = await createPaymentIntent({ membershipId, method, effectiveDate });
    mutation.mutate(intent, {
      onSuccess: ({ payment, outcome }) => navigateToPayment(payment.id, outcome),
      onError: () => { void reloadPending(); },
    });
  };

  if (pending) {
    return <Screen title="Registrar pago" subtitle="Existe una intención global pendiente">
      <OfflineBanner visible={!isOnline} />
      <AlertBanner
        title="Pago pendiente de confirmación"
        tone="warning"
        message={`No registres otro cobro. Reintenta exactamente la operación ${pending.method} del ${pending.effectiveDate}.`}
        action={<AppButton
          label="Reintentar la misma operación"
          disabled={!isOnline}
          loading={mutation.isPending}
          onPress={retryPending}
        />}
      />
      {mutation.isError ? <FinancialError error={mutation.error} /> : null}
    </Screen>;
  }

  if (!isOnline) {
    return <Screen title="Registrar pago">
      <OfflineBanner visible />
      <Text style={styles.text}>No se consultó el plan ni se enviará un pago hasta recuperar conexión.</Text>
    </Screen>;
  }

  if (quote.isPending) {
    return <Screen title="Registrar pago"><LoadingState message="Consultando precio del plan…" /></Screen>;
  }
  if (quote.isError) {
    return <Screen title="Registrar pago">
      <ErrorState
        message={financialErrorPresentation(quote.error).message}
        traceId={quote.error instanceof ApiError ? quote.error.traceId : undefined}
        onRetry={() => void quote.refetch()}
      />
    </Screen>;
  }

  const value = quote.data;
  const cashUnavailable = method === 'CASH'
    && (!mayReadCash || cash.isPending || cash.isError || !cash.data);
  const changeMethod = (next: PaymentMethod) => {
    setMethod(next);
    setConfirming(false);
    setCashError(undefined);
  };

  return <Screen title="Registrar pago" subtitle={studentName ?? value.planName}>
    <OfflineBanner visible={!isOnline} />
    <View style={styles.card}>
      <Text style={styles.section}>{value.planName}</Text>
      <Text style={styles.amount}>Monto de referencia: ${value.amount.toFixed(2)} {value.currency}</Text>
      <Text style={styles.hint}>El servidor confirmará el importe final.</Text>
      <Text style={styles.text}>Fecha efectiva: {effectiveDate}</Text>
    </View>
    {value.status === 'INACTIVO' ? (
      <AlertBanner title="Plan inactivo" message="No se puede registrar el pago con este plan." tone="danger" />
    ) : null}
    <Text style={styles.label}>Método de pago</Text>
    <View style={styles.methods}>
      {methods.map((item) => <Pressable
        key={item.value}
        accessibilityLabel={item.label}
        accessibilityRole="radio"
        accessibilityState={{ selected: method === item.value }}
        onPress={() => changeMethod(item.value)}
        style={[styles.method, method === item.value && styles.selectedMethod]}
      ><Text style={styles.methodText}>{item.label}</Text></Pressable>)}
    </View>
    {method === 'CASH' && !mayReadCash ? (
      <AlertBanner title="No se puede verificar la caja" message="Tu sesión no tiene permiso para consultar caja." tone="danger" />
    ) : null}
    {method === 'CASH' && mayReadCash && !cash.isPending && !cash.isError && !cash.data ? (
      <AlertBanner title="No hay caja abierta" message="Abre una caja antes de registrar efectivo." tone="warning" />
    ) : null}
    {method === 'CASH' && cash.isError ? <FinancialError error={cash.error} /> : null}
    {confirming ? (
      <View style={styles.confirmation}>
        <Text style={styles.section}>Confirma el pago</Text>
        <Text style={styles.text}>Membresía: {membershipId}</Text>
        <Text style={styles.text}>Método: {methods.find((item) => item.value === method)?.label}</Text>
        <Text style={styles.text}>Fecha efectiva: {effectiveDate}</Text>
        <Text style={styles.text}>Referencia: ${value.amount.toFixed(2)} MXN</Text>
        <Text style={styles.hint}>La llave idempotente se creará al confirmar ahora.</Text>
        <AppButton
          label="Registrar pago ahora"
          disabled={!isOnline || cashUnavailable || value.status !== 'ACTIVO'}
          loading={mutation.isPending}
          onPress={() => { void confirmPayment(); }}
        />
        <AppButton label="Corregir método" variant="secondary" disabled={mutation.isPending} onPress={() => setConfirming(false)} />
      </View>
    ) : (
      <AppButton
        label="Revisar pago"
        disabled={!isOnline || cashUnavailable || value.status !== 'ACTIVO'}
        onPress={() => setConfirming(true)}
      />
    )}
    {cashError ? <FinancialError error={cashError} /> : null}
    {isUncertainPaymentError(mutation.error) ? (
      <AlertBanner
        title="No pudimos confirmar el resultado"
        tone="warning"
        message="No registres otro cobro. Reintenta esta misma operación con la clave protegida."
      />
    ) : null}
    {mutation.isError && !isUncertainPaymentError(mutation.error) ? <FinancialError error={mutation.error} /> : null}
  </Screen>;
}

export function PaymentDetailScreen({ paymentId, replayed = false }: { paymentId: string; replayed?: boolean }) {
  const { state, protectedMediaSource } = useSession();
  const valid = isUuid(paymentId);
  const permitted = state.status === 'authenticated' && can(state.permissions, 'PAGOS_CONSULTAR');
  const options = { enabled: valid, permitted };
  const payment = usePaymentDetail(paymentId, options);
  const receipt = usePaymentReceipt(paymentId, options);
  if (!valid) return <Screen title="Pago"><EmptyState title="Pago no encontrado" message="El identificador del pago no es válido." /></Screen>;
  if (!permitted) return <Screen title="Pago"><AccessDeniedState /></Screen>;
  if (payment.isPending) return <Screen title="Pago"><LoadingState message="Cargando pago…" /></Screen>;
  if (payment.isError) {
    const presentation = financialErrorPresentation(payment.error);
    return <Screen title="Pago"><ErrorState message={presentation.message} onRetry={() => void payment.refetch()} traceId={presentation.traceId} /></Screen>;
  }
  const value = payment.data;
  return <Screen title="Pago confirmado" subtitle={`Folio ${value.folio}`}>
    {replayed ? (
      <AlertBanner
        title="Este pago ya estaba registrado"
        message="Mostramos el resultado confirmado por el servidor. No se creó otro pago."
        tone="info"
      />
    ) : null}
    <View style={styles.card}>
      <Text style={styles.amount}>${value.amount.toFixed(2)} {value.currency}</Text>
      {value.studentName ? <Text style={styles.text}>Alumno: {value.studentName}</Text> : null}
      <Text style={styles.text}>Método: {methods.find((item) => item.value === value.method)?.label ?? value.method}</Text>
      <Text style={styles.text}>Fecha efectiva: {value.effectiveDate}</Text>
      <Text style={styles.text}>Creado: {value.createdAt}</Text>
      <Text style={styles.text}>Concepto: {value.concept}</Text>
    </View>
    {receipt.isPending ? <LoadingState message="Consultando recibo…" /> : null}
    {receipt.isError ? (
      <ErrorState
        message={financialErrorPresentation(receipt.error).message}
        onRetry={() => void receipt.refetch()}
        traceId={receipt.error instanceof ApiError ? receipt.error.traceId : undefined}
      />
    ) : null}
    {receipt.data ? <ReceiptView
      receipt={receipt.data}
      source={receipt.data.status === 'READY'
        ? protectedMediaSource?.(`/media/${receipt.data.fileId}`)
        : undefined}
    /> : null}
    <AppButton
      label="Actualizar recibo"
      variant="secondary"
      disabled={receipt.isPending}
      loading={receipt.isRefetching}
      onPress={() => void receipt.refetch()}
    />
  </Screen>;
}

function ReceiptView({
  receipt,
  source,
}: {
  receipt: NonNullable<ReturnType<typeof usePaymentReceipt>['data']>;
  source: ReturnType<NonNullable<ReturnType<typeof useSession>['protectedMediaSource']>> | undefined;
}) {
  const [failedSource, setFailedSource] = useState<string>();
  const mediaUnavailable = Boolean(source && failedSource === source.uri);
  return <>
    <Text style={styles.section}>Recibo {receipt.receiptNumber}</Text>
    <StatusBadge label={receipt.status} tone={paymentTone(receipt.status)} />
    <Text style={styles.text}>Entrega: {receipt.deliveryStatus}</Text>
    {receipt.status === 'PENDING' ? (
      <AlertBanner title="Recibo en preparación" message="Usa Actualizar recibo cuando quieras consultar de nuevo." />
    ) : null}
    {receipt.status === 'FAILED' ? (
      <AlertBanner title="No se pudo generar el recibo" tone="danger" message={`Código: ${receipt.failureCode}`} />
    ) : null}
    {receipt.status === 'READY' ? (
      <View style={styles.card}>
        <Text style={styles.text}>Generado: {receipt.generatedAt}</Text>
        <Text style={styles.hint}>Vista protegida, sin token en URL y sin caché persistente.</Text>
        {source && !mediaUnavailable ? (
          <Image
            accessibilityLabel="Vista protegida del recibo"
            cachePolicy="none"
            contentFit="contain"
            onError={() => setFailedSource(source.uri)}
            source={source}
            style={styles.preview}
          />
        ) : <Text style={styles.hint}>El recibo protegido no está disponible para esta sesión.</Text>}
      </View>
    ) : null}
  </>;
}

const styles = StyleSheet.create({
  amount: { ...typography.heading, color: colors.text },
  card: { gap: spacing[2], borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing[4], backgroundColor: colors.surface },
  confirmation: { gap: spacing[3], borderWidth: 2, borderColor: colors.primary, borderRadius: radius.md, padding: spacing[4], backgroundColor: colors.infoSoft },
  hint: { ...typography.caption, color: colors.textMuted },
  label: { ...typography.label, color: colors.text },
  method: { alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, minHeight: 48, justifyContent: 'center', padding: spacing[3] },
  methodText: { ...typography.label, color: colors.text },
  methods: { gap: spacing[2] },
  preview: { minHeight: 180, width: '100%' },
  section: { ...typography.title, color: colors.text },
  selectedMethod: { borderColor: colors.primary, borderWidth: 2, backgroundColor: colors.infoSoft },
  text: { ...typography.body, color: colors.text },
});
