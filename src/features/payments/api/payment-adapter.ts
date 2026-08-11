import { ApiError, type HttpResponse } from '@/core/http';
import { isUuid } from '@/core/validation';
import type {
  PageResponsePlanSnapshot,
  PaymentSnapshot,
  ReceiptSnapshot,
  RegisterRequest,
} from '@/generated/api';

import type {
  FailedReceipt,
  Payment,
  PaymentIntent,
  PaymentMethod,
  PaymentQuote,
  PendingReceipt,
  ReadyReceipt,
  Receipt,
  ReceiptDeliveryStatus,
  RegisteredPayment,
} from '../model/payment-models';

const PAYMENT_METHODS = new Set<PaymentMethod>(['CASH', 'TRANSFER', 'MANUAL_CARD']);
const DELIVERY_STATUSES = new Set<ReceiptDeliveryStatus>(['PENDING', 'RETRYING', 'SENT', 'FAILED']);
const CONCEPTS = new Set<Payment['concept']>(['MEMBERSHIP_RENEWAL', 'SINGLE_CLASS', 'CLASS_PACKAGE']);

function malformed(field: string): never {
  throw new ApiError(
    502,
    'MALFORMED_FINANCIAL_RESPONSE',
    `La respuesta financiera contiene un campo inválido (${field}).`,
    undefined,
    undefined,
  );
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) malformed('root');
  return value as Record<string, unknown>;
}

function uuid(value: unknown, field: string): string {
  return isUuid(value) ? value : malformed(field);
}

function text(value: unknown, field: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : malformed(field);
}

function optionalText(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  return text(value, field);
}

function money(value: unknown, field: string): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : malformed(field);
}

function paymentMethod(value: unknown, field: string): PaymentMethod {
  return typeof value === 'string' && PAYMENT_METHODS.has(value as PaymentMethod)
    ? value as PaymentMethod
    : malformed(field);
}

function date(value: unknown, field: string): string {
  const result = text(value, field);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result)) malformed(field);
  return result;
}

export function paymentRequestFromIntent(intent: PaymentIntent): RegisterRequest {
  return {
    membershipId: intent.membershipId,
    method: intent.method,
    effectiveDate: intent.effectiveDate,
  };
}

export function paymentFromResponse(response: unknown): Payment {
  const value = record(response) as PaymentSnapshot;
  if (value.currency !== 'MXN') malformed('currency');
  if (value.status !== 'REGISTERED') malformed('status');
  if (!CONCEPTS.has(value.concept)) malformed('concept');
  return {
    id: uuid(value.id, 'id'),
    folio: text(value.folio, 'folio'),
    branchId: uuid(value.branchId, 'branchId'),
    studentId: uuid(value.studentId, 'studentId'),
    membershipId: uuid(value.membershipId, 'membershipId'),
    ...(value.cashRegisterId ? { cashRegisterId: uuid(value.cashRegisterId, 'cashRegisterId') } : {}),
    amount: money(value.amount, 'amount'),
    currency: value.currency,
    method: paymentMethod(value.method, 'method'),
    concept: value.concept,
    status: value.status,
    effectiveDate: date(value.effectiveDate, 'effectiveDate'),
    createdAt: text(value.createdAt, 'createdAt'),
    branchName: optionalText(value.branchName, 'branchName'),
    studentName: optionalText(value.studentName, 'studentName'),
  };
}

function replayContractError(status: number, replayHeader: string | null): never {
  throw new ApiError(
    502,
    'PAYMENT_REPLAY_CONTRACT_MISMATCH',
    `Combinación idempotente no contractual (${status}/${replayHeader ?? 'missing'}).`,
    undefined,
    undefined,
  );
}

export function registeredPaymentFromResponse(
  response: HttpResponse<unknown>,
): RegisteredPayment {
  const replayHeader = response.headers.get('Idempotency-Replayed')?.trim().toLowerCase() ?? null;
  let outcome: RegisteredPayment['outcome'];
  if (response.status === 201 && replayHeader === 'false') outcome = 'created';
  else if (response.status === 200 && replayHeader === 'true') outcome = 'replayed';
  else replayContractError(response.status, replayHeader);
  return { payment: paymentFromResponse(response.data), outcome };
}

type ReceiptRecord = Record<string, unknown>;

function receiptBase(value: ReceiptRecord) {
  const deliveryStatus = text(value.deliveryStatus, 'deliveryStatus');
  if (!DELIVERY_STATUSES.has(deliveryStatus as ReceiptDeliveryStatus)) malformed('deliveryStatus');
  if (value.currency !== 'MXN') malformed('currency');
  return {
    id: uuid(value.id, 'id'),
    paymentId: uuid(value.paymentId, 'paymentId'),
    receiptNumber: text(value.receiptNumber, 'receiptNumber'),
    paymentFolio: text(value.paymentFolio, 'paymentFolio'),
    ...(value.studentId ? { studentId: uuid(value.studentId, 'studentId') } : {}),
    amount: money(value.amount, 'amount'),
    currency: value.currency,
    paymentMethod: paymentMethod(value.paymentMethod, 'paymentMethod'),
    deliveryStatus: deliveryStatus as ReceiptDeliveryStatus,
    studentName: optionalText(value.studentName, 'studentName'),
  } as const;
}

export function receiptFromResponse(response: unknown): Receipt {
  const value = record(response) as ReceiptSnapshot & ReceiptRecord;
  const base = receiptBase(value);
  if (value.status === 'PENDING') {
    return { ...base, status: 'PENDING' } satisfies PendingReceipt;
  }
  if (value.status === 'READY') {
    return {
      ...base,
      status: 'READY',
      generatedAt: text(value.generatedAt, 'generatedAt'),
      fileId: uuid(value.fileId, 'fileId'),
    } satisfies ReadyReceipt;
  }
  if (value.status === 'FAILED') {
    return {
      ...base,
      status: 'FAILED',
      failureCode: text(value.failureCode, 'failureCode'),
    } satisfies FailedReceipt;
  }
  return malformed('status');
}

export function paymentQuotesFromResponse(response: unknown): readonly PaymentQuote[] {
  const value = record(response) as PageResponsePlanSnapshot;
  if (value.content !== undefined && !Array.isArray(value.content)) malformed('content');
  return (value.content ?? []).map((plan, index) => {
    if (plan.currency !== 'MXN') malformed(`content.${index}.currency`);
    if (plan.status !== 'ACTIVO' && plan.status !== 'INACTIVO') malformed(`content.${index}.status`);
    return {
      planId: uuid(plan.id, `content.${index}.id`),
      planName: text(plan.name, `content.${index}.name`),
      amount: money(plan.price, `content.${index}.price`),
      currency: plan.currency,
      status: plan.status,
    };
  });
}
