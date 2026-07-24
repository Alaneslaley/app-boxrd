import { userEvent } from '@testing-library/react-native';
import { Pressable, Text, type PressableProps } from 'react-native';

import { PermissionGate, type Permission } from '@/core/permissions';
import type { SessionState } from '@/core/session';
import { authenticatedSessionFixture } from '@/test/fixtures';
import { renderWithProviders } from '@/test/render-with-providers';

const requiredPermission: Permission = 'members.update';

function authenticatedWithPermissions(
  permissions: readonly Permission[],
): SessionState {
  if (authenticatedSessionFixture.status !== 'authenticated') {
    throw new Error('La fixture debe representar una sesión autenticada.');
  }

  return {
    ...authenticatedSessionFixture,
    permissions: new Set(permissions),
  };
}

function ProtectedButton({
  accessibilityHint = 'Abre el editor.',
  ...props
}: Omit<PressableProps, 'children'>) {
  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel="Editar alumno"
      accessibilityRole="button"
      {...props}
    >
      <Text>Editar alumno</Text>
    </Pressable>
  );
}

describe('PermissionGate', () => {
  it('renderiza el contenido cuando el permiso está presente', async () => {
    const view = await renderWithProviders(
      <PermissionGate required={requiredPermission}>
        <Text>Contenido permitido</Text>
      </PermissionGate>,
      authenticatedWithPermissions([requiredPermission]),
    );

    expect(view.getByText('Contenido permitido')).toBeOnTheScreen();
  });

  it('renderiza el fallback cuando falta el permiso', async () => {
    const view = await renderWithProviders(
      <PermissionGate
        fallback={<Text>Sin permiso</Text>}
        required={requiredPermission}
      >
        <Text>Contenido permitido</Text>
      </PermissionGate>,
      authenticatedWithPermissions([]),
    );

    expect(view.getByText('Sin permiso')).toBeOnTheScreen();
    expect(view.queryByText('Contenido permitido')).toBeNull();
  });

  it('no usa el rol de la sesión como autoridad', async () => {
    const view = await renderWithProviders(
      <PermissionGate
        fallback={<Text>Acceso denegado</Text>}
        required={requiredPermission}
      >
        <Text>Acción sensible</Text>
      </PermissionGate>,
      authenticatedWithPermissions([]),
    );

    expect(view.getByText('Acceso denegado')).toBeOnTheScreen();
    expect(view.queryByText('Acción sensible')).toBeNull();
  });

  it('oculta el contenido y el fallback en modo hidden', async () => {
    const view = await renderWithProviders(
      <PermissionGate
        fallback={<Text>Fallback que no debe mostrarse</Text>}
        mode="hidden"
        required={requiredPermission}
      >
        <Text>Acción sensible</Text>
      </PermissionGate>,
      authenticatedWithPermissions([]),
    );

    expect(view.queryByText('Acción sensible')).toBeNull();
    expect(view.queryByText('Fallback que no debe mostrarse')).toBeNull();
  });

  it('deshabilita la acción y explica el motivo de forma accesible', async () => {
    const onPress = jest.fn();
    const view = await renderWithProviders(
      <PermissionGate
        disabledReason="No tienes permiso para editar alumnos."
        mode="disabled"
        required={requiredPermission}
      >
        <ProtectedButton
          accessibilityHint="Abre el editor."
          onPress={onPress}
        />
      </PermissionGate>,
      authenticatedWithPermissions([]),
    );
    const button = view.getByRole('button', { name: 'Editar alumno' });

    expect(button).toBeDisabled();
    expect(button).toHaveProp(
      'accessibilityHint',
      'Abre el editor. No tienes permiso para editar alumnos.',
    );

    await userEvent.setup().press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('mantiene habilitada la acción cuando satisface cualquiera de los permisos', async () => {
    const onPress = jest.fn();
    const view = await renderWithProviders(
      <PermissionGate
        disabledReason="No tienes permiso para editar alumnos."
        mode="disabled"
        required={{ any: ['members.update', 'members.manage'] }}
      >
        <ProtectedButton onPress={onPress} />
      </PermissionGate>,
      authenticatedWithPermissions(['members.manage']),
    );
    const button = view.getByRole('button', { name: 'Editar alumno' });

    expect(button).toBeEnabled();
    await userEvent.setup().press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('falla cerrado si el modo disabled recibe una explicación vacía', async () => {
    const view = await renderWithProviders(
      <PermissionGate
        disabledReason="   "
        fallback={<Text>Acceso denegado</Text>}
        mode="disabled"
        required={requiredPermission}
      >
        <ProtectedButton />
      </PermissionGate>,
      authenticatedWithPermissions([]),
    );

    expect(view.getByText('Acceso denegado')).toBeOnTheScreen();
    expect(view.queryByRole('button', { name: 'Editar alumno' })).toBeNull();
  });
});
