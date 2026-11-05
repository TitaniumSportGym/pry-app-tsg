// Jest has no native ExpoCrypto runtime. Keep UUID behavior in integration and
// acceptance tests using Node's cryptographically secure implementation.
jest.mock('expo-crypto', () => ({
  randomUUID: (): string => jest.requireActual('node:crypto').randomUUID(),
}));
