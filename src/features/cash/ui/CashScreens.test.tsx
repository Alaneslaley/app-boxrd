import { cleanup, fireEvent, render, userEvent } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useNetworkStatus } from '@/core/query';
import { useSession } from '@/core/session';
import { ThemeProvider } from '@/shared/theme';

import {
  useCloseCashRegister,
  useCurrentCashRegister,
  useOpenCashRegister,
} from '../application/cash';
import {
  CashRegisterScreen,
  CloseCashRegisterScreen,
  OpenCashRegisterScreen,
} from './CashScreens';

const mockBack = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: mockPush }),
}));
jest.mock('@/core/query', () => ({ useNetworkStatus: jest.fn() }));
jest.mock('@/core/session', () => ({ useSession: jest.fn() }));
jest.mock('../application/cash', () => ({
  useCloseCashRegister: jest.fn(),
  useCurrentCashRegister: jest.fn(),
  useOpenCashRegister: jest.fn(),
}));

const mockedNetwork = jest.mocked(useNetworkStatus);
const mockedSession = jest.mocked(useSession);
const mockedCurrent = jest.mocked(useCurrentCashRegister);
const mockedOpen = jest.mocked(useOpenCashRegister);
const mockedClose = jest.mocked(useCloseCashRegister);

const current = {
  id: '11111111-1111-4111-8111-111111111111',
  branchId: '22222222-2222-4222-8222-222222222222',
  branchName: 'Centro',
  status: 'OPEN' as const,
  currency: 'MXN' as const,
  initialCash: 500,
  expectedCash: 850,
  openedAt: '2026-08-10T09:00:00Z',
  openedBy: '33333333-3333-4333-8333-333333333333',
};

const closed = {
  ...current,
  status: 'CLOSED' as const,
  expectedCash: 850,
  countedCash: 875,
  difference: 25,
  closedAt: '2026-08-10T20:00:00Z',
  closedBy: '33333333-3333-4333-8333-333333333333',
  closedByName: 'Instructor Prueba',
  notes: 'Cierre validado',
};

function authenticated(permissions = ['CAJA_CONSULTAR', 'CAJA_ABRIR', 'CAJA_CERRAR']) {
  return {
    state: {
      status: 'authenticated',
      permissions: new Set(permissions),
      user: { firstName: 'Prueba' },
    },
  } as never;
}

function mutation(overrides: Record<string, unknown> = {}) {
  return { mutate: jest.fn(), isPending: false, isError: false, error: null, ...overrides };
}

async function renderScreen(element: ReactElement) {
  return await render(
    <SafeAreaProvider initialMetrics={{
      frame: { x: 0, y: 0, width: 390, height: 844 },
      insets: { top: 47, left: 0, right: 0, bottom: 34 },
    }}>
      <ThemeProvider>{element}</ThemeProvider>
    </SafeAreaProvider>,
  );
}

afterEach(async () => { await cleanup(); });

beforeEach(() => {
  jest.clearAllMocks();
  mockedSession.mockReturnValue(authenticated());
  mockedNetwork.mockReturnValue({ isOnline: true, isInternetReachable: true });
  mockedCurrent.mockReturnValue({
    data: current, isPending: false, isError: false, isRefetching: false, refetch: jest.fn(),
  } as never);
  mockedOpen.mockReturnValue(mutation() as never);
  mockedClose.mockReturnValue(mutation() as never);
});

describe('CashScreens', () => {
  it('no habilita consultas ni acciones cuando falta el permiso de lectura', async () => {
    mockedSession.mockReturnValue(authenticated([]));
    const view = await renderScreen(<CashRegisterScreen />);

    expect(view.getByText('Acceso denegado')).toBeTruthy();
    expect(mockedCurrent).toHaveBeenCalledWith({ permitted: false, enabled: true });
    expect(view.queryByLabelText('Abrir caja')).toBeNull();
  });

  it('muestra estado offline sin reutilizar una caja posiblemente obsoleta', async () => {
    mockedNetwork.mockReturnValue({ isOnline: false, isInternetReachable: false });
    const view = await renderScreen(<CashRegisterScreen />);

    expect(view.getByText('La caja actual no puede confirmarse sin conexión.')).toBeTruthy();
    expect(view.queryByLabelText('Cerrar caja')).toBeNull();
  });

  it('abre con revisión explícita y envía sólo openingAmount', async () => {
    const openMutation = mutation();
    mockedOpen.mockReturnValue(openMutation as never);
    const view = await renderScreen(<OpenCashRegisterScreen />);
    const user = userEvent.setup();

    await fireEvent.changeText(view.getByLabelText('Monto inicial'), '500.25');
    expect(openMutation.mutate).not.toHaveBeenCalled();
    await user.press(view.getByLabelText('Revisar apertura'));
    expect(view.getByText('Monto inicial: $500.25 MXN')).toBeTruthy();
    await user.press(view.getByLabelText('Abrir caja ahora'));

    expect(openMutation.mutate).toHaveBeenCalledWith(
      { openingAmount: 500.25 },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('cierra con revisión explícita y un comando contractual', async () => {
    const closeMutation = mutation();
    mockedClose.mockReturnValue(closeMutation as never);
    const view = await renderScreen(<CloseCashRegisterScreen />);
    const user = userEvent.setup();

    await fireEvent.changeText(view.getByLabelText('Monto contado'), '875');
    await fireEvent.changeText(view.getByLabelText('Notas (opcional)'), 'Cierre validado');
    await user.press(view.getByLabelText('Revisar cierre'));
    expect(view.getByText('La diferencia final será calculada por el servidor.')).toBeTruthy();
    await user.press(view.getByLabelText('Cerrar caja ahora'));

    expect(closeMutation.mutate).toHaveBeenCalledWith({
      cashRegisterId: current.id,
      countedAmount: 875,
      notes: 'Cierre validado',
    }, expect.objectContaining({ onSuccess: expect.any(Function) }));
  });

  it('presenta la diferencia terminal devuelta por el servidor', async () => {
    const closeMutation = mutation({
      mutate: jest.fn((_command, options) => options.onSuccess(closed)),
    });
    mockedClose.mockReturnValue(closeMutation as never);
    const view = await renderScreen(<CloseCashRegisterScreen />);
    const user = userEvent.setup();

    await fireEvent.changeText(view.getByLabelText('Monto contado'), '875');
    await user.press(view.getByLabelText('Revisar cierre'));
    await user.press(view.getByLabelText('Cerrar caja ahora'));

    expect(view.getByText(/Sobrante/)).toBeTruthy();
    expect(view.getByText('Diferencia: +$25.00 MXN')).toBeTruthy();
    expect(view.getByText('Estado: CLOSED')).toBeTruthy();
    expect(view.getByText('Cerrada por: Instructor Prueba')).toBeTruthy();
  });
});
