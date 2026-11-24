import { render, screen, userEvent } from "@testing-library/react-native";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import type { ReactElement } from "react";
import { Linking } from "react-native";

import { AccountView } from "../../src/features/account/views/account-view";
import { PrivacyView } from "../../src/features/legal/views/privacy-view";
import { TermsView } from "../../src/features/legal/views/terms-view";
import { AuthProvider } from "../../src/providers/auth-provider";
import { restoreSession } from "../../src/services/authService";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn() },
}));

jest.mock("expo-web-browser", () => ({ openBrowserAsync: jest.fn() }));

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

async function renderAs(ui: ReactElement, rol?: string) {
  jest.mocked(restoreSession).mockResolvedValue(
    rol
      ? { authenticated: true, user: { id: "1", email: "20230008@uthh.edu.mx", rol } }
      : { authenticated: false },
  );
  await render(<AuthProvider>{ui}</AuthProvider>);
}

describe("Integración — términos y condiciones", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("muestra el texto oficial en secciones numeradas", async () => {
    await renderAs(<TermsView />);

    expect(await screen.findByText("TÉRMINOS Y CONDICIONES")).toBeOnTheScreen();
    expect(screen.getByText("Datos de la empresa")).toBeOnTheScreen();
    expect(screen.getByText("Jurisdicción y resolución de controversias")).toBeOnTheScreen();
    expect(screen.getByText("14")).toBeOnTheScreen();
    expect(screen.getByText(/tsghuejutla@gmail\.com o al teléfono 771 221 4594/)).toBeOnTheScreen();
  });

  it("abre el aviso de privacidad dentro de la pestaña Más del rol", async () => {
    await renderAs(<TermsView />, "entrenador");

    expect(screen.queryByRole("tab")).toBeNull();
    await userEvent.setup().press(await screen.findByRole("link", { name: "Ver Aviso de Privacidad" }));

    expect(router.push).toHaveBeenCalledWith("/trainer/account/privacy");
  });

  it("abre la versión del sitio web", async () => {
    await renderAs(<TermsView />);

    await userEvent.setup().press(await screen.findByRole("button", { name: "Ver en el sitio web" }));

    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(
      "https://titaniumsportgym.vercel.app/terms",
    );
  });
});

describe("Integración — aviso de privacidad", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("muestra los datos que se usan, sus fines y la fecha de actualización", async () => {
    await renderAs(<PrivacyView />, "cliente");

    expect(await screen.findByText("Última actualización: septiembre 2025")).toBeOnTheScreen();
    expect(screen.getByText("Nombre y apellidos.")).toBeOnTheScreen();
    expect(
      screen.getByText("Crear y administrar tu cuenta de usuario en la plataforma."),
    ).toBeOnTheScreen();
    expect(screen.getByText("Derechos ARCO")).toBeOnTheScreen();
  });

  it("abre el correo del gimnasio para ejercer los derechos ARCO", async () => {
    const openUrl = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    await renderAs(<PrivacyView />);

    await userEvent.setup().press(await screen.findByRole("button", { name: "Ejercer mis derechos" }));

    expect(openUrl).toHaveBeenCalledWith(
      "mailto:tsghuejutla@gmail.com?subject=Solicitud%20de%20derechos%20ARCO",
    );
    openUrl.mockRestore();
  });

  it("despliega el detalle de cada sección al tocarla", async () => {
    await renderAs(<PrivacyView />);
    const detail = /no vende tus datos personales/;

    expect(screen.queryByText(detail)).toBeNull();
    await userEvent.setup().press(await screen.findByRole("button", { name: "Transferencias de datos" }));

    expect(screen.getByText(detail)).toBeOnTheScreen();
  });
});

describe("Integración — enlaces en Más", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it.each([
    ["cliente", "/account/privacy", "/account/terms"],
    ["administrador", "/admin/account/privacy", "/admin/account/terms"],
  ])("el rol %p abre las pantallas legales desde Preferencias", async (rol, privacy, terms) => {
    await renderAs(<AccountView />, rol);
    const user = userEvent.setup();

    await user.press(await screen.findByRole("button", { name: "Privacidad y seguridad" }));
    expect(router.push).toHaveBeenCalledWith(privacy);

    await user.press(screen.getByRole("button", { name: "Términos y condiciones" }));
    expect(router.push).toHaveBeenCalledWith(terms);
  });
});
