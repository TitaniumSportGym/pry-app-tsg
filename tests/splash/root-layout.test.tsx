import { render, screen } from '@testing-library/react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

jest.mock('expo-font', () => ({ useFonts: jest.fn(() => [true, null]) }));
jest.mock('@expo-google-fonts/bebas-neue', () => ({ BebasNeue_400Regular: 1 }));
jest.mock('@expo-google-fonts/manrope', () => ({}));
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn().mockRejectedValue(new Error('Native splash unavailable')),
}));
jest.mock('expo-router', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
    Stack: () => <Text>Navegación inicial</Text>,
  };
});
jest.mock('../../src/hooks/use-auth', () => ({ useAuth: () => ({ status: 'anonymous' }) }));
jest.mock('../../src/providers/auth-provider', () => ({ AuthProvider: ({ children }: { children: React.ReactNode }) => children }));
jest.mock('../../src/providers/cart-provider', () => ({ CartProvider: ({ children }: { children: React.ReactNode }) => children }));
jest.mock('../../src/components/splash/app-splash-screen', () => ({ AppSplashScreen: () => null }));

it('gestiona el rechazo de preventAutoHideAsync y permite montar la navegación', async () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  try {
    // Import inside the test to observe the module-scope native splash call.
    const { default: RootLayout } = jest.requireActual<typeof import('../../src/app/_layout')>('../../src/app/_layout');
    await render(<RootLayout />);

    expect(SplashScreen.preventAutoHideAsync).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith('No se pudo mantener visible el splash nativo.', expect.any(Error));
    expect(screen.getByText('Navegación inicial')).toBeOnTheScreen();
  } finally {
    warn.mockRestore();
  }
});

it('permite continuar si falla la carga de fuentes', async () => {
  jest.mocked(useFonts).mockReturnValueOnce([false, new Error('Font unavailable')]);
  const { default: RootLayout } = jest.requireActual<typeof import('../../src/app/_layout')>('../../src/app/_layout');
  await render(<RootLayout />);
  expect(screen.getByText('Navegación inicial')).toBeOnTheScreen();
});
