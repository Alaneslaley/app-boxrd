export class RefreshInvalidatedError extends Error {
  constructor() {
    super('El refresh dejó de pertenecer a la sesión activa.');
    this.name = 'RefreshInvalidatedError';
  }
}

/**
 * Comparte exactamente una Promise entre todos los 401 concurrentes.
 * `invalidate` impide que un resultado tardío se considere vigente.
 */
export class RefreshCoordinator {
  private activeRefresh: Promise<void> | undefined;
  private generation = 0;

  constructor(private readonly refreshAction: () => Promise<void>) {}

  refresh(): Promise<void> {
    if (this.activeRefresh) return this.activeRefresh;

    const generation = this.generation;
    const refresh = Promise.resolve()
      .then(() => this.refreshAction())
      .then(() => {
        if (generation !== this.generation) {
          throw new RefreshInvalidatedError();
        }
      })
      .finally(() => {
        if (this.activeRefresh === refresh) {
          this.activeRefresh = undefined;
        }
      });

    this.activeRefresh = refresh;
    return refresh;
  }

  invalidate(): void {
    this.generation += 1;
    this.activeRefresh = undefined;
  }

  hasActiveRefresh(): boolean {
    return this.activeRefresh !== undefined;
  }
}
