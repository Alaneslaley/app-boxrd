import { AlertBanner } from './AlertBanner';

export function OfflineBanner({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <AlertBanner
      message="Las operaciones que requieren servidor están bloqueadas hasta recuperar conexión."
      title="Sin conexión"
      tone="warning"
    />
  );
}
