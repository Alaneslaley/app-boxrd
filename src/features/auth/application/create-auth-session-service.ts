import type { QueryClient } from '@tanstack/react-query';

import { getEnvironment } from '@/core/config';
import {
  GymboxHttpClient,
  RefreshCoordinator,
} from '@/core/http';
import {
  SanitizingLogger,
  type Logger,
} from '@/core/observability';
import {
  ExpoSecureTokenVault,
  SessionService,
} from '@/core/session';

import { AuthRemoteGateway } from '../api/AuthRemoteGateway';

const nullLogger: Logger = {
  debug: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

export function createAuthSessionService(
  queryClient: QueryClient,
): SessionService {
  const environment = getEnvironment();
  const logger = new SanitizingLogger(nullLogger);
  let service: SessionService | undefined;

  const refreshCoordinator = new RefreshCoordinator(async () => {
    if (!service) throw new Error('SessionService aún no está disponible.');
    await service.refreshAccessToken();
  });

  const httpClient = new GymboxHttpClient(environment.apiBaseUrl, {
    auth: {
      getAccessToken: () => service?.getAccessToken(),
      refreshCoordinator,
      onUnauthorized: async (error) => {
        await service?.rejectUnauthorizedSession(error);
      },
    },
  });

  const gateway = new AuthRemoteGateway(httpClient);
  service = new SessionService({
    gateway,
    tokenVault: new ExpoSecureTokenVault(),
    queryCache: queryClient,
    refreshCoordinator,
    logger,
    httpClient,
    protectedMediaSource: (path) => {
      const token = service?.getAccessToken();
      if (!token) return undefined;
      return {
        uri: `${environment.apiBaseUrl}/api/v1${path}`,
        headers: { Authorization: `Bearer ${token}` },
      };
    },
  });

  return service;
}
