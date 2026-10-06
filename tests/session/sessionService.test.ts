import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import {
  getAccessToken,
  hasStoredSession,
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
