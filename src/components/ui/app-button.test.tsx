import { render, screen, userEvent } from '@testing-library/react-native';

import { AppButton } from '@/components/ui/app-button';

describe('AppButton', () => {
  it('muestra el título y ejecuta onPress al presionarlo', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await render(<AppButton title="Iniciar sesión" onPress={onPress} />);

    await user.press(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('no ejecuta onPress cuando está deshabilitado', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await render(<AppButton disabled title="Guardar" onPress={onPress} />);

    const button = screen.getByRole('button', { name: 'Guardar' });
    await user.press(button);

    expect(button).toBeDisabled();
    expect(onPress).not.toHaveBeenCalled();
  });

  it('oculta el título y queda ocupado mientras carga', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await render(<AppButton loading title="Enviar" onPress={onPress} />);

    const button = screen.getByRole('button');
    await user.press(button);

    expect(screen.queryByText('Enviar')).toBeNull();
    expect(button).toBeBusy();
    expect(button).toBeDisabled();
    expect(onPress).not.toHaveBeenCalled();
  });
});
