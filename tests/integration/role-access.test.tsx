import { render, screen, userEvent } from "@testing-library/react-native";
import { router } from "expo-router";

import { LoginFormView } from "../../src/features/authentication/views/login-form-view";
import { AuthProvider } from "../../src/providers/auth-provider";
import { login, logout, restoreSession } from "../../src/services/authService";

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

async function signInAs(rol: string) {
  loginMock.mockResolvedValueOnce({
    accessToken: "token",
    user: { id: "1", email: "usuario@correo.com", rol },
  });

  await render(
    <AuthProvider>
      <LoginFormView />
    </AuthProvider>,
  );

  const userEvents = userEvent.setup();
  await userEvents.type(screen.getByPlaceholderText("correo@ejemplo.com"), "usuario@correo.com");
  await userEvents.type(screen.getByPlaceholderText("••••••••"), "Password123!");
  await userEvents.press(screen.getByRole("button", { name: "Iniciar sesión" }));
}

describe("Integración — acceso por rol", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(restoreSession).mockResolvedValue({ authenticated: false });
  });

  it.each([
    ["cliente", "/"],
    ["entrenador", "/trainer"],
    ["administrador", "/admin"],
  ])("envía al rol %p a su inicio", async (rol, home) => {
    await signInAs(rol);

    expect(router.replace).toHaveBeenCalledWith(home);
    expect(logout).not.toHaveBeenCalled();
  });

  it("cierra la sesión y explica el motivo cuando el rol no es reconocido", async () => {
    await signInAs("superusuario");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Tu cuenta no tiene acceso a la aplicación móvil.",
    );
    expect(logout).toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });
});
