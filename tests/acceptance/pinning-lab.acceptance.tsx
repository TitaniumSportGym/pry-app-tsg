import { render, screen, userEvent } from '@testing-library/react-native';

import { checkLabHealth } from '../../src/features/pinning-lab/data/health-check';
import { PinningLabPanel } from '../../src/features/pinning-lab/views/pinning-lab-panel';

jest.mock('../../src/features/pinning-lab/models/pinning-lab', () => ({
  resolvePinningLabIdentity: () => ({ variant: 'pinning-lab-invalid', host: 'server-titanium.onrender.com' }),
}));
jest.mock('../../src/features/pinning-lab/data/health-check', () => ({ checkLabHealth: jest.fn() }));

it('allows an anonymous lab demonstration and asks for native evidence when the connection fails', async () => {
  jest.mocked(checkLabHealth).mockResolvedValue({ kind: 'connection-error' });
  await render(<PinningLabPanel />);
  const events = userEvent.setup();
  await events.press(screen.getByRole('button', { name: 'Laboratorio TLS' }));
  expect(screen.getByText('pinning-lab-invalid')).toBeOnTheScreen();
  await events.press(screen.getByRole('button', { name: 'Comprobar conexión' }));
  expect(await screen.findByText(/este mensaje no confirma pinning/)).toBeOnTheScreen();
  expect(checkLabHealth).toHaveBeenCalledTimes(1);
  expect(screen.getByText(/Sin sesión ni datos personales/)).toBeOnTheScreen();
  expect(screen.getByText(/adb logcat -s TitaniumPinningLab/)).toBeOnTheScreen();
});
