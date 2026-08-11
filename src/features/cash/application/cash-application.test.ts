import type { QueryClient } from '@tanstack/react-query';

import { ApiError } from '@/core/http';

import {
  closeCashRegister,
  fetchCurrentCashRegister,
  invalidateCashState,
  openCashRegister,
} from './cash';

const ids = {
  cash: '11111111-1111-4111-8111-111111111111',
  branch: '22222222-2222-4222-8222-222222222222',
  openedBy: '33333333-3333-4333-8333-333333333333',
  closedBy: '44444444-4444-4444-8444-444444444444',
};
const openCash = {
  id: ids.cash,
  branchId: ids.branch,
  openedBy: ids.openedBy,
  openedAt: '2026-08-10T12:00:00Z',
  initialCash: 500,
  expectedCash: 850,
  currency: 'MXN',
  status: 'OPEN',
} as const;

describe('cash application', () => {
  it('mapea current y conserva request GET exacto', async () => {
    const authorizedRequest = jest.fn(async (_request: unknown) => ({
      status: 200, headers: new Headers(), data: openCash,
    }));

    await expect(fetchCurrentCashRegister(authorizedRequest as never)).resolves.toMatchObject({
      id: ids.cash,
      expectedCash: 850,
      status: 'OPEN',
    });
    expect(authorizedRequest).toHaveBeenCalledWith({
      method: 'GET', path: '/cash-register/current', signal: undefined,
    });
  });

  it('traduce sólo 404 CASH_REGISTER_NOT_OPEN a not-open', async () => {
    const authorizedRequest = jest.fn().mockRejectedValue(
      new ApiError(404, 'CASH_REGISTER_NOT_OPEN', 'No abierta.', undefined, 'trace-cash'),
    );
    await expect(fetchCurrentCashRegister(authorizedRequest as never)).resolves.toBeNull();
    expect(authorizedRequest).toHaveBeenCalledTimes(1);
  });

  it.each([
    new ApiError(0, 'NETWORK_ERROR', 'Sin conexión.', undefined, 'trace-network'),
    new ApiError(404, 'OTHER_NOT_FOUND', 'Otro 404.', undefined, 'trace-404'),
    new ApiError(403, 'FORBIDDEN', 'Sin permiso.', undefined, 'trace-403'),
  ])('propaga %s sin convertirlo en not-open y sin retry', async (error) => {
    const authorizedRequest = jest.fn().mockRejectedValue(error);
    await expect(fetchCurrentCashRegister(authorizedRequest as never)).rejects.toBe(error);
    expect(authorizedRequest).toHaveBeenCalledTimes(1);
  });

  it('abre con body contractual exacto y adapter runtime', async () => {
    const authorizedRequest = jest.fn(async (_request: unknown) => ({
      status: 200, headers: new Headers(), data: openCash,
    }));

    await expect(openCashRegister(authorizedRequest as never, { openingAmount: 500 }))
      .resolves.toMatchObject({ status: 'OPEN', initialCash: 500 });
    expect(authorizedRequest).toHaveBeenCalledWith({
      method: 'POST',
      path: '/cash-register/open',
      body: { openingAmount: 500, currency: 'MXN' },
      allowRefresh: false,
    });
  });

  it('cierra con ClosedCashRegister terminal y body exacto', async () => {
    const closed = {
      ...openCash,
      closedBy: ids.closedBy,
      closedAt: '2026-08-10T20:00:00Z',
      countedCash: 845,
      difference: -5,
      status: 'CLOSED',
    } as const;
    const authorizedRequest = jest.fn(async (_request: unknown) => ({
      status: 200, headers: new Headers(), data: closed,
    }));

    await expect(closeCashRegister(authorizedRequest as never, {
      cashRegisterId: ids.cash,
      countedAmount: 845,
      notes: ' fin de turno ',
    })).resolves.toMatchObject({
      expectedCash: 850,
      countedCash: 845,
      difference: -5,
      status: 'CLOSED',
    });
    expect(authorizedRequest.mock.calls[0]?.[0]).toMatchObject({
      body: {
        cashRegisterId: ids.cash,
        countedAmount: 845,
        currency: 'MXN',
        notes: 'fin de turno',
      },
    });
  });

  it('invalida caja y resumen sólo cuando application recibe éxito', async () => {
    const invalidateQueries = jest.fn(async () => undefined);
    const client = { invalidateQueries } as unknown as QueryClient;

    await invalidateCashState(client);

    expect(invalidateQueries.mock.calls).toEqual([
      [{ queryKey: ['cash-register', 'current'] }],
      [{ queryKey: ['instructor', 'today', 'summary'] }],
    ]);
  });
});
