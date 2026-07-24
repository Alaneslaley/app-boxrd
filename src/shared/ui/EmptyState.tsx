import type { ReactNode } from 'react';

import { StateMessage } from './StateMessage';

export function EmptyState({
  title = 'Sin resultados',
  message = 'No hay información para mostrar.',
  action,
}: {
  title?: string;
  message?: string;
  action?: ReactNode;
}) {
  return <StateMessage action={action} icon="○" message={message} title={title} />;
}
