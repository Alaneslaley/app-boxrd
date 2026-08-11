import { ApiError } from '@/core/http';

import { financialErrorPresentation } from './FinancialErrorPresentation';

describe('financialErrorPresentation', () => {
  it.each([
    ['CASH_REGISTER_ALREADY_OPEN', 'La caja ya está abierta'],
    ['CASH_REGISTER_ALREADY_CLOSED', 'La caja ya fue cerrada'],
    ['CASH_REGISTER_REQUIRED', 'Se requiere caja abierta'],
    ['CURRENCY_MISMATCH', 'Moneda no admitida'],
    ['IDEMPOTENCY_KEY_CONFLICT', 'La intención cambió'],
    ['INVALID_EFFECTIVE_DATE', 'Fecha efectiva no válida'],
    ['MEMBERSHIP_NOT_RENEWABLE', 'Membresía no renovable'],
    ['PLAN_INACTIVE', 'Plan inactivo'],
  ])('mapea el code contractual %s', (code, title) => {
    expect(financialErrorPresentation(
      new ApiError(422, code, 'backend message', undefined, 'trace-safe'),
    )).toEqual(expect.objectContaining({ title, traceId: 'trace-safe' }));
  });

  it('preserva un code desconocido sin perder el traceId', () => {
    expect(financialErrorPresentation(
      new ApiError(409, 'UNKNOWN_CONFLICT', 'Conflicto confirmado.', undefined, 'trace-unknown'),
    )).toEqual({
      title: 'No pudimos completar la operación',
      message: 'Conflicto confirmado.',
      traceId: 'trace-unknown',
    });
  });
});
