export type PaymentMethod = 'CASH' | 'TRANSFER' | 'MANUAL_CARD';

export type PaymentQuote = Readonly<{
  planId: string;
  planName: string;
  amount: number;
  currency: 'MXN';
  status: 'ACTIVO' | 'INACTIVO';
}>;

export type PaymentDraft = Readonly<{
  membershipId: string;
  planId: string;
  method: PaymentMethod;
  effectiveDate: string;
  quote: PaymentQuote;
}>;

export type PaymentIntent = Readonly<{
  idempotencyKey: string;
  fingerprint: string;
  membershipId: string;
  method: PaymentMethod;
  effectiveDate: string;
  createdAt: string;
  expiresAt: string;
}>;

export type Payment = Readonly<{
  id: string;
  folio: string;
  branchId: string;
  studentId: string;
  membershipId: string;
  cashRegisterId?: string;
  amount: number;
  currency: 'MXN';
  method: PaymentMethod;
  concept: 'MEMBERSHIP_RENEWAL' | 'SINGLE_CLASS' | 'CLASS_PACKAGE';
  status: 'REGISTERED';
  effectiveDate: string;
  createdAt: string;
  branchName?: string;
  studentName?: string;
}>;

export type ReceiptDeliveryStatus = 'PENDING' | 'RETRYING' | 'SENT' | 'FAILED';

type ReceiptBase = Readonly<{
  id: string;
  paymentId: string;
  receiptNumber: string;
  paymentFolio: string;
  studentId?: string;
  amount: number;
  currency: 'MXN';
  paymentMethod: PaymentMethod;
  deliveryStatus: ReceiptDeliveryStatus;
  studentName?: string;
}>;

export type PendingReceipt = ReceiptBase & Readonly<{ status: 'PENDING' }>;
export type ReadyReceipt = ReceiptBase & Readonly<{
  status: 'READY';
  generatedAt: string;
  fileId: string;
}>;
export type FailedReceipt = ReceiptBase & Readonly<{
  status: 'FAILED';
  failureCode: string;
}>;

export type Receipt = PendingReceipt | ReadyReceipt | FailedReceipt;

export type RegisteredPayment = Readonly<{
  payment: Payment;
  outcome: 'created' | 'replayed';
}>;

export type PendingPayment = Readonly<{
  version: 1;
  state: 'uncertain';
  idempotencyKey: string;
  fingerprint: string;
  membershipId: string;
  method: PaymentMethod;
  effectiveDate: string;
  createdAt: string;
  expiresAt: string;
}>;
