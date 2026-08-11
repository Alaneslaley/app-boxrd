import { ApiError } from '@/core/http';

import {
  cashRegisterFromResponse,
  closeRequestFromCommand,
  closedCashRegisterFromResponse,
  openRequestFromCommand,
} from './cash-adapter';

const ids = {
  cash: '11111111-1111-4111-8111-111111111111',
  branch: '22222222-2222-4222-8222-222222222222',
  openedBy: '33333333-3333-4333-8333-333333333333',
  closedBy: '44444444-4444-4444-8444-444444444444',
};

const openResponse = {
  id: ids.cash,
  branchId: ids.branch,
  openedBy: ids.openedBy,
  openedAt: '2026-08-10T14:00:00Z',
  initialCash: 500,
  expectedCash: 850,
  currency: 'MXN',
  status: 'OPEN',
  branchName: 'Centro',
} as const;

describe('cash adapter', () => {
  it('mapea una caja abierta a modelo interno', () => {
    expect(cashRegisterFromResponse(openResponse)).toEqual(openResponse);
  });

  it('rechaza caja cerrada en la frontera current/open', () => {
    expect(() => cashRegisterFromResponse({ ...openResponse, status: 'CLOSED' }))
      .toThrow(ApiError);
  });

  it.each([
    ['expectedCash', Number.NaN],
    ['initialCash', -1],
    ['initialCash', '500'],
    ['id', 'not-a-uuid'],
    ['currency', 'USD'],
  ])('rechaza el campo financiero malformed %s', (field, value) => {
    expect(() => cashRegisterFromResponse({ ...openResponse, [field]: value }))
      .toThrow(ApiError);
  });

  it('mapea el snapshot terminal del cierre con todos sus campos obligatorios', () => {
    const response = {
      ...openResponse,
      closedBy: ids.closedBy,
      closedAt: '2026-08-10T20:00:00Z',
      countedCash: 845,
      difference: -5,
      status: 'CLOSED',
      notes: 'Cierre de turno',
    } as const;

    expect(closedCashRegisterFromResponse(response)).toMatchObject({
      expectedCash: 850,
      countedCash: 845,
      difference: -5,
      closedBy: ids.closedBy,
      status: 'CLOSED',
    });
  });

  it.each(['closedBy', 'closedAt', 'countedCash', 'difference'])
  ('rechaza cierre sin el campo terminal %s', (field) => {
    const response: Record<string, unknown> = {
      ...openResponse,
      closedBy: ids.closedBy,
      closedAt: '2026-08-10T20:00:00Z',
      countedCash: 850,
      difference: 0,
      status: 'CLOSED',
    };
    delete response[field];
    expect(() => closedCashRegisterFromResponse(response)).toThrow(ApiError);
  });

  it('genera request de apertura exacto con MXN fija', () => {
    expect(openRequestFromCommand({ openingAmount: 500 })).toEqual({
      openingAmount: 500,
      currency: 'MXN',
    });
  });

  it('genera request de cierre exacto, normaliza notes y omite vacío', () => {
    expect(closeRequestFromCommand({
      cashRegisterId: ids.cash,
      countedAmount: 850,
      notes: '  turno completo  ',
    })).toEqual({
      cashRegisterId: ids.cash,
      countedAmount: 850,
      currency: 'MXN',
      notes: 'turno completo',
    });
    expect(closeRequestFromCommand({
      cashRegisterId: ids.cash,
      countedAmount: 850,
      notes: '   ',
    })).not.toHaveProperty('notes');
  });
});
