import { AppButton } from './AppButton';
import { StateMessage } from './StateMessage';

export function ErrorState({
  message = 'No pudimos completar la operación.',
  traceId,
  onRetry,
}: {
  message?: string;
  traceId?: string;
  onRetry?: () => void;
}) {
  const detail = traceId ? `${message} Código de soporte: ${traceId}.` : message;
  return (
    <StateMessage
      action={onRetry ? <AppButton label="Reintentar" onPress={onRetry} /> : undefined}
      icon="⊘"
      message={detail}
      title="Ocurrió un error"
    />
  );
}
