import { ApiError } from '@/core/http';
import { isUuid } from '@/core/validation';
import type {
  CashRegisterSnapshot,
  CloseRequest,
  ClosedCashRegisterSnapshot,
  OpenRequest,
} from '@/generated/api';

import type {
  CashRegister,
  CloseCashCommand,
  ClosedCashRegister,
  OpenCashCommand,
} from '../model/cash-models';

function malformed(field: string): never {
  throw new ApiError(
    502,
    'MALFORMED_FINANCIAL_RESPONSE',
    `La respuesta de caja contiene un campo inválido (${field}).`,
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

function signedMoney(value: unknown, field: string): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : malformed(field);
}

export function cashRegisterFromResponse(response: unknown): CashRegister {
  const value = record(response) as CashRegisterSnapshot;
  if (value.currency !== 'MXN') malformed('currency');
  if (value.status !== 'OPEN') malformed('status');
  return {
    id: uuid(value.id, 'id'),
    branchId: uuid(value.branchId, 'branchId'),
    openedBy: uuid(value.openedBy, 'openedBy'),
    openedAt: text(value.openedAt, 'openedAt'),
    initialCash: money(value.initialCash, 'initialCash'),
    expectedCash: money(value.expectedCash, 'expectedCash'),
    currency: value.currency,
    status: value.status,
    notes: optionalText(value.notes, 'notes'),
    branchName: optionalText(value.branchName, 'branchName'),
    openedByName: optionalText(value.openedByName, 'openedByName'),
  };
}

export function closedCashRegisterFromResponse(response: unknown): ClosedCashRegister {
  const value = record(response) as ClosedCashRegisterSnapshot;
  if (value.currency !== 'MXN') malformed('currency');
  if (value.status !== 'CLOSED') malformed('status');
  return {
    id: uuid(value.id, 'id'),
    branchId: uuid(value.branchId, 'branchId'),
    openedBy: uuid(value.openedBy, 'openedBy'),
    openedAt: text(value.openedAt, 'openedAt'),
    closedBy: uuid(value.closedBy, 'closedBy'),
    closedAt: text(value.closedAt, 'closedAt'),
    initialCash: money(value.initialCash, 'initialCash'),
    expectedCash: money(value.expectedCash, 'expectedCash'),
    countedCash: money(value.countedCash, 'countedCash'),
    difference: signedMoney(value.difference, 'difference'),
    currency: value.currency,
    status: value.status,
    notes: optionalText(value.notes, 'notes'),
    branchName: optionalText(value.branchName, 'branchName'),
    openedByName: optionalText(value.openedByName, 'openedByName'),
    closedByName: optionalText(value.closedByName, 'closedByName'),
  };
}

export function openRequestFromCommand(command: OpenCashCommand): OpenRequest {
  return { openingAmount: command.openingAmount, currency: 'MXN' };
}

export function closeRequestFromCommand(command: CloseCashCommand): CloseRequest {
  const notes = command.notes?.trim();
  return {
    cashRegisterId: command.cashRegisterId,
    countedAmount: command.countedAmount,
    currency: 'MXN',
    ...(notes ? { notes } : {}),
  };
}
