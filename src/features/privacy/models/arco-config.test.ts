import { isArcoBackendEnabled } from './arco-config';

const initial = process.env.EXPO_PUBLIC_ARCO_BACKEND_ENABLED;
afterEach(() => {
  if (initial === undefined) delete process.env.EXPO_PUBLIC_ARCO_BACKEND_ENABLED;
  else process.env.EXPO_PUBLIC_ARCO_BACKEND_ENABLED = initial;
});

it.each([undefined, '', 'false', 'TRUE', '1', ' true '])('does not accidentally activate ARCO for %j', flag => {
  if (flag === undefined) delete process.env.EXPO_PUBLIC_ARCO_BACKEND_ENABLED;
  else process.env.EXPO_PUBLIC_ARCO_BACKEND_ENABLED = flag;
  expect(isArcoBackendEnabled()).toBe(false);
});

it('activates only on explicit true', () => {
  process.env.EXPO_PUBLIC_ARCO_BACKEND_ENABLED = 'true';
  expect(isArcoBackendEnabled()).toBe(true);
});
