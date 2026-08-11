import { cashDifferenceLabel, parseMoneyInput } from './cash-models';

describe('cash models', () => {
  it.each([
    ['0', 0],
    ['500', 500],
    ['500.5', 500.5],
    ['500.55', 500.55],
  ])('parsea dinero seguro %s', (input, expected) => {
    expect(parseMoneyInput(input)).toBe(expected);
  });

  it.each(['', '-1', '1.234', 'NaN', '1,000'])('rechaza dinero inválido %s', (input) => {
    expect(parseMoneyInput(input)).toBeUndefined();
  });

  it.each([
    [0, 'Caja cuadrada'],
    [0.01, 'Sobrante'],
    [-0.01, 'Faltante'],
  ] as const)('deriva sólo la etiqueta visual para diferencia %s', (difference, label) => {
    expect(cashDifferenceLabel(difference)).toBe(label);
  });
});
