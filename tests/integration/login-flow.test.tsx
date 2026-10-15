import { render, screen, userEvent } from "@testing-library/react-native";
import { router } from "expo-router";

import { LoginFormView } from "../../src/features/authentication/views/login-form-view";
import { AuthProvider } from "../../src/providers/auth-provider";
import { login, restoreSession } from "../../src/services/authService";
import { ApiError } from "../../src/types/auth";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn() },
}));

jest.mock("../../src/services/authService", () => ({
  getCurrentUser: jest.fn(),
  login: jest.fn(),
  logout: jest.fn(),
  restoreSession: jest.fn(),
  verifyOtp: jest.fn(),
}));

jest.mock("../../src/features/authentication/data/google-auth-gateway", () => ({
  openGoogleAuthSession: jest.fn(),
}));

jest.mock("../../src/services/sessionService", () => ({
  removeAccessToken: jest.fn(),
  saveAccessToken: jest.fn(),
}));

const loginMock = jest.mocked(login);
const user = { id: "1", email: "usuario@correo.com", rol: "cliente" };

async function renderLoginForm() {
  await render(
    <AuthProvider>
      <LoginFormView />
    </AuthProvider>,
  );
}

async function fillAndSubmit(email: string, password: string) {
  const userEvents = userEvent.setup();
  await userEvents.type(screen.getByPlaceholderText("correo@ejemplo.com"), email);
  await userEvents.type(screen.getByPlaceholderText("••••••••"), password);
  await userEvents.press(screen.getByRole("button", { name: "Iniciar sesión" }));
}

describe("Integración — flujo de inicio de sesión", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(restoreSession).mockResolvedValue({ authenticated: false });
  });

  it("valida los campos vacíos sin llamar a la API", async () => {
    await renderLoginForm();

    await userEvent.setup().press(screen.getByRole("button", { name: "Iniciar sesión" }));

    expect(await screen.findByText("Ingresa tu correo electrónico.")).toBeOnTheScreen();
    expect(screen.getByText("Ingresa tu contraseña.")).toBeOnTheScreen();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it("inicia sesión con el correo normalizado y navega al inicio", async () => {
    loginMock.mockResolvedValueOnce({ accessToken: "token", user });
    await renderLoginForm();

    await fillAndSubmit("  Usuario@Correo.com ", "Password123!");

    expect(loginMock).toHaveBeenCalledWith("usuario@correo.com", "Password123!");
    expect(router.replace).toHaveBeenCalledWith("/");
  });

  it("envía a verificar el código cuando la cuenta tiene doble factor", async () => {
    loginMock.mockResolvedValueOnce({ twoFactorRequired: true, method: "otp" });
    await renderLoginForm();

    await fillAndSubmit("usuario@correo.com", "Password123!");

    expect(router.push).toHaveBeenCalledWith({
      pathname: "/verify-otp",
      params: { email: "usuario@correo.com" },
    });
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("muestra un mensaje claro cuando las credenciales son incorrectas", async () => {
    loginMock.mockRejectedValueOnce(new ApiError("Unauthorized", 401));
    await renderLoginForm();

    await fillAndSubmit("usuario@correo.com", "Incorrecta1!");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Correo o contraseña incorrectos.",
    );
    expect(router.replace).not.toHaveBeenCalled();
  });
});
