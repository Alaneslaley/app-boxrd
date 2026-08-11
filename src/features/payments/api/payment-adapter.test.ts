import { ApiError, type HttpResponse } from '@/core/http';

import {
  paymentFromResponse,
  paymentQuotesFromResponse,
  paymentRequestFromIntent,
  receiptFromResponse,
  registeredPaymentFromResponse,
} from './payment-adapter';

const ids = {
  payment: '11111111-1111-4111-8111-111111111111',
  branch: '22222222-2222-4222-8222-222222222222',
  student: '33333333-3333-4333-8333-333333333333',
  membership: '44444444-4444-4444-8444-444444444444',
  receipt: '55555555-5555-4555-8555-555555555555',
  file: '66666666-6666-4666-8666-666666666666',
  plan: '77777777-7777-4777-8777-777777777777',
};

const payment = {
  id: ids.payment,
  folio: 'PAY-2026-0001',
  branchId: ids.branch,
  studentId: ids.student,
  membershipId: ids.membership,
  amount: 850,
  currency: 'MXN',
  method: 'CASH',
  concept: 'MEMBERSHIP_RENEWAL',
  status: 'REGISTERED',
  effectiveDate: '2026-08-10',
  createdAt: '2026-08-10T12:00:00Z',
  studentName: 'Persona de prueba',
} as const;

function response(status: number, replay: string | undefined): HttpResponse<unknown> {
  const headers = new Headers();
  if (replay !== undefined) headers.set('Idempotency-Replayed', replay);
  return { status, headers, data: payment };
}

const receiptBase = {
  id: ids.receipt,
  paymentId: ids.payment,
  receiptNumber: 'REC-0001',
  paymentFolio: payment.folio,
  studentId: ids.student,
  amount: 850,
  currency: 'MXN',
  paymentMethod: 'CASH',
  deliveryStatus: 'PENDING',
} as const;

describe('payment adapter', () => {
  it('mapea pago autoritativo y conserva createdAt/studentName', () => {
    expect(paymentFromResponse(payment)).toMatchObject({
      id: ids.payment,
      amount: 850,
      currency: 'MXN',
      createdAt: payment.createdAt,
      studentName: payment.studentName,
    });
  });

  it.each([
    ['amount', Number.NaN],
    ['currency', 'USD'],
    ['id', 'invalid'],
    ['createdAt', ''],
  ])('rechaza respuesta malformed en %s', (field, value) => {
    expect(() => paymentFromResponse({ ...payment, [field]: value })).toThrow(ApiError);
  });

  it('crea request exacto sin amount ni campos extra', () => {
    const request = paymentRequestFromIntent({
      idempotencyKey: '2ec46652-a5d1-4b4e-a366-3d85f33778c0',
      fingerprint: 'a'.repeat(64),
      membershipId: ids.membership,
      method: 'TRANSFER',
      effectiveDate: '2026-08-10',
      createdAt: '2026-08-10T12:00:00.000Z',
      expiresAt: '2026-08-11T12:00:00.000Z',
    });
    expect(request).toEqual({
      membershipId: ids.membership,
      method: 'TRANSFER',
      effectiveDate: '2026-08-10',
    });
    expect(request).not.toHaveProperty('amount');
    expect(request).not.toHaveProperty('cashRegisterId');
  });

  it('valida 201 + false como created y 200 + true como replayed', () => {
    expect(registeredPaymentFromResponse(response(201, 'false')).outcome).toBe('created');
    expect(registeredPaymentFromResponse(response(200, 'true')).outcome).toBe('replayed');
  });

  it.each([
    [201, 'true'],
    [200, 'false'],
    [201, undefined],
    [200, undefined],
  ])('rechaza combinación status/header anómala %s/%s', (status, replay) => {
    expect(() => registeredPaymentFromResponse(response(status, replay)))
      .toThrow(expect.objectContaining({ code: 'PAYMENT_REPLAY_CONTRACT_MISMATCH' }));
  });

  it('mapea Receipt PENDING sin fileId', () => {
    const value = receiptFromResponse({ ...receiptBase, status: 'PENDING' });
    expect(value).toMatchObject({ status: 'PENDING' });
    expect(value).not.toHaveProperty('fileId');
  });

  it('mapea Receipt READY con fileId/generatedAt obligatorios', () => {
    expect(receiptFromResponse({
      ...receiptBase,
      status: 'READY',
      fileId: ids.file,
      generatedAt: '2026-08-10T12:05:00Z',
    })).toMatchObject({ status: 'READY', fileId: ids.file });
  });

  it('mapea Receipt FAILED con failureCode y sin fileId', () => {
    const value = receiptFromResponse({ ...receiptBase, status: 'FAILED', failureCode: 'PDF_FAILED' });
    expect(value).toMatchObject({ status: 'FAILED', failureCode: 'PDF_FAILED' });
    expect(value).not.toHaveProperty('fileId');
  });

  it.each([
    [{ ...receiptBase, status: 'READY', generatedAt: '2026-08-10T12:05:00Z' }, 'READY sin fileId'],
    [{ ...receiptBase, status: 'FAILED' }, 'FAILED sin failureCode'],
    [{ ...receiptBase, status: 'UNKNOWN' }, 'status desconocido'],
  ])('rechaza receipt malformed: %s', (value, _label) => {
    expect(() => receiptFromResponse(value)).toThrow(ApiError);
  });

  it('mapea quote informativa autoritativa del plan', () => {
    expect(paymentQuotesFromResponse({ content: [{
      id: ids.plan,
      branchId: ids.branch,
      name: 'Mensual',
      type: 'MONTHLY',
      price: 850,
      currency: 'MXN',
      validityDays: 30,
      status: 'ACTIVO',
    }] })).toEqual([{ planId: ids.plan, planName: 'Mensual', amount: 850, currency: 'MXN', status: 'ACTIVO' }]);
  });
});
