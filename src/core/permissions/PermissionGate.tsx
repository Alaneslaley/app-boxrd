import {
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react';
import type { AccessibilityState } from 'react-native';

import { useSession } from '@/core/session';

import { can } from './can';
import type { PermissionRequirement } from './Permission';

/**
 * El hijo directo del modo `disabled` debe aceptar y reenviar estas props al
 * control nativo accionable.
 */
export type PermissionGateActionProps = Readonly<{
  disabled?: boolean;
  accessibilityHint?: string;
  accessibilityState?: AccessibilityState;
}>;

type PermissionGateBaseProps = Readonly<{
  required: PermissionRequirement;
  fallback?: ReactNode;
}>;

type VisiblePermissionGateProps = PermissionGateBaseProps &
  Readonly<{
    mode?: 'fallback' | 'hidden';
    disabledReason?: never;
    children: ReactNode;
  }>;

type DisabledPermissionGateProps = PermissionGateBaseProps &
  Readonly<{
    mode: 'disabled';
    disabledReason: string;
    children: ReactElement<PermissionGateActionProps>;
  }>;

export type PermissionGateProps =
  | VisiblePermissionGateProps
  | DisabledPermissionGateProps;

export function PermissionGate(props: PermissionGateProps) {
  const { required, children, fallback = null } = props;
  const { state } = useSession();
  const allowed =
    state.status === 'authenticated' && can(state.permissions, required);

  if (allowed) return children;
  if (props.mode === 'hidden') return null;
  if (props.mode !== 'disabled') return fallback;

  const disabledReason = props.disabledReason.trim();
  if (!disabledReason || !isValidElement<PermissionGateActionProps>(children)) {
    return fallback;
  }

  const existingHint = children.props.accessibilityHint?.trim();
  return cloneElement(children, {
    disabled: true,
    accessibilityState: {
      ...children.props.accessibilityState,
      disabled: true,
    },
    accessibilityHint: existingHint
      ? `${existingHint} ${disabledReason}`
      : disabledReason,
  });
}
