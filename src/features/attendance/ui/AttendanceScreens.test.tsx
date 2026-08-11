import { cleanup, render, userEvent } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useNetworkStatus } from '@/core/query';
import { useSession } from '@/core/session';
import {
  useStudentDetail,
  useStudentMemberships,
} from '@/features/students';
import { ThemeProvider } from '@/shared/theme';

import {
  useAttendanceToday,
  useRegisterCheckIn,
  useStudentAttendance,
} from '../application/attendance';
import {
  AttendanceTodayScreen,
  CheckInScreen,
  decisionPresentation,
} from './AttendanceScreens';

const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));
jest.mock('@/core/query', () => ({ useNetworkStatus: jest.fn() }));
jest.mock('@/core/session', () => ({ useSession: jest.fn() }));
jest.mock('@/features/students', () => ({
  ProtectedStudentPhoto: () => null,
  useStudentDetail: jest.fn(),
  useStudentMemberships: jest.fn(),
}));
jest.mock('../application/attendance', () => ({
  dedupeAttendancePages: (pages: readonly { items: readonly unknown[] }[] | undefined) =>
    pages?.flatMap((page) => page.items) ?? [],
  useAttendanceToday: jest.fn(),
  useRegisterCheckIn: jest.fn(),
  useStudentAttendance: jest.fn(),
}));

const mockedNetwork = jest.mocked(useNetworkStatus);
const mockedSession = jest.mocked(useSession);
const mockedStudent = jest.mocked(useStudentDetail);
const mockedMemberships = jest.mocked(useStudentMemberships);
const mockedToday = jest.mocked(useAttendanceToday);
const mockedHistory = jest.mocked(useStudentAttendance);
const mockedRegister = jest.mocked(useRegisterCheckIn);

const ids = {
  attendance: '11111111-1111-4111-8111-111111111111',
  branch: '22222222-2222-4222-8222-222222222222',
  student: '33333333-3333-4333-8333-333333333333',
  membership: '44444444-4444-4444-8444-444444444444',
  plan: '55555555-5555-4555-8555-555555555555',
};
const attendance = {
  id: ids.attendance,
  branchId: ids.branch,
  studentId: ids.student,
  attendanceDate: '2026-08-10',
  checkedInAt: '2026-08-10T14:30:00Z',
  status: 'REGISTERED',
  studentName: 'Ana Prueba',
};

function authenticated(permissions = [
  'ASISTENCIAS_CONSULTAR',
  'ASISTENCIAS_REGISTRAR',
  'ALUMNOS_CONSULTAR',
  'MEMBRESIAS_CONSULTAR',
  'PAGOS_REGISTRAR',
]) {
  return {
    state: {
      status: 'authenticated',
      permissions: new Set(permissions),
      user: { firstName: 'Prueba' },
    },
  } as never;
}

function query(overrides: Record<string, unknown> = {}) {
  return {
    data: { pages: [{ items: [attendance] }] },
    isPending: false,
    isError: false,
    isRefetching: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    error: null,
    fetchNextPage: jest.fn(),
    refetch: jest.fn(),
    ...overrides,
  };
}

