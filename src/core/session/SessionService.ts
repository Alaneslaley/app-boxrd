import { ApiError, type HttpClient, type HttpRequest, type HttpResponse } from '@/core/http';
import type { RefreshCoordinator } from '@/core/http/RefreshCoordinator';
import type { Logger } from '@/core/observability';

import type {
  SessionCredentials,
  SessionGateway,
  SessionTokens,
} from './SessionGateway';
import type {
  CurrentUser,
  SessionExperience,
  SessionNotice,
  SessionState,
} from './SessionState';
import type { TokenVault } from './TokenVault';
import type { SensitiveLocalStateCleanup } from './SensitiveLocalStateCleanup';

type ResolvedSessionState = Exclude<SessionState, { status: 'booting' }>;

export type QuerySessionCache = Readonly<{
  cancelQueries(): Promise<unknown>;
  clear(): void;
}>;

export type SessionServiceDependencies = Readonly<{
  gateway: SessionGateway;
  tokenVault: TokenVault;
  queryCache: QuerySessionCache;
  refreshCoordinator: RefreshCoordinator;
  logger: Logger;
  sensitiveLocalStateCleanup?: SensitiveLocalStateCleanup;
  httpClient?: HttpClient;
  protectedMediaSource?(path: `/media/${string}`): ProtectedMediaSource | undefined;
}>;

export type ProtectedMediaSource = Readonly<{
  uri: string;
  headers: Readonly<Record<string, string>>;
}>;

type SessionListener = (state: ResolvedSessionState) => void;

export class StaleSessionOperationError extends Error {
  constructor() {
    super('La operación de sesión ya no está vigente.');
    this.name = 'StaleSessionOperationError';
  }
}

function isTransient(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.status === 0 ||
      error.code === 'NETWORK_ERROR' ||
      error.code === 'REQUEST_TIMEOUT' ||
      error.code === 'REQUEST_CANCELLED')
  );
}

function noticeFor(error: unknown): SessionNotice {
  if (error instanceof ApiError) {
    return {
      message: error.message,
      traceId: error.traceId,
      retryable: isTransient(error),
    };
  }
  return {
    message: 'No fue posible validar la sesión. Inténtalo nuevamente.',
    retryable: true,
  };
}

function experienceFor(user: CurrentUser): SessionExperience {
  if (user.mustChangePassword) return 'must-change-password';

  const roles = new Set(user.roles.map((role) => role.toUpperCase()));
  const hasInternalRole = ['ADMINISTRADOR', 'RECEPCION', 'INSTRUCTOR'].some((role) =>
    roles.has(role),
  );

  if (hasInternalRole && user.permissions.length > 0) return 'internal';
  if (roles.has('ALUMNO')) return 'student';
  return 'access-denied';
}

function authenticatedState(user: CurrentUser): ResolvedSessionState {
  return {
    status: 'authenticated',
    user,
    permissions: new Set(user.permissions),
    experience: experienceFor(user),
  };
}

export class SessionService {
  private accessToken: string | undefined;
  private generation = 0;
  private refreshAllowed = false;
  private storageQueue: Promise<void> = Promise.resolve();
  private readonly listeners = new Set<SessionListener>();

  constructor(private readonly dependencies: SessionServiceDependencies) {}

  getAccessToken(): string | undefined {
    return this.accessToken;
  }

  async authorizedRequest<TResponse>(
    request: Omit<HttpRequest, 'requiresAuth'>,
  ): Promise<HttpResponse<TResponse>> {
    if (!this.dependencies.httpClient) {
      throw new Error('El cliente autenticado no está disponible.');
    }
    return this.dependencies.httpClient.request<TResponse>({
      ...request,
      requiresAuth: true,
    });
  }

  protectedMediaSource(path: `/media/${string}`): ProtectedMediaSource | undefined {
    return this.dependencies.protectedMediaSource?.(path);
  }

