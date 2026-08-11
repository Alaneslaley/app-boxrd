import { ApiError } from '@/core/http';

export type AttendanceOperationPreconditions = Readonly<{
  isOnline(): boolean;
  isPermitted(): boolean;
}>;

export class AttendanceOperationLock {
  private readonly activeStudentIds = new Set<string>();

  async run<T>(
    studentId: string,
    preconditions: AttendanceOperationPreconditions,
    operation: () => Promise<T>,
  ): Promise<T> {
    if (this.activeStudentIds.has(studentId)) {
      throw new ApiError(
        409,
        'ATTENDANCE_OPERATION_IN_PROGRESS',
        'Ya hay un check-in en curso para este alumno.',
        undefined,
        undefined,
      );
    }
    if (!preconditions.isPermitted()) {
      throw new ApiError(
        403,
        'FORBIDDEN',
        'No tienes permiso para registrar asistencias.',
        undefined,
        undefined,
      );
    }
    if (!preconditions.isOnline()) {
      throw new ApiError(
        0,
        'OFFLINE_ATTENDANCE_OPERATION',
        'El check-in requiere conexión. No se guardó ni se envió.',
        undefined,
        undefined,
      );
    }

    this.activeStudentIds.add(studentId);
    try {
      return await operation();
    } finally {
      this.activeStudentIds.delete(studentId);
    }
  }
}
