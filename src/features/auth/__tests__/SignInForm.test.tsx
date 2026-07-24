import {
  act,
  fireEvent,
  render,
  userEvent,
  waitFor,
} from '@testing-library/react-native';

import type { NormalizedCredentials } from '../api/auth-schemas';
import { SignInForm } from '../ui/components/SignInForm';

describe('SignInForm', () => {
  it('muestra validaciones sin enviar campos vacíos', async () => {
    const onSubmit =
      jest.fn<Promise<boolean>, [NormalizedCredentials]>();
    const view = await render(
      <SignInForm loading={false} offline={false} onSubmit={onSubmit} />,
    );

    await userEvent
      .setup()
      .press(view.getByRole('button', { name: 'Iniciar sesión' }));

    expect(
      await view.findByText(/Ingresa un correo electrónico válido\./),
    ).toBeOnTheScreen();
    expect(
      await view.findByText(/Ingresa tu contraseña\./),
    ).toBeOnTheScreen();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('normaliza el email, conserva la contraseña y la limpia tras éxito', async () => {
    const password = '  password test-only Con Espacios  ';
    const onSubmit = jest
      .fn<Promise<boolean>, [NormalizedCredentials]>()
      .mockResolvedValue(true);
    const view = await render(
      <SignInForm loading={false} offline={false} onSubmit={onSubmit} />,
    );
    const emailField = view.getByLabelText('Correo electrónico');
    const passwordField = view.getByLabelText('Contraseña');

    await fireEvent.changeText(emailField, '  USER@Example.COM ');
    await fireEvent.changeText(passwordField, password);
    await userEvent
      .setup()
      .press(view.getByRole('button', { name: 'Iniciar sesión' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        email: 'user@example.com',
        password,
      });
    });
    await waitFor(() => expect(passwordField).toHaveDisplayValue(''));
  });

  it('conserva la contraseña cuando el inicio de sesión falla', async () => {
    const password = 'password-test-only';
    const onSubmit = jest
      .fn<Promise<boolean>, [NormalizedCredentials]>()
      .mockResolvedValue(false);
    const view = await render(
      <SignInForm loading={false} offline={false} onSubmit={onSubmit} />,
    );
    const passwordField = view.getByLabelText('Contraseña');

    await fireEvent.changeText(
      view.getByLabelText('Correo electrónico'),
      'user@example.com',
    );
    await fireEvent.changeText(passwordField, password);
    await userEvent
      .setup()
      .press(view.getByRole('button', { name: 'Iniciar sesión' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(
        view.getByRole('button', { name: 'Iniciar sesión' }),
      ).toBeEnabled(),
    );
    expect(passwordField).toHaveDisplayValue(password);
  });

  it('bloquea el submit offline con una explicación accesible', async () => {
    const onSubmit =
      jest.fn<Promise<boolean>, [NormalizedCredentials]>();
    const view = await render(
      <SignInForm loading={false} offline onSubmit={onSubmit} />,
    );
    const button = view.getByRole('button', { name: 'Iniciar sesión' });

    expect(button).toBeDisabled();
    expect(button).toHaveProp(
      'accessibilityHint',
      'Recupera la conexión para poder autenticarte.',
    );
    await userEvent.setup().press(button);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('impide un segundo submit mientras el primero continúa pendiente', async () => {
    let resolveSubmit: ((success: boolean) => void) | undefined;
    const pendingSubmit = new Promise<boolean>((resolve) => {
      resolveSubmit = resolve;
    });
    const onSubmit = jest
      .fn<Promise<boolean>, [NormalizedCredentials]>()
      .mockReturnValue(pendingSubmit);
    const view = await render(
      <SignInForm loading={false} offline={false} onSubmit={onSubmit} />,
    );
    const button = view.getByRole('button', { name: 'Iniciar sesión' });

    await fireEvent.changeText(
      view.getByLabelText('Correo electrónico'),
      'user@example.com',
    );
    await fireEvent.changeText(
      view.getByLabelText('Contraseña'),
      'password-test-only',
    );
    await userEvent.setup().press(button);
    await waitFor(() => expect(button).toBeDisabled());

    await userEvent.setup().press(button);
    expect(onSubmit).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSubmit?.(true);
      await pendingSubmit;
    });
    await waitFor(() => expect(button).toBeEnabled());
  });

  it('mantiene la contraseña oculta y permite alternarla de forma accesible', async () => {
    const view = await render(
      <SignInForm
        loading={false}
        offline={false}
        onSubmit={jest.fn<Promise<boolean>, [NormalizedCredentials]>()}
      />,
    );
    const passwordField = view.getByLabelText('Contraseña');

    expect(passwordField).toHaveProp('secureTextEntry', true);
    await userEvent
      .setup()
      .press(view.getByRole('button', { name: 'Mostrar contraseña' }));

    expect(passwordField).toHaveProp('secureTextEntry', false);
    expect(
      view.getByRole('button', { name: 'Ocultar contraseña' }),
    ).toBeOnTheScreen();
  });
});
