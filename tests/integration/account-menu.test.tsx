import { act, render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { Alert, type AlertButton } from "react-native";

import { AccountView } from "../../src/features/account/views/account-view";
import { AuthProvider } from "../../src/providers/auth-provider";
import { logout, restoreSession } from "../../src/services/authService";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn() },
}));

jest.mock("react-native-safe-area-context", () =>
  require("react-native-safe-area-context/jest/mock").default,
);

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

async function renderAs(rol?: string) {
  jest.mocked(restoreSession).mockResolvedValue(
    rol
      ? { authenticated: true, user: { id: "1", email: "20230008@uthh.edu.mx", rol } }
      : { authenticated: false },
  );

  await render(
    <AuthProvider>
      <AccountView />
    </AuthProvider>,
  );
}

describe("Integración — pantalla Más", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("al visitante solo le muestra iniciar sesión y crear cuenta", async () => {
    await renderAs();
    const user = userEvent.setup();

    expect(await screen.findByText("Inicia sesión")).toBeOnTheScreen();
    expect(screen.queryByText("MI CUENTA")).toBeNull();
    expect(screen.queryByText("CERRAR SESIÓN")).toBeNull();

    await user.press(screen.getByRole("button", { name: "Iniciar sesión" }));
    expect(router.push).toHaveBeenCalledWith("/login");
  });

  it("muestra al cliente su perfil y las secciones del diseño", async () => {
    await renderAs("cliente");

    expect(await screen.findByText("20230008")).toBeOnTheScreen();
    expect(screen.getByText("Cliente")).toBeOnTheScreen();
    for (const title of ["MI CUENTA", "ENTRENAMIENTO", "TITANIUM SPORT GYM", "PREFERENCIAS"]) {
      expect(screen.getByText(title)).toBeOnTheScreen();
    }
  });

  it("abre las opciones disponibles y deshabilita las que aún no existen", async () => {
    await renderAs("cliente");
    const user = userEvent.setup();

    await user.press(await screen.findByRole("button", { name: "Mi membresía" }));
    expect(router.push).toHaveBeenCalledWith("/memberships");

    await user.press(screen.getByRole("button", { name: "Pagos y comprobantes" }));
    expect(router.push).toHaveBeenCalledWith("/account/payments");

    await user.press(screen.getByRole("button", { name: "Mis rutinas" }));
    expect(router.push).toHaveBeenCalledWith("/account/routines");

    expect(screen.getByRole("button", { name: "Favoritos, próximamente" })).toBeDisabled();
  });

  it("da al entrenador accesos a sus clientes, rutinas y membresías", async () => {
    await renderAs("entrenador");
    const user = userEvent.setup();

    expect(await screen.findByText("Entrenador")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Mis clientes" }));
    expect(router.push).toHaveBeenCalledWith("/trainer/clients");

    await user.press(screen.getByRole("button", { name: "Membresías del gimnasio" }));
    expect(router.push).toHaveBeenCalledWith("/trainer/account/memberships");
    expect(screen.queryByRole("button", { name: "Mi membresía" })).toBeNull();
  });

  it("da al administrador accesos a usuarios y pagos", async () => {
    await renderAs("administrador");
    const user = userEvent.setup();

    expect(await screen.findByText("ADMINISTRACIÓN")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Usuarios" }));
    expect(router.push).toHaveBeenCalledWith("/admin/users");
    expect(screen.queryByText("ENTRENAMIENTO")).toBeNull();
  });

  it("pide confirmación antes de cerrar la sesión", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    await renderAs("cliente");

    await userEvent.setup().press(await screen.findByRole("button", { name: "CERRAR SESIÓN" }));

    expect(alertSpy).toHaveBeenCalledWith(
      "Cerrar sesión",
      expect.any(String),
      expect.any(Array),
    );
    expect(logout).not.toHaveBeenCalled();

    const buttons = alertSpy.mock.calls[0][2] as AlertButton[];
    await act(async () => {
      buttons.find((button) => button.style === "destructive")?.onPress?.();
    });

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/"));
    expect(logout).toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});
