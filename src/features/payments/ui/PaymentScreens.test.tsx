import { cleanup, fireEvent, render, userEvent, waitFor } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ApiError } from '@/core/http';
import { useNetworkStatus } from '@/core/query';
import { useSession } from '@/core/session';
import { useCurrentCashRegister } from '@/features/cash';
import { ThemeProvider } from '@/shared/theme';

import { createPaymentIntent } from '../application/payment-intent';
import { readPendingPayment } from '../application/payment-retry-store';
import {
  usePaymentDetail,
  usePaymentQuote,
  usePaymentReceipt,
  useRegisterPayment,
} from '../application/payments';
import { PaymentDetailScreen, RegisterPaymentScreen } from './PaymentScreens';

const mockReplace = jest.fn();

jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace, back: jest.fn() }) }));
jest.mock('@/core/query', () => ({ useNetworkStatus: jest.fn() }));
jest.mock('@/core/session', () => ({ useSession: jest.fn() }));
jest.mock('@/features/cash', () => ({ useCurrentCashRegister: jest.fn() }));
jest.mock('../application/payment-intent', () => ({ createPaymentIntent: jest.fn() }));
jest.mock('../application/payment-retry-store', () => ({
  paymentIntentFromPending: (value: unknown) => value,
  readPendingPayment: jest.fn(),
}));
jest.mock('../application/payments', () => ({
  currentBusinessDate: () => '2026-08-10',
  isUncertainPaymentError: (error: unknown) => Boolean(error)
    && typeof error === 'object'
    && (error as { status?: number }).status === 0
    && (error as { code?: string }).code !== 'OFFLINE_FINANCIAL_OPERATION',
  usePaymentDetail: jest.fn(),
  usePaymentQuote: jest.fn(),
  usePaymentReceipt: jest.fn(),
  useRegisterPayment: jest.fn(),
}));

const mockedSession = jest.mocked(useSession);
const mockedNetwork = jest.mocked(useNetworkStatus);
const mockedCash = jest.mocked(useCurrentCashRegister);
const mockedQuote = jest.mocked(usePaymentQuote);
const mockedMutation = jest.mocked(useRegisterPayment);
const mockedDetail = jest.mocked(usePaymentDetail);
const mockedReceipt = jest.mocked(usePaymentReceipt);
const mockedPending = jest.mocked(readPendingPayment);
const mockedCreateIntent = jest.mocked(createPaymentIntent);

const ids = {
  membership: '11111111-1111-4111-8111-111111111111',
  plan: '22222222-2222-4222-8222-222222222222',
  student: '33333333-3333-4333-8333-333333333333',
  payment: '44444444-4444-4444-8444-444444444444',
  file: '55555555-5555-4555-8555-555555555555',
};

const intent = {
  idempotencyKey: '66666666-6666-4666-8666-666666666666',
  fingerprint: 'a'.repeat(64),
  membershipId: ids.membership,
  method: 'CASH' as const,
  effectiveDate: '2026-08-10',
  createdAt: '2026-08-10T12:00:00.000Z',
  expiresAt: '2026-08-11T12:00:00.000Z',
};

const payment = {
  id: ids.payment,
  folio: 'PAY-0001',
  branchId: '77777777-7777-4777-8777-777777777777',
  studentId: ids.student,
  membershipId: ids.membership,
  amount: 850,
  currency: 'MXN' as const,
  method: 'CASH' as const,
  concept: 'MEMBERSHIP_RENEWAL' as const,
  status: 'REGISTERED' as const,
  effectiveDate: '2026-08-10',
  createdAt: '2026-08-10T12:01:00Z',
  studentName: 'Persona de prueba',
};

function authenticatedSession(permissions = ['PAGOS_REGISTRAR', 'PAGOS_CONSULTAR', 'CAJA_CONSULTAR']) {
  return {
    state: {
      status: 'authenticated',
      permissions: new Set(permissions),
      user: { firstName: 'Prueba' },
    },
    protectedMediaSource: (path: string) => ({
      uri: `https://api.example.test/api/v1${path}`,
      headers: { Authorization: 'Bearer memory-only' },
    }),
  } as never;
}

