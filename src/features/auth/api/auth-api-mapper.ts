import { ApiError } from '@/core/http';
import type {
  AuthTokens as GeneratedAuthTokens,
  LoginRequest,
  RefreshRequest,
  UserSnapshot as GeneratedUserSnapshot,
} from '@/generated/api';

import type { AuthSession } from '../model/AuthSession';
import type { Credentials } from '../model/Credentials';
import type { CurrentUser } from '../model/CurrentUser';
import {
  authTokensSchema,
  credentialsSchema,
  userSnapshotSchema,
} from './auth-schemas';

function malformedResponse(): ApiError {
  return new ApiError(
    502,
    'MALFORMED_AUTH_RESPONSE',
    'El servicio de autenticación devolvió una respuesta no válida.',
    undefined,
    undefined,
  );
}

export function toLoginRequest(credentials: Credentials): LoginRequest {
  const parsed = credentialsSchema.safeParse(credentials);
  if (!parsed.success) {
    throw new ApiError(
      400,
      'INVALID_CREDENTIALS_INPUT',
      'Revisa los datos de acceso.',
      undefined,
      undefined,
    );
  }

  return {
    email: parsed.data.email,
    password: parsed.data.password,
    ...(credentials.device ? { device: credentials.device.slice(0, 200) } : {}),
  };
}

export function toRefreshRequest(refreshToken: string): RefreshRequest {
  if (!refreshToken) {
    throw new ApiError(
      401,
      'REFRESH_TOKEN_MISSING',
      'La sesión expiró. Inicia sesión nuevamente.',
      undefined,
      undefined,
    );
  }
  return { refreshToken };
}

export function toAuthSession(value: GeneratedAuthTokens): AuthSession {
  const parsed = authTokensSchema.safeParse(value);
  if (!parsed.success) throw malformedResponse();
  return Object.freeze(parsed.data);
}

export function toCurrentUser(value: GeneratedUserSnapshot): CurrentUser {
  const parsed = userSnapshotSchema.safeParse(value);
  if (!parsed.success) throw malformedResponse();

  const firstName = parsed.data.firstName.trim();
  const lastName = parsed.data.lastName.trim();

  return Object.freeze({
    ...parsed.data,
    firstName,
    lastName,
    fullName: [firstName, lastName].filter(Boolean).join(' '),
    roles: Object.freeze([...parsed.data.roles]),
    permissions: Object.freeze([...parsed.data.permissions]),
  });
}
