import type { ReactNode } from 'react';

import { StateMessage } from './StateMessage';

export function AccessDeniedState({ action }: { action?: ReactNode }) {
  return (
    <StateMessage
      action={action}
      icon="🔒"
      message="Tu sesión no tiene el permiso requerido. El servidor seguirá siendo la autoridad."
      title="Acceso denegado"
    />
  );
}