async function renderScreen(element: ReactElement) {
  const view = await render(
    <SafeAreaProvider initialMetrics={{
      frame: { x: 0, y: 0, width: 390, height: 844 },
      insets: { top: 47, left: 0, right: 0, bottom: 34 },
    }}>
      <ThemeProvider>{element}</ThemeProvider>
    </SafeAreaProvider>,
  );
  await waitFor(() => expect(view.queryByText('Verificando pagos pendientes…')).toBeNull());
  return view;
}

afterEach(async () => { await cleanup(); });

function mutation(overrides: Record<string, unknown> = {}) {
  return {
    mutate: jest.fn(),
    isPending: false,
    isError: false,
    error: null,
    ...overrides,
  };
}

describe('RegisterPaymentScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSession.mockReturnValue(authenticatedSession());
    mockedNetwork.mockReturnValue({ isOnline: true, isInternetReachable: true });
    mockedPending.mockResolvedValue(undefined);
    mockedQuote.mockReturnValue({
      data: { planId: ids.plan, planName: 'Mensual', amount: 850, currency: 'MXN', status: 'ACTIVO' },
      isPending: false,
      isError: false,
      refetch: jest.fn(),
    } as never);
    mockedCash.mockReturnValue({
      data: { id: '88888888-8888-4888-8888-888888888888' },
      isPending: false,
      isError: false,
      refetch: jest.fn(async () => ({ data: { id: '88888888-8888-4888-8888-888888888888' } })),
    } as never);
    mockedMutation.mockReturnValue(mutation() as never);
    mockedCreateIntent.mockResolvedValue(intent);
  });

  const screen = () => <RegisterPaymentScreen
    membershipId={ids.membership}
    planId={ids.plan}
    studentId={ids.student}
    studentName="Persona de prueba"
  />;

  it('muestra quote, fecha y los tres métodos sin capturar datos de tarjeta/transferencia', async () => {
    const view = await renderScreen(screen());
    expect(view.getByText('Monto de referencia: $850.00 MXN')).toBeTruthy();
    expect(view.getByText('El servidor confirmará el importe final.')).toBeTruthy();
    expect(view.getByText('Fecha efectiva: 2026-08-10')).toBeTruthy();
    expect(view.getByLabelText('Efectivo')).toBeTruthy();
    expect(view.getByLabelText('Transferencia')).toBeTruthy();
    expect(view.getByLabelText('Tarjeta manual')).toBeTruthy();
    expect(view.queryByText(/PAN|CVV|CLABE|banco/i)).toBeNull();
  });

  it('exige confirmación explícita y crea la intención sólo al confirmar', async () => {
    const currentMutation = mutation();
    mockedMutation.mockReturnValue(currentMutation as never);
    const view = await renderScreen(screen());

    const user = userEvent.setup();
    await user.press(view.getByLabelText('Revisar pago'));
    expect(view.getByText('Confirma el pago')).toBeTruthy();
    expect(mockedCreateIntent).not.toHaveBeenCalled();
    await user.press(view.getByLabelText('Registrar pago ahora'));

    await waitFor(() => expect(mockedCreateIntent).toHaveBeenCalledWith({
      membershipId: ids.membership,
      method: 'CASH',
      effectiveDate: '2026-08-10',
    }));
    expect(currentMutation.mutate).toHaveBeenCalledWith(intent, expect.any(Object));
  });

  it('TRANSFER no consulta caja y mantiene request sin campos extra', async () => {
    const currentMutation = mutation();
    mockedMutation.mockReturnValue(currentMutation as never);
    const view = await renderScreen(screen());

    const user = userEvent.setup();
    await user.press(view.getByLabelText('Transferencia'));
    await user.press(view.getByLabelText('Revisar pago'));
    await user.press(view.getByLabelText('Registrar pago ahora'));

    await waitFor(() => expect(mockedCreateIntent).toHaveBeenCalledWith({
      membershipId: ids.membership,
      method: 'TRANSFER',
      effectiveDate: '2026-08-10',
    }));
    expect(mockedCash.mock.results[0]?.value.refetch).not.toHaveBeenCalled();
  });

  it('MANUAL_CARD no muestra PAN/CVV y crea sólo la intención contractual', async () => {
    const view = await renderScreen(screen());
    const user = userEvent.setup();
    await user.press(view.getByLabelText('Tarjeta manual'));
    await user.press(view.getByLabelText('Revisar pago'));
    await user.press(view.getByLabelText('Registrar pago ahora'));

    await waitFor(() => expect(mockedCreateIntent).toHaveBeenCalledWith({
      membershipId: ids.membership,
      method: 'MANUAL_CARD',
      effectiveDate: '2026-08-10',
    }));
    expect(view.queryByText(/PAN|CVV|vencimiento|titular/i)).toBeNull();
  });

  it('presenta pending global aunque pertenezca a otra membresía y bloquea un pago nuevo', async () => {
    const pending = {
      version: 1 as const,
      state: 'uncertain' as const,
      ...intent,
      membershipId: '99999999-9999-4999-8999-999999999999',
    };
    mockedPending.mockResolvedValue(pending);
    const currentMutation = mutation();
    mockedMutation.mockReturnValue(currentMutation as never);
    const view = await renderScreen(screen());

    await waitFor(() => expect(view.getByText(/Pago pendiente de confirmación/)).toBeTruthy());
    expect(view.queryByLabelText('Revisar pago')).toBeNull();
    await userEvent.setup().press(view.getByLabelText('Reintentar la misma operación'));
    expect(currentMutation.mutate).toHaveBeenCalledWith(pending, expect.any(Object));
  });

  it('diferencia replay confirmado al navegar', async () => {
    const currentMutation = mutation({
      mutate: jest.fn((_value, options) => options.onSuccess({ payment, outcome: 'replayed' })),
    });
    mockedMutation.mockReturnValue(currentMutation as never);
    const view = await renderScreen(screen());
    const user = userEvent.setup();
    await user.press(view.getByLabelText('Revisar pago'));
    await user.press(view.getByLabelText('Registrar pago ahora'));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith({
      pathname: './[paymentId]',
      params: { paymentId: ids.payment, replayed: 'true' },
    }));
  });

  it('muestra offline explícito sin formulario enviable', async () => {
    mockedNetwork.mockReturnValue({ isOnline: false, isInternetReachable: false });
    const view = await renderScreen(screen());
    expect(view.getByText(/No se consultó el plan/)).toBeTruthy();
    expect(view.queryByLabelText('Revisar pago')).toBeNull();
  });

  it('presenta resultado uncertain sin ofrecer una nueva intención', async () => {
    mockedMutation.mockReturnValue(mutation({
      isError: true,
      error: new ApiError(0, 'NETWORK_ERROR', 'Conexión interrumpida.', undefined, 'trace-uncertain'),
    }) as never);
    const view = await renderScreen(screen());

    expect(view.getByText(/No pudimos confirmar el resultado/)).toBeTruthy();
    expect(view.getByText(/No registres otro cobro/)).toBeTruthy();
  });

  it.each([
    [409, 'IDEMPOTENCY_KEY_CONFLICT', /La intención cambió/],
    [422, 'INVALID_EFFECTIVE_DATE', /Fecha efectiva no válida/],
  ])('mapea %i %s con traceId y sin marcar éxito', async (status, code, title) => {
    mockedMutation.mockReturnValue(mutation({
      isError: true,
      error: new ApiError(status, code, 'Error financiero.', undefined, 'trace-financial'),
    }) as never);
    const view = await renderScreen(screen());

    expect(view.getByText(title)).toBeTruthy();
    expect(view.getByText(/Código de soporte: trace-financial/)).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

describe('PaymentDetailScreen y Receipt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSession.mockReturnValue(authenticatedSession());
    mockedDetail.mockReturnValue({ data: payment, isPending: false, isError: false, refetch: jest.fn() } as never);
  });

  it('muestra detalle validado, createdAt, studentName y aviso de replay', async () => {
    mockedReceipt.mockReturnValue({
      data: { ...receiptBase(), status: 'PENDING' },
      isPending: false, isError: false, isRefetching: false, refetch: jest.fn(),
    } as never);
    const view = await renderScreen(<PaymentDetailScreen paymentId={ids.payment} replayed />);
    expect(view.getByText(/Alumno: Persona de prueba/)).toBeTruthy();
    expect(view.getByText(`Creado: ${payment.createdAt}`)).toBeTruthy();
    expect(view.getByText(/Este pago ya estaba registrado/)).toBeTruthy();
  });

  it('PENDING no descarga ni renderiza media', async () => {
    mockedReceipt.mockReturnValue({
      data: { ...receiptBase(), status: 'PENDING' },
      isPending: false, isError: false, isRefetching: false, refetch: jest.fn(),
    } as never);
    const view = await renderScreen(<PaymentDetailScreen paymentId={ids.payment} />);
    expect(view.getByText(/Recibo en preparación/)).toBeTruthy();
    expect(view.queryByLabelText('Vista protegida del recibo')).toBeNull();
  });

  it('READY renderiza media protegida sin caché persistente', async () => {
    mockedReceipt.mockReturnValue({
      data: {
        ...receiptBase(), status: 'READY', fileId: ids.file,
        generatedAt: '2026-08-10T12:05:00Z',
      },
      isPending: false, isError: false, isRefetching: false, refetch: jest.fn(),
    } as never);
    const view = await renderScreen(<PaymentDetailScreen paymentId={ids.payment} />);
    expect(view.getByLabelText('Vista protegida del recibo')).toBeTruthy();
    expect(view.getByText(/sin token en URL y sin caché persistente/)).toBeTruthy();
  });

  it('degrada de forma segura cuando falla la media READY', async () => {
    mockedReceipt.mockReturnValue({
      data: {
        ...receiptBase(), status: 'READY', fileId: ids.file,
        generatedAt: '2026-08-10T12:05:00Z',
      },
      isPending: false, isError: false, isRefetching: false, refetch: jest.fn(),
    } as never);
    const view = await renderScreen(<PaymentDetailScreen paymentId={ids.payment} />);

    await fireEvent(
      view.getByLabelText('Vista protegida del recibo'),
      'error',
      { nativeEvent: { error: 'forbidden' } },
    );
    expect(view.getByText('El recibo protegido no está disponible para esta sesión.')).toBeTruthy();
    expect(view.queryByLabelText('Vista protegida del recibo')).toBeNull();
  });

  it.each([
    [404, 'RECEIPT_NOT_FOUND', /El recibo no existe/],
    [403, 'FORBIDDEN', /No autorizado/],
  ])('presenta error seguro de receipt %i', async (status, code, message) => {
    mockedReceipt.mockReturnValue({
      data: undefined, isPending: false, isError: true, isRefetching: false,
      error: new ApiError(status, code, 'No autorizado.', undefined, 'trace-receipt'),
      refetch: jest.fn(),
    } as never);
    const view = await renderScreen(<PaymentDetailScreen paymentId={ids.payment} />);

    expect(view.getByText(message)).toBeTruthy();
    expect(view.getByText(/Código de soporte: trace-receipt/)).toBeTruthy();
    expect(view.queryByLabelText('Vista protegida del recibo')).toBeNull();
  });

  it('FAILED muestra failureCode y no descarga', async () => {
    mockedReceipt.mockReturnValue({
      data: { ...receiptBase(), status: 'FAILED', failureCode: 'PDF_FAILED' },
      isPending: false, isError: false, isRefetching: false, refetch: jest.fn(),
    } as never);
    const view = await renderScreen(<PaymentDetailScreen paymentId={ids.payment} />);
    expect(view.getByText('Código: PDF_FAILED')).toBeTruthy();
    expect(view.queryByLabelText('Vista protegida del recibo')).toBeNull();
  });

  it('rechaza paymentId no UUID antes de habilitar queries', async () => {
    const view = await renderScreen(<PaymentDetailScreen paymentId="invalid" />);
    expect(view.getByText('El identificador del pago no es válido.')).toBeTruthy();
    expect(mockedDetail).toHaveBeenCalledWith('invalid', { enabled: false, permitted: true });
  });
});

function receiptBase() {
  return {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    paymentId: ids.payment,
    receiptNumber: 'REC-0001',
    paymentFolio: payment.folio,
    amount: 850,
    currency: 'MXN' as const,
    paymentMethod: 'CASH' as const,
    deliveryStatus: 'PENDING' as const,
  };
}
