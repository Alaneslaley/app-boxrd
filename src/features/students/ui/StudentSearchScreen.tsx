import { useState } from 'react';

import { can } from '@/core/permissions';
import { useSession } from '@/core/session';
import { AccessDeniedState, AlertBanner, AppButton, EmptyState, Screen, TextField } from '@/shared';

export function StudentSearchScreen() {
  const { state } = useSession();
  const [term, setTerm] = useState('');
  if (state.status !== 'authenticated' || !can(state.permissions, 'ALUMNOS_CONSULTAR')) return <Screen><AccessDeniedState /></Screen>;
  const requestedSearch = term.trim().length > 0;
  return <Screen title="Alumnos" subtitle="Busca por nombre o teléfono.">
    <TextField accessibilityHint="La búsqueda se realiza en el servidor." autoCapitalize="words" autoCorrect={false} label="Nombre o teléfono" onChangeText={setTerm} placeholder="Escribe para buscar" value={term} />
    {term ? <AppButton label="Limpiar búsqueda" onPress={() => setTerm('')} variant="secondary" /> : null}
    {requestedSearch ? <>
      <AlertBanner title="Búsqueda pendiente de contrato" tone="warning" message="La API actual no publica un parámetro de búsqueda. No se descargarán alumnos para filtrarlos en el dispositivo." />
      <EmptyState title="No se puede realizar la búsqueda" message="Solicita al backend un filtro server-side por nombre o teléfono antes de usar esta operación." />
    </> : <EmptyState title="Escribe una búsqueda" message="Los resultados aparecerán aquí cuando el contrato habilite la consulta segura." />}
  </Screen>;
}
