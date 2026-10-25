import { restoreSession } from '../../src/services/authService';

// Same infrastructure boundaries as tests/integration; views, providers and
// viewmodels remain real. No request reaches a backend or secure storage.
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn() },
}));

jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);

jest.mock('../../src/services/authService', () => ({
  getCurrentUser: jest.fn(),
  login: jest.fn(),
  logout: jest.fn(),
  restoreSession: jest.fn(),
  verifyOtp: jest.fn(),
}));

jest.mock('../../src/features/authentication/data/google-auth-gateway', () => ({
  openGoogleAuthSession: jest.fn(),
}));

jest.mock('../../src/services/sessionService', () => ({
  removeAccessToken: jest.fn(),
  saveAccessToken: jest.fn(),
}));

jest.mock('../../src/features/memberships/api/memberships-api', () => ({
  getMembershipPlan: jest.fn(),
  getMembershipPlans: jest.fn(),
}));

jest.mock('../../src/features/store/api/products-api', () => ({
  getProduct: jest.fn(),
  getProducts: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(restoreSession).mockResolvedValue({ authenticated: false });
});
