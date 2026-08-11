export type CashRegister = Readonly<{
  id: string;
  branchId: string;
  openedBy: string;
  openedAt: string;
  initialCash: number;
  expectedCash: number;
  currency: 'MXN';
  status: 'OPEN';
  notes?: string;
  branchName?: string;
  openedByName?: string;
}>;

export type ClosedCashRegister = Readonly<{
  id: string;
  branchId: string;
  openedBy: string;
  openedAt: string;
  closedBy: string;
  closedAt: string;
  initialCash: number;
  expectedCash: number;
  countedCash: number;
  difference: number;
  currency: 'MXN';
  status: 'CLOSED';
  notes?: string;
  branchName?: string;
  openedByName?: string;
  closedByName?: string;
}>;

export type OpenCashCommand = Readonly<{
  openingAmount: number;
}>;

export type CloseCashCommand = Readonly<{
  cashRegisterId: string;
  countedAmount: number;
  notes?: string;
}>;

export function parseMoneyInput(value: string): number | undefined {
  const normalized = value.trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return undefined;
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount >= 0 ? amount : undefined;
}

export function cashDifferenceLabel(difference: number): 'Caja cuadrada' | 'Sobrante' | 'Faltante' {
  if (difference === 0) return 'Caja cuadrada';
  return difference > 0 ? 'Sobrante' : 'Faltante';
}
