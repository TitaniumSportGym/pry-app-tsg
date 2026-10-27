import { render, screen, userEvent } from '@testing-library/react-native';

import { AppInput } from '@/components/ui/app-input';

const mailIcon = { ios: 'envelope', android: 'mail', web: 'mail' } as const;
const lockIcon = { ios: 'lock', android: 'lock', web: 'lock' } as const;

describe('AppInput', () => {
  it('muestra la etiqueta y notifica el texto escrito', async () => {
    const user = userEvent.setup();
    const onChangeText = jest.fn();
    await render(
      <AppInput
        label="Correo electrónico"
        leftIcon={mailIcon}
        placeholder="correo@ejemplo.com"
        onChangeText={onChangeText}
      />,
    );

    expect(screen.getByText('Correo electrónico')).toBeOnTheScreen();
    await user.type(screen.getByPlaceholderText('correo@ejemplo.com'), 'a@b.co');

    expect(onChangeText).toHaveBeenLastCalledWith('a@b.co');
  });

  it('muestra el mensaje de error recibido', async () => {
    await render(
      <AppInput
        error="Ingresa un correo electrónico válido."
        label="Correo electrónico"
        leftIcon={mailIcon}
      />,
    );

    expect(screen.getByText('Ingresa un correo electrónico válido.')).toBeOnTheScreen();
  });

  it('permite mostrar y ocultar la contraseña', async () => {
    const user = userEvent.setup();
    await render(
      <AppInput secureTextEntry label="Contraseña" leftIcon={lockIcon} placeholder="••••••••" />,
    );

    const input = screen.getByPlaceholderText('••••••••');
    expect(input).toHaveProp('secureTextEntry', true);

    await user.press(screen.getByRole('button', { name: 'Mostrar contraseña' }));
    expect(input).toHaveProp('secureTextEntry', false);

    await user.press(screen.getByRole('button', { name: 'Ocultar contraseña' }));
    expect(input).toHaveProp('secureTextEntry', true);
  });
});
