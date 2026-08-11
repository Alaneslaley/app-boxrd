import { ApiError } from '@/core/http';

export type FinancialErrorPresentation = Readonly<{
  title: string;
  message: string;
  traceId?: string;
}>;

const messages: Readonly<Record<string, Readonly<{ title: string; message: string }>>> = {
  CASH_REGISTER_ALREADY_OPEN: {
    title: 'La caja ya está abierta',
    message: 'Actualiza el estado de caja antes de continuar.',
  },
  CASH_REGISTER_ALREADY_CLOSED: {
    title: 'La caja ya fue cerrada',
    message: 'Actualiza el estado para ver el cierre confirmado.',
  },
  CASH_REGISTER_NOT_OPEN: {
    title: 'No hay caja abierta',
    message: 'Abre una caja antes de continuar.',
  },
  CASH_REGISTER_REQUIRED: {
    title: 'Se requiere caja abierta',
    message: 'Los pagos en efectivo requieren una caja abierta.',
  },
  CURRENCY_MISMATCH: {
    title: 'Moneda no admitida',
    message: 'La operación debe registrarse en MXN.',
  },
  IDEMPOTENCY_KEY_CONFLICT: {
    title: 'La intención cambió',
    message: 'No generes otra clave. Revisa la operación pendiente antes de continuar.',
  },
  INVALID_EFFECTIVE_DATE: {
    title: 'Fecha efectiva no válida',
    message: 'La fecha no cumple las reglas de renovación de la membresía.',
  },
  MEMBERSHIP_NOT_RENEWABLE: {
    title: 'Membresía no renovable',
    message: 'La membresía no puede renovarse en su estado actual.',
  },
  PLAN_INACTIVE: {
    title: 'Plan inactivo',
    message: 'No se puede registrar el pago con un plan inactivo.',
  },
  PLAN_NOT_FOUND: {
    title: 'Plan no encontrado',
    message: 'No fue posible obtener el plan asociado a esta membresía.',
  },
  PAYMENT_NOT_FOUND: {
    title: 'Pago no encontrado',
    message: 'El pago no existe o no está disponible para esta sucursal.',
  },
  PAYMENT_UNCERTAIN_STORAGE_FAILED: {
    title: 'Resultado sin resguardo local',
    message: 'No se confirmó el pago y tampoco fue posible proteger el reintento. No registres otro cobro y solicita soporte.',
  },
  RECEIPT_NOT_FOUND: {
    title: 'Recibo no encontrado',
    message: 'El recibo no existe o todavía no está disponible.',
  },
  MALFORMED_FINANCIAL_RESPONSE: {
    title: 'Respuesta financiera inválida',
    message: 'No se confirmó la operación. Contacta a soporte antes de repetirla.',
  },
  PAYMENT_REPLAY_CONTRACT_MISMATCH: {
    title: 'Respuesta idempotente inválida',
    message: 'El servidor respondió con una combinación no contractual. No repitas el cobro.',
  },
  OFFLINE_FINANCIAL_OPERATION: {
    title: 'Sin conexión',
    message: 'La operación no se envió ni quedó en cola. Recupera conexión e inténtalo nuevamente.',
  },
  FINANCIAL_OPERATION_IN_PROGRESS: {
    title: 'Operación en curso',
    message: 'Espera a que termine la operación actual.',
  },
};

export function financialErrorPresentation(error: unknown): FinancialErrorPresentation {
  if (!(error instanceof ApiError)) {
    return {
      title: 'No pudimos completar la operación',
      message: 'Inténtalo nuevamente cuando confirmes el estado actual.',
    };
  }

  const mapped = messages[error.code];
  return {
    title: mapped?.title ?? (error.status === 403 ? 'Acceso denegado' : 'No pudimos completar la operación'),
    message: mapped?.message ?? error.message,
    traceId: error.traceId,
  };
}
