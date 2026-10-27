import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as SplashScreen from 'expo-splash-screen';
import { Animated, Platform } from 'react-native';

import { AppSplashScreen } from './app-splash-screen';

jest.mock('expo-splash-screen', () => ({ hideAsync: jest.fn() }));
jest.mock('expo-image', () => ({ Image: 'Image' }));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'View' }));

describe('AppSplashScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.replaceProperty(Platform, 'OS', 'ios');
    jest.mocked(SplashScreen.hideAsync).mockReset().mockResolvedValue(undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    // Complete only the final fade immediately; the component still controls
    // its minimum visible time and readiness using its real effects/timer.
    jest.spyOn(Animated, 'sequence').mockReturnValue({
      start: (callback) => callback?.({ finished: true }),
      stop: jest.fn(), reset: jest.fn(),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it.each([false, true])('continúa hasta ocultar el splash personalizado cuando hideAsync falla: %s', async (fails) => {
    const error = new Error('Native splash unavailable');
    if (fails) jest.mocked(SplashScreen.hideAsync).mockRejectedValueOnce(error);
    const view = await render(<AppSplashScreen isReady={false} />);
    await act(async () => {
      fireEvent(screen.root!, 'layout');
    });
    expect(SplashScreen.hideAsync).toHaveBeenCalledTimes(1);
    if (fails) expect(console.warn).toHaveBeenCalledWith('No se pudo ocultar el splash nativo.', error);
    await act(async () => { jest.advanceTimersByTime(1400); });
    expect(screen.getByText('Cargando...')).toBeOnTheScreen();

    await view.rerender(<AppSplashScreen isReady />);
    await act(async () => { jest.runOnlyPendingTimers(); });
    expect(screen.queryByText('Cargando...')).toBeNull();
  });

  it('respeta el tiempo mínimo y procesa el layout una sola vez', async () => {
    await render(<AppSplashScreen isReady />);
    await act(async () => {
      fireEvent(screen.root!, 'layout');
      fireEvent(screen.root!, 'layout');
    });
    await act(async () => { jest.advanceTimersByTime(1399); });
    expect(screen.getByText('Cargando...')).toBeOnTheScreen();
    expect(SplashScreen.hideAsync).toHaveBeenCalledTimes(1);
    await act(async () => { jest.advanceTimersByTime(1); });
    expect(screen.queryByText('Cargando...')).toBeNull();
  });

  it('en web avanza sin llamar al splash nativo', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    await render(<AppSplashScreen isReady />);
    await act(async () => { fireEvent(screen.root!, 'layout'); });
    await act(async () => { jest.advanceTimersByTime(1400); });
    expect(SplashScreen.hideAsync).not.toHaveBeenCalled();
    expect(screen.queryByText('Cargando...')).toBeNull();
  });
});
