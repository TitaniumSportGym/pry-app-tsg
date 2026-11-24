import { apiRequest } from "../../src/services/apiClient";
import {
  login,
  registerMobile,
  resendVerificationOtp,
  verifyAccountOtp,
  verifyOtp,
} from "../../src/services/authService";
import {
  getAccessToken,
  removeAccessToken,
  saveAccessToken,
} from "../../src/services/sessionService";
import { ApiError } from "../../src/types/auth";

jest.mock("../../src/services/apiClient", () => ({
  apiRequest: jest.fn(),
  shouldInvalidateSession: jest.fn(),
}));

jest.mock("../../src/services/sessionService", () => ({
  getAccessToken: jest.fn(),
  removeAccessToken: jest.fn(),
  saveAccessToken: jest.fn(),
}));

const apiRequestMock = jest.mocked(apiRequest);
const email = "usuario@correo.com";

describe("authService — registro y verificación de cuenta móvil", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterEach(() => {
    expect(getAccessToken).not.toHaveBeenCalled();
    expect(removeAccessToken).not.toHaveBeenCalled();
    expect(saveAccessToken).not.toHaveBeenCalled();
  });

  it("registra con client mobile mediante una petición pública", async () => {
    const response = { message: "Se ha enviado un código de verificación." };
    apiRequestMock.mockResolvedValueOnce(response);

    await expect(registerMobile(email, "Password123!")).resolves.toBe(response);

    expect(apiRequestMock).toHaveBeenCalledTimes(1);
    expect(apiRequestMock).toHaveBeenCalledWith("/api/auth/register", {
      method: "POST",
      body: { email, password: "Password123!", client: "mobile" },
      auth: false,
    });
  });

  it("verifica la cuenta conservando los ceros iniciales del código", async () => {
    const response = { message: "Cuenta verificada correctamente." };
    apiRequestMock.mockResolvedValueOnce(response);

    await expect(verifyAccountOtp(email, "012345")).resolves.toBe(response);

    expect(apiRequestMock).toHaveBeenCalledTimes(1);
    expect(apiRequestMock).toHaveBeenCalledWith("/api/auth/verify-account-otp", {
      method: "POST",
      body: { email, otp: "012345" },
      auth: false,
    });
  });

  it("reenvía el código mediante una petición pública", async () => {
    const response = { message: "Si la cuenta requiere verificación, se ha enviado un nuevo código." };
    apiRequestMock.mockResolvedValueOnce(response);

    await expect(resendVerificationOtp(email)).resolves.toBe(response);

    expect(apiRequestMock).toHaveBeenCalledTimes(1);
    expect(apiRequestMock).toHaveBeenCalledWith("/api/auth/resend-verification-otp", {
      method: "POST",
      body: { email },
      auth: false,
    });
  });

  const requests = [
    { name: "registro", call: () => registerMobile(email, "Password123!") },
    { name: "verificación", call: () => verifyAccountOtp(email, "123456") },
    { name: "reenvío", call: () => resendVerificationOtp(email) },
  ];

  it.each(requests)("propaga ApiError de $name sin transformarlo", async ({ call }) => {
    const error = new ApiError("Error del backend", 400, { error: "Error del backend" });
    apiRequestMock.mockRejectedValueOnce(error);

    await expect(call()).rejects.toBe(error);
  });

  it.each(requests)("no crea sesión en $name aunque la respuesta incluya un token", async ({ call }) => {
    const response = { message: "Respuesta del backend", accessToken: "token-de-prueba" };
    apiRequestMock.mockResolvedValueOnce(response);

    await expect(call()).resolves.toBe(response);
  });
});

describe("authService — compatibilidad del login existente", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("conserva el login y el almacenamiento del token de acceso", async () => {
    const response = { accessToken: "token-de-login" };
    apiRequestMock.mockResolvedValueOnce(response);

    await expect(login(email, "Password123!")).resolves.toBe(response);

    expect(apiRequestMock).toHaveBeenCalledWith("/api/auth/login", {
      method: "POST",
      body: { email, password: "Password123!" },
      auth: false,
    });
    expect(saveAccessToken).toHaveBeenCalledWith(response.accessToken);
  });

  it("mantiene separado el OTP de login y guarda su token", async () => {
    const response = { accessToken: "token-de-otp-login" };
    apiRequestMock.mockResolvedValueOnce(response);

    await expect(verifyOtp(email, "123456")).resolves.toBe(response);

    expect(apiRequestMock).toHaveBeenCalledWith("/api/auth/verify-otp", {
      method: "POST",
      body: { email, otp: "123456" },
      auth: false,
    });
    expect(saveAccessToken).toHaveBeenCalledWith(response.accessToken);
  });

  it.each([
    { twoFactorRequired: true, method: "otp" },
    { twoFactorRequired: true, accessToken: "no-guardar-hasta-otp" },
    { message: "Sin token" },
    { accessToken: "" },
  ])("devuelve intacta la respuesta %j sin guardar un token", async (response) => {
    apiRequestMock.mockResolvedValueOnce(response);

    await expect(login(email, "Password123!")).resolves.toBe(response);

    expect(saveAccessToken).not.toHaveBeenCalled();
  });

  it("guarda el token cuando el backend desactiva explícitamente el doble factor", async () => {
    const response = { twoFactorRequired: false, accessToken: "token-login" };
    apiRequestMock.mockResolvedValueOnce(response);

    await expect(login(email, "Password123!")).resolves.toBe(response);

    expect(saveAccessToken).toHaveBeenCalledTimes(1);
    expect(saveAccessToken).toHaveBeenCalledWith("token-login");
  });

  it("propaga el rechazo del backend sin crear una sesión", async () => {
    const error = new ApiError("Credenciales inválidas", 401);
    apiRequestMock.mockRejectedValueOnce(error);

    await expect(login(email, "incorrecta")).rejects.toBe(error);

    expect(saveAccessToken).not.toHaveBeenCalled();
  });

  it("propaga un fallo al guardar el token", async () => {
    const error = new Error("SecureStore unavailable");
    apiRequestMock.mockResolvedValueOnce({ accessToken: "token-login" });
    jest.mocked(saveAccessToken).mockRejectedValueOnce(error);

    await expect(login(email, "Password123!")).rejects.toBe(error);

    expect(saveAccessToken).toHaveBeenCalledWith("token-login");
  });
});
