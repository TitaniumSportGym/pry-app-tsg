import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { sessionEvents } from '../../src/core/observer/session-events';

import {
  getAccessToken,
  hasStoredSession,
  invalidateAccessToken,
  removeAccessToken,
  saveAccessToken,
} from "../../src/services/sessionService";

jest.mock("expo-secure-store", () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const secureStoreMock = jest.mocked(SecureStore);
const tokenKey = "titanium_access_token";

describe("sessionService — [S1][TASK-API-02]", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    const storage = new Map<string, string>();

    secureStoreMock.setItemAsync.mockImplementation(async (key, value) => {
      storage.set(key, value);
    });
    secureStoreMock.getItemAsync.mockImplementation(async (key) => {
      return storage.get(key) ?? null;
    });
    secureStoreMock.deleteItemAsync.mockImplementation(async (key) => {
      storage.delete(key);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe.each(["ios", "android"] as const)("sesión en %s", (platform) => {
    beforeEach(() => {
      jest.replaceProperty(Platform, "OS", platform);
    });

    it("guarda, recupera y elimina el token, actualizando el estado de sesión", async () => {
      const token = "token-de-prueba";

      await expect(getAccessToken()).resolves.toBeNull();
      await expect(hasStoredSession()).resolves.toBe(false);

      await saveAccessToken(token);
      expect(secureStoreMock.setItemAsync).toHaveBeenCalledWith(tokenKey, token);
      await expect(getAccessToken()).resolves.toBe(token);
      expect(secureStoreMock.getItemAsync).toHaveBeenCalledWith(tokenKey);
      await expect(hasStoredSession()).resolves.toBe(true);

      await removeAccessToken();
      expect(secureStoreMock.deleteItemAsync).toHaveBeenCalledWith(tokenKey);
      await expect(getAccessToken()).resolves.toBeNull();
      await expect(hasStoredSession()).resolves.toBe(false);
    });

    it.each(["", "   "])("rechaza un token vacío (%j) sin almacenarlo", async (token) => {
      await expect(saveAccessToken(token)).rejects.toThrow("Access token is required.");
      expect(secureStoreMock.setItemAsync).not.toHaveBeenCalled();
      await expect(hasStoredSession()).resolves.toBe(false);
    });

    it("propaga el error cuando SecureStore no puede guardar el token", async () => {
      const error = new Error("No se pudo guardar el token");
      secureStoreMock.setItemAsync.mockRejectedValueOnce(error);

      await expect(saveAccessToken("token-de-prueba")).rejects.toBe(error);
      await expect(hasStoredSession()).resolves.toBe(false);
    });

    it("propaga el error cuando SecureStore no puede recuperar el token", async () => {
      const error = new Error("No se pudo recuperar el token");
      secureStoreMock.getItemAsync.mockRejectedValueOnce(error);

      await expect(getAccessToken()).rejects.toBe(error);
    });

    it("propaga el error cuando SecureStore no puede eliminar el token", async () => {
      await saveAccessToken("token-de-prueba");
      const error = new Error("No se pudo eliminar el token");
      secureStoreMock.deleteItemAsync.mockRejectedValueOnce(error);

      await expect(removeAccessToken()).rejects.toBe(error);
      await expect(hasStoredSession()).resolves.toBe(true);
    });
  });

  it("en web guarda, recupera y elimina la sesión en memoria sin usar SecureStore", async () => {
    jest.replaceProperty(Platform, "OS", "web");

    await expect(getAccessToken()).resolves.toBeNull();
    await expect(hasStoredSession()).resolves.toBe(false);

    await saveAccessToken("token-web-de-prueba");
    await expect(getAccessToken()).resolves.toBe("token-web-de-prueba");
    await expect(hasStoredSession()).resolves.toBe(true);

    await removeAccessToken();
    await expect(getAccessToken()).resolves.toBeNull();
    await expect(hasStoredSession()).resolves.toBe(false);
    expect(secureStoreMock.setItemAsync).not.toHaveBeenCalled();
    expect(secureStoreMock.getItemAsync).not.toHaveBeenCalled();
    expect(secureStoreMock.deleteItemAsync).not.toHaveBeenCalled();
  });
});

describe.each(['android', 'ios', 'web'] as const)('atomic session invalidation on %s', platform => {
  const listener = jest.fn();
  let unsubscribe: () => void;
  beforeEach(async () => {
    jest.resetAllMocks();
    jest.replaceProperty(Platform, 'OS', platform);
    let stored: string | null = null;
    secureStoreMock.setItemAsync.mockImplementation(async (_key, value) => { stored = value; });
    secureStoreMock.getItemAsync.mockImplementation(async () => stored);
    secureStoreMock.deleteItemAsync.mockImplementation(async () => { stored = null; });
    await saveAccessToken('rejected-synthetic-token');
    unsubscribe = sessionEvents.subscribe(listener);
  });
  afterEach(() => { unsubscribe(); jest.restoreAllMocks(); });

  it('clears once and notifies once for simultaneous 401s', async () => {
    expect(await Promise.all([
      invalidateAccessToken('rejected-synthetic-token'), invalidateAccessToken('rejected-synthetic-token'),
      invalidateAccessToken('rejected-synthetic-token'),
    ])).toEqual([true, false, false]);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ type: 'invalidated' });
    expect(JSON.stringify(listener.mock.calls)).not.toContain('rejected-synthetic-token');
    expect(secureStoreMock.deleteItemAsync).toHaveBeenCalledTimes(platform === 'web' ? 0 : 1);
    expect(await getAccessToken()).toBeNull();
  });

  it('ignores a late rejection of the previous login', async () => {
    await saveAccessToken('new-synthetic-token');
    expect(await invalidateAccessToken('rejected-synthetic-token')).toBe(false);
    expect(await getAccessToken()).toBe('new-synthetic-token');
    expect(listener).not.toHaveBeenCalled();
  });

  it('serializes cleanup before a newer save instead of deleting the new login', async () => {
    const cleanup = invalidateAccessToken('rejected-synthetic-token');
    const login = saveAccessToken('new-synthetic-token');
    await Promise.all([cleanup, login]);
    expect(await getAccessToken()).toBe('new-synthetic-token');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('deduplicates missing-token invalidation too', async () => {
    await removeAccessToken();
    expect(await Promise.all([invalidateAccessToken(null), invalidateAccessToken(null)])).toEqual([true, false]);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

it('closes UI and quarantines a rejected credential even when native deletion fails, then recovers on login', async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  let stored: string | null = null;
  secureStoreMock.setItemAsync.mockImplementation(async (_key, value) => { stored = value; });
  secureStoreMock.getItemAsync.mockImplementation(async () => stored);
  secureStoreMock.deleteItemAsync.mockRejectedValueOnce(new Error('Native deletion failed'));
  const listener = jest.fn();
  const unsubscribe = sessionEvents.subscribe(listener);
  try {
    await saveAccessToken('rejected-token');
    await expect(invalidateAccessToken('rejected-token')).rejects.toThrow('Native deletion failed');
    expect(listener).toHaveBeenCalledWith({ type: 'invalidated' });
    expect(await getAccessToken()).toBeNull();
    await saveAccessToken('new-token');
    expect(await getAccessToken()).toBe('new-token');
  } finally { unsubscribe(); jest.restoreAllMocks(); }
});

it('fails closed when secure storage cannot compare a rejected credential', async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  secureStoreMock.setItemAsync.mockResolvedValue(undefined);
  secureStoreMock.getItemAsync.mockResolvedValue('read-failure-token');
  await saveAccessToken('read-failure-token');
  secureStoreMock.getItemAsync.mockRejectedValueOnce(new Error('Storage read unavailable'));
  const listener = jest.fn();
  const unsubscribe = sessionEvents.subscribe(listener);
  try {
    await expect(invalidateAccessToken('read-failure-token')).rejects.toThrow('Storage read unavailable');
    expect(listener).toHaveBeenCalledWith({ type: 'invalidated' });
    expect(await getAccessToken()).toBeNull();
  } finally { unsubscribe(); jest.restoreAllMocks(); }
});
