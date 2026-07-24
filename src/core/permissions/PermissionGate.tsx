import type { ReactNode } from 'react';

import { useSession } from '@/core/session';

import { can } from './can';

type PermissionGateProps = Readonly<{
  required: string | readonly string[];
  children: ReactNode;
  fallback?: ReactNode;
}>;

export function PermissionGate({
  required,
  children,
  fallback = null,
}: PermissionGateProps) {
  const { state } = useSession();
  if (state.status !== 'authenticated') return fallback;
  return can(state.permissions, required) ? children : fallback;
}