function mutation(overrides: Record<string, unknown> = {}) {
  return { data: undefined, mutate: jest.fn(), isPending: false, isError: false, error: null, ...overrides };
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

beforeEach(() => {
  jest.clearAllMocks();
  mockedSession.mockReturnValue(authenticated());
  mockedNetwork.mockReturnValue({ isOnline: true, isInternetReachable: true });
  mockedToday.mockReturnValue(query() as never);
  mockedHistory.mockReturnValue(query() as never);
  mockedStudent.mockReturnValue({
    data: { id: ids.student, fullName: 'Ana Prueba', status: 'ACTIVE', age: 24, level: 'INTERMEDIATE' },
    isPending: false,
    isError: false,
    refetch: jest.fn(),
  } as never);
  mockedMemberships.mockReturnValue({
    data: [{ id: ids.membership, planId: ids.plan, planName: 'Mensual', expirationStatus: 'ACTIVE', endDate: '2026-09-10' }],
    isPending: false,
    isError: false,
    refetch: jest.fn(),
  } as never);
  mockedRegister.mockReturnValue(mutation() as never);
});

afterEach(async () => { await cleanup(); });

describe('AttendanceScreens', () => {
  it('presenta las cuatro decisiones de forma distinta y exhaustiva', () => {
    expect(decisionPresentation('ALLOWED')).toMatchObject({ title: 'Check-in registrado', tone: 'success' });
    expect(decisionPresentation('ALREADY_REGISTERED')).toMatchObject({ title: 'Asistencia ya registrada', tone: 'info' });
    expect(decisionPresentation('BLOCKED_EXPIRED_MEMBERSHIP')).toMatchObject({ title: 'Check-in bloqueado', tone: 'warning' });
    expect(decisionPresentation('BLOCKED_INACTIVE_STUDENT')).toMatchObject({ title: 'Check-in bloqueado', tone: 'danger' });
  });

  it('protege la lista de hoy por permiso', async () => {
    mockedSession.mockReturnValue(authenticated([]));
    const view = await renderScreen(<AttendanceTodayScreen />);
    expect(view.getByText('Acceso denegado')).toBeTruthy();
    expect(mockedToday).toHaveBeenCalledWith({ permitted: false });
  });

  it('muestra registros en memoria y advierte cuando queda offline', async () => {
    mockedNetwork.mockReturnValue({ isOnline: false, isInternetReachable: false });
    const view = await renderScreen(<AttendanceTodayScreen />);
    expect(view.getByText('Ana Prueba')).toBeTruthy();
    expect(view.getByText(/Datos guardados en memoria/)).toBeTruthy();
  });

  it('exige revisión explícita antes del único envío', async () => {
    const currentMutation = mutation();
    mockedRegister.mockReturnValue(currentMutation as never);
    const view = await renderScreen(<CheckInScreen studentId={ids.student} />);
    const user = userEvent.setup();

    expect(currentMutation.mutate).not.toHaveBeenCalled();
    await user.press(view.getByLabelText('Revisar check-in'));
    expect(view.getByText('Confirmar check-in')).toBeTruthy();
    await user.press(view.getByLabelText('Registrar check-in ahora'));
    expect(currentMutation.mutate).toHaveBeenCalledTimes(1);
    expect(currentMutation.mutate).toHaveBeenCalledWith(ids.student);
  });

  it('no permite iniciar check-in offline y no encola la mutación', async () => {
    const currentMutation = mutation();
    mockedRegister.mockReturnValue(currentMutation as never);
    mockedNetwork.mockReturnValue({ isOnline: false, isInternetReachable: false });
    const view = await renderScreen(<CheckInScreen studentId={ids.student} />);
    const button = view.getByLabelText('Revisar check-in');
    expect(button.props.accessibilityState.disabled).toBe(true);
    expect(view.getByText('No se encola ni se guarda una asistencia sin conexión.')).toBeTruthy();
    expect(currentMutation.mutate).not.toHaveBeenCalled();
  });

  it('distingue replay y ofrece pago sólo para bloqueo vencido con permiso real', async () => {
    mockedMemberships.mockReturnValue({
      data: [{ id: ids.membership, planId: ids.plan, planName: 'Mensual', expirationStatus: 'EXPIRED' }],
      isPending: false,
      isError: false,
      refetch: jest.fn(),
    } as never);
    mockedRegister.mockReturnValue(mutation({
      data: {
        decision: 'BLOCKED_EXPIRED_MEMBERSHIP',
        studentId: ids.student,
        studentName: 'Ana Prueba',
        membershipStatus: 'EXPIRED',
      },
    }) as never);
    const blocked = await renderScreen(<CheckInScreen studentId={ids.student} />);
    expect(blocked.getByText('La membresía está vencida. No se registró asistencia.')).toBeTruthy();
    expect(blocked.getByLabelText('Registrar pago')).toBeTruthy();
    await cleanup();

    mockedRegister.mockReturnValue(mutation({
      data: { decision: 'ALREADY_REGISTERED', studentId: ids.student, attendance },
    }) as never);
    const replay = await renderScreen(<CheckInScreen studentId={ids.student} />);
    expect(replay.getByText(/ya tenía check-in hoy/)).toBeTruthy();
    expect(replay.queryByLabelText('Registrar pago')).toBeNull();
  });
});
