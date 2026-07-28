export type CurrentUser = Readonly<{
  id: string;
  branchId: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  branchName: string;
  status: string;
  mustChangePassword: boolean;
  authzVersion: number;
  roles: readonly string[];
  permissions: readonly string[];
}>;

export type SessionExperience =
  | 'internal'
  | 'student'
  | 'must-change-password'
  | 'access-denied';

export type SessionNotice = Readonly<{
  message: string;
  traceId?: string;
  retryable?: boolean;
}>;

export type ProtectedMediaSource = Readonly<{
  uri: string;
  headers: Readonly<Record<string, string>>;
}>;

export type SessionState =
  | Readonly<{ status: 'booting' }>
  | Readonly<{ status: 'anonymous'; notice?: SessionNotice }>
  | Readonly<{
      status: 'authenticated';
      user: CurrentUser;
      permissions: ReadonlySet<string>;
      experience: SessionExperience;
    }>;
