import { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/core/http';
import type { IdempotencyKey } from '@/core/idempotency';
import { can } from '@/core/permissions';
import { useNetworkStatus } from '@/core/query';
import { useSession } from '@/core/session';
import { AccessDeniedState, AlertBanner, AppButton, ErrorState, LoadingState, OfflineBanner, Screen, StatusBadge } from '@/shared';
import { colors, radius, spacing, typography } from '@/shared/theme';

import { readPendingPayment, type PendingPayment } from '../application/payment-retry-store';
import { createPaymentRegistration, usePaymentDetail, usePaymentReceipt, useRegisterPayment } from '../application/payments';

type PaymentMethod = 'CASH' | 'TRANSFER' | 'MANUAL_CARD';
type PaymentRequest = Readonly<{ membershipId: string; method: PaymentMethod; effectiveDate: string }>;

const methods: readonly Readonly<{ value: PaymentMethod; label: string }>[] = [
  { value: 'CASH', label: 'Efectivo' },
  { value: 'TRANSFER', label: 'Transferencia' },
  { value: 'MANUAL_CARD', label: 'Tarjeta manual' },
];

function businessDate(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function isUncertain(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 0 && error.code !== 'REQUEST_CANCELLED';
}

function paymentTone(status: 'PENDING' | 'READY' | 'FAILED'): 'info' | 'success' | 'danger' {
  return status === 'READY' ? 'success' : status === 'FAILED' ? 'danger' : 'info';
}

export function RegisterPaymentScreen({ membershipId, studentName }: { membershipId: string; studentName?: string }) {
  const router = useRouter();
  const { state } = useSession();
  const { isOnline } = useNetworkStatus();
  const mutation = useRegisterPayment();
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [pending, setPending] = useState<PendingPayment>();
  const permitted = state.status === 'authenticated' && can(state.permissions, 'PAGOS_REGISTRAR');

  useEffect(() => { void readPendingPayment().then(setPending); }, []);
  if (!permitted) return <Screen title="Registrar pago"><AccessDeniedState /></Screen>;

  const submit = (request: PaymentRequest, idempotencyKey?: IdempotencyKey) => {
    const registration = idempotencyKey ? { request, idempotencyKey } : createPaymentRegistration(request);
    mutation.mutate(registration, {
      onSuccess: ({ payment }) => {
        router.replace(`./${payment.id}`);
      },
    });
  };
  const request: PaymentRequest = { membershipId, method, effectiveDate: businessDate() };
  const retry = pending?.request.membershipId === membershipId ? pending : undefined;

  return <Screen title="Registrar pago" subtitle={studentName ?? 'El importe se obtiene de la membresía.'}>
    <OfflineBanner visible={!isOnline} />
    {retry ? <AlertBanner title="Pago pendiente de confirmación" tone="warning" message="No conocemos el resultado anterior. Reintenta con la misma clave para evitar duplicados." action={<AppButton label="Reintentar pago pendiente" disabled={!isOnline} loading={mutation.isPending} onPress={() => submit(retry.request, retry.idempotencyKey as IdempotencyKey)} />} /> : null}
    <Text style={styles.label}>Método de pago</Text>
    <View style={styles.methods}>{methods.map((item) => <Pressable key={item.value} accessibilityLabel={item.label} accessibilityRole="radio" accessibilityState={{ selected: method === item.value }} onPress={() => setMethod(item.value)} style={[styles.method, method === item.value && styles.selectedMethod]}><Text style={styles.methodText}>{item.label}</Text></Pressable>)}</View>
    <Text style={styles.hint}>Fecha efectiva: {request.effectiveDate}. El monto y el concepto los determina el servidor para proteger la operación financiera.</Text>
    <AppButton label="Confirmar pago" disabled={!isOnline || mutation.isPending} loading={mutation.isPending} onPress={() => submit(request)} />
    {isUncertain(mutation.error) ? <AlertBanner title="Resultado pendiente" tone="warning" message="Conservamos la clave de idempotencia protegida. Cuando recuperes conexión, usa el reintento para confirmar el resultado sin crear otro pago." /> : null}
    {mutation.isError && !isUncertain(mutation.error) ? <ErrorState traceId={mutation.error instanceof ApiError ? mutation.error.traceId : undefined} /> : null}
  </Screen>;
}

export function PaymentDetailScreen({ paymentId }: { paymentId: string }) {
  const { state, protectedMediaSource } = useSession();
  const permitted = state.status === 'authenticated' && can(state.permissions, 'PAGOS_CONSULTAR');
  const payment = usePaymentDetail(paymentId, permitted);
  const receipt = usePaymentReceipt(paymentId, permitted);
  if (!permitted) return <Screen title="Pago"><AccessDeniedState /></Screen>;
  if (payment.isPending || receipt.isPending) return <Screen title="Pago"><LoadingState message="Cargando pago y recibo…" /></Screen>;
  if (payment.isError) return <Screen title="Pago"><ErrorState onRetry={() => void payment.refetch()} traceId={payment.error instanceof ApiError ? payment.error.traceId : undefined} /></Screen>;
  if (receipt.isError) return <Screen title="Pago"><ErrorState message="No fue posible consultar el recibo." onRetry={() => void receipt.refetch()} traceId={receipt.error instanceof ApiError ? receipt.error.traceId : undefined} /></Screen>;
  const value = payment.data;
  const document = receipt.data;
  const source = document.status === 'READY' ? protectedMediaSource?.(`/media/${document.fileId}`) : undefined;
  return <Screen title="Pago confirmado" subtitle={`Folio ${value.folio}`}>
    <View style={styles.card}><Text style={styles.amount}>${value.amount.toFixed(2)} {value.currency}</Text><Text style={styles.text}>Método: {methods.find((item) => item.value === value.method)?.label ?? value.method}</Text><Text style={styles.text}>Fecha efectiva: {value.effectiveDate}</Text><Text style={styles.text}>Concepto: {value.concept}</Text></View>
    <Text style={styles.section}>Recibo {document.receiptNumber}</Text>
    <StatusBadge label={document.status} tone={paymentTone(document.status)} />
    <Text style={styles.text}>Entrega: {document.deliveryStatus}</Text>
    {document.status === 'PENDING' ? <AlertBanner title="Recibo en preparación" message="Actualiza esta pantalla para consultar su disponibilidad." /> : null}
    {document.status === 'FAILED' ? <AlertBanner title="No se pudo generar el recibo" tone="danger" message={`Código: ${document.failureCode}`} /> : null}
    {document.status === 'READY' ? <View style={styles.card}><Text style={styles.text}>Generado: {document.generatedAt}</Text><Text style={styles.hint}>Vista protegida: el archivo se solicita con la sesión activa.</Text>{source ? <Image accessibilityLabel="Vista protegida del recibo" cachePolicy="none" contentFit="contain" source={source} style={styles.preview} /> : <Text style={styles.hint}>La sesión ya no puede abrir el archivo protegido.</Text>}</View> : null}
    <AppButton label="Actualizar recibo" variant="secondary" loading={receipt.isRefetching} onPress={() => void receipt.refetch()} />
  </Screen>;
}

const styles = StyleSheet.create({
  amount: { ...typography.heading, color: colors.text },
  card: { gap: spacing[2], borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing[4], backgroundColor: colors.surface },
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
