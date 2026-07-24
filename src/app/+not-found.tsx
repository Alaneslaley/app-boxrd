import { Link } from 'expo-router';

import { EmptyState, Screen } from '@/shared';

export default function NotFoundRoute() {
  return (
    <Screen scroll={false}>
      <EmptyState
        action={<Link href="/">Volver al inicio</Link>}
        message="La ruta solicitada no forma parte de GymBox Mobile."
        title="Pantalla no encontrada"
      />
    </Screen>
  );
}