  subscribe(listener: SessionListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async bootstrap(): Promise<ResolvedSessionState> {
    const generation = this.beginOperation();
    let refreshToken: string | null;

    try {
      refreshToken = await this.readRefreshToken();
      this.assertCurrent(generation);
    } catch (error) {
      this.assertCurrent(generation);
      await this.clearLocalSession(false, generation);
      return { status: 'anonymous', notice: noticeFor(error) };
    }

    if (!refreshToken) {
      this.refreshAllowed = false;
      return { status: 'anonymous' };
    }

    try {
      const tokens = await this.dependencies.gateway.refresh(refreshToken);
      await this.commitTokens(tokens, generation);
      const user = await this.dependencies.gateway.me();
      this.assertCurrent(generation);
      this.assertActive(user);
      return authenticatedState(user);
    } catch (error) {
      this.assertCurrent(generation);
      const preserveRefreshToken = isTransient(error);
      await this.clearLocalSession(preserveRefreshToken, generation);
      return {
        status: 'anonymous',
        notice: noticeFor(error),
      };
    }
  }

  async signIn(credentials: SessionCredentials): Promise<ResolvedSessionState> {
    const generation = this.beginOperation();
    let tokens: SessionTokens | undefined;

    try {
      tokens = await this.dependencies.gateway.login(credentials);
      await this.commitTokens(tokens, generation);
      const user = await this.dependencies.gateway.me();
      this.assertCurrent(generation);
      this.assertActive(user);
      return authenticatedState(user);
    } catch (error) {
      this.assertCurrent(generation);

      if (tokens) {
        let latestRefreshToken = tokens.refreshToken;
        try {
          latestRefreshToken =
            (await this.readRefreshToken()) ?? latestRefreshToken;
          this.assertCurrent(generation);
        } catch {
          // El rollback remoto sigue siendo best-effort con el token conocido.
        }
        this.assertCurrent(generation);
        void this.bestEffortRemoteLogout(
          latestRefreshToken,
          'session.rollback.remote-logout-failed',
        );
      }

      await this.clearLocalSession(false, generation);
      throw error;
    }
  }

  async refreshAccessToken(): Promise<void> {
    if (!this.refreshAllowed) {
      throw new ApiError(
        401,
        'SESSION_NOT_REFRESHABLE',
        'La sesión ya no está activa.',
        undefined,
        undefined,
      );
    }

    const generation = this.generation;

    try {
      const refreshToken = await this.readRefreshToken();
      if (!refreshToken) {
        throw new ApiError(
          401,
          'REFRESH_TOKEN_MISSING',
          'La sesión expiró. Inicia sesión nuevamente.',
          undefined,
          undefined,
        );
      }

      const tokens = await this.dependencies.gateway.refresh(refreshToken);
      await this.commitTokens(tokens, generation);
    } catch (error) {
      this.assertCurrent(generation);
      await this.invalidateSession(error, generation);
      throw error;
    }
  }

  async rejectUnauthorizedSession(error?: unknown): Promise<void> {
    const generation = this.generation;
    await this.invalidateSession(
      error ??
        new ApiError(
          401,
          'SESSION_REJECTED',
          'La sesión expiró. Inicia sesión nuevamente.',
          undefined,
          undefined,
        ),
      generation,
    );
  }

  async logout(): Promise<void> {
    this.generation += 1;
    const generation = this.generation;
    this.refreshAllowed = false;
    this.dependencies.refreshCoordinator.invalidate();

    let refreshToken: string | null = null;
    try {
      refreshToken = await this.readRefreshToken();
    } catch (error) {
      this.dependencies.logger.warn('session.logout.token-read-failed', {
        error,
      });
    }

    if (refreshToken) {
      void this.bestEffortRemoteLogout(
        refreshToken,
        'session.logout.remote-failed',
      );
    }

    const cleared = await this.clearLocalSession(false, generation);
    if (cleared) {
      this.emit({ status: 'anonymous' });
    }
  }

  private beginOperation(): number {
    this.generation += 1;
    this.refreshAllowed = true;
    this.dependencies.refreshCoordinator.invalidate();
    this.accessToken = undefined;
    return this.generation;
  }

  private assertCurrent(generation: number): void {
    if (generation !== this.generation) throw new StaleSessionOperationError();
  }

  private assertActive(user: CurrentUser): void {
    if (user.status.toUpperCase() === 'ACTIVE') return;
    throw new ApiError(
      403,
      'USER_INACTIVE',
      'La cuenta no está activa. Contacta a administración.',
      undefined,
      undefined,
    );
  }

  private async readRefreshToken(): Promise<string | null> {
    return this.enqueueStorage(() =>
      this.dependencies.tokenVault.getRefreshToken(),
    );
  }

  private async commitTokens(
    tokens: SessionTokens,
    generation: number,
  ): Promise<void> {
    this.assertCurrent(generation);
    await this.enqueueStorage(async () => {
      this.assertCurrent(generation);
      await this.dependencies.tokenVault.setRefreshToken(tokens.refreshToken);
      if (generation !== this.generation) {
        await this.dependencies.tokenVault.clear();
        throw new StaleSessionOperationError();
      }
    });
    this.assertCurrent(generation);
    this.accessToken = tokens.accessToken;
  }

  private enqueueStorage<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.storageQueue.then(operation, operation);
    this.storageQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  private async clearLocalSession(
    preserveRefreshToken: boolean,
    expectedGeneration: number,
  ): Promise<boolean> {
    if (expectedGeneration !== this.generation) return false;

    this.accessToken = undefined;
    this.refreshAllowed = false;

    if (!preserveRefreshToken) {
      try {
        await this.enqueueStorage(async () => {
          if (expectedGeneration !== this.generation) return;
          await this.dependencies.tokenVault.clear();
        });
      } catch (error) {
        this.dependencies.logger.error('session.vault.clear-failed', { error });
      }
    }

    if (expectedGeneration !== this.generation) return false;

    try {
      await this.dependencies.queryCache.cancelQueries();
    } catch (error) {
      this.dependencies.logger.warn('session.query-cancel-failed', { error });
    }

    if (expectedGeneration !== this.generation) return false;

    try {
      this.dependencies.queryCache.clear();
    } catch (error) {
      this.dependencies.logger.warn('session.query-clear-failed', { error });
    }

    if (!preserveRefreshToken && this.dependencies.sensitiveLocalStateCleanup) {
      try {
        await this.dependencies.sensitiveLocalStateCleanup.clear();
      } catch (error) {
        this.dependencies.logger.warn('session.sensitive-state-clear-failed', { error });
      }
    }

    return expectedGeneration === this.generation;
  }

  private async bestEffortRemoteLogout(
    refreshToken: string,
    failureEvent: string,
  ): Promise<void> {
    try {
      await this.dependencies.gateway.logout(refreshToken);
    } catch (error) {
      this.dependencies.logger.warn(failureEvent, { error });
    }
  }

  private async invalidateSession(
    error: unknown,
    expectedGeneration: number,
  ): Promise<void> {
    if (expectedGeneration !== this.generation) return;

    this.generation += 1;
    const cleanupGeneration = this.generation;
    this.refreshAllowed = false;
    this.dependencies.refreshCoordinator.invalidate();
    const cleared = await this.clearLocalSession(
      isTransient(error),
      cleanupGeneration,
    );
    if (cleared) {
      this.emit({
        status: 'anonymous',
        notice: noticeFor(error),
      });
    }
  }

  private emit(state: ResolvedSessionState): void {
    this.listeners.forEach((listener) => listener(state));
  }
}
