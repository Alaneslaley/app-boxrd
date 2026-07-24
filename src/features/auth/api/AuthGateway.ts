import type { SessionGateway } from '@/core/session';

/**
 * API propia de auth. No expone DTOs ni tipos de la herramienta OpenAPI.
 */
export interface AuthGateway {
  login: SessionGateway['login'];
  refresh: SessionGateway['refresh'];
  logout: SessionGateway['logout'];
  me: SessionGateway['me'];
}
