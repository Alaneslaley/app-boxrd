import type { SessionState } from './SessionState';

export type SessionAction =
  | Readonly<{ type: 'BOOT' }>
  | Readonly<{ type: 'RESOLVE'; state: Exclude<SessionState, { status: 'booting' }> }>;

export function sessionReducer(
  _state: SessionState,
  action: SessionAction,
): SessionState {
  if (action.type === 'BOOT') return { status: 'booting' };
  return action.state;
}
