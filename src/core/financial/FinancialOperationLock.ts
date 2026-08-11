import { ApiError } from '@/core/http';

export type FinancialOperationPreconditions = Readonly<{
  isOnline(): boolean;
  isPermitted(): boolean;
}>;

/**
 * Lock síncrono de una sola operación financiera.
 * El flag se toma antes de crear la promesa HTTP.
 */
export class FinancialOperationLock {
  private active = false;

  async run<T>(
    preconditions: FinancialOperationPreconditions,
    operation: () => Promise<T>,
  ): Promise<T> {
    if (this.active) {
      throw new ApiError(
        409,
        'FINANCIAL_OPERATION_IN_PROGRESS',
        'Ya hay una operación financiera en curso.',
        undefined,
        undefined,
      );
    }
    if (!preconditions.isPermitted()) {
      throw new ApiError(
        403,
        'FORBIDDEN',
        'No tienes permiso para realizar esta operación.',
        undefined,
        undefined,
      );
    }
    if (!preconditions.isOnline()) {
      throw new ApiError(
        0,
        'OFFLINE_FINANCIAL_OPERATION',
        'Esta operación requiere conexión. No se guardó ni se envió.',
        undefined,
        undefined,
      );
    }

    this.active = true;
    try {
      return await operation();
    } finally {
      this.active = false;
    }
  }
}
