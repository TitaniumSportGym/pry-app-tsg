import { render, screen, userEvent } from "@testing-library/react-native";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import type { ReactElement } from "react";

import {
  getMembershipPlan,
  getMembershipPlans,
} from "../../src/features/memberships/api/memberships-api";
import { createMembershipCheckout } from "../../src/features/memberships/api/checkout-api";
import type { MembershipPlan } from "../../src/features/memberships/models/membership";
import { MembershipDetailView } from "../../src/features/memberships/views/membership-detail-view";
import { MembershipsView } from "../../src/features/memberships/views/memberships-view";
import { AuthProvider } from "../../src/providers/auth-provider";
import { restoreSession } from "../../src/services/authService";
import { ApiError } from "../../src/types/auth";

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

jest.mock("expo-web-browser", () => ({ openBrowserAsync: jest.fn() }));

jest.mock("../../src/features/memberships/api/checkout-api", () => ({
  createMembershipCheckout: jest.fn(),
}));

jest.mock("../../src/features/memberships/api/memberships-api", () => ({
  getMembershipPlan: jest.fn(),
  getMembershipPlans: jest.fn(),
}));

const monthly: MembershipPlan = {
  id: "c1cad6f0-ac55-49ce-820d-5cf9dc0cf6d5",
  name: "Regular mensual",
  description: "Membresía mensual.",
  type: "individual",
  durationDays: 30,
  price: 440,
  pricePerPerson: 440,
  minPeople: 1,
  maxPeople: 1,
  requiresStudentProof: false,
  benefits: ["Acceso al gimnasio por 30 días", "Acceso a rutinas y entrenamientos"],
  sortOrder: 4,
};

const couple: MembershipPlan = {
  ...monthly,
  id: "7939f270-1a01-4f8f-a2b6-09996d6e1cfb",
  name: "Paquete 2 personas",
  type: "group",
  price: 780,
  pricePerPerson: 390,
  minPeople: 2,
  maxPeople: 2,
  benefits: ["Acceso mensual para 2 personas"],
  sortOrder: 8,
};

async function renderWithSession(ui: ReactElement, rol?: string) {
  jest
    .mocked(restoreSession)
    .mockResolvedValue(
      rol
        ? { authenticated: true, user: { id: "1", email: "usuario@correo.com", rol } }
        : { authenticated: false },
    );

  await render(<AuthProvider>{ui}</AuthProvider>);
}

describe("Integración — consultar membresías", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("lista las membresías con nombre, duración, precio y beneficios", async () => {
    jest.mocked(getMembershipPlans).mockResolvedValue([monthly, couple]);
    await renderWithSession(<MembershipsView area="client" />);

    expect(await screen.findByText("ELIGE TU MEMBRESÍA")).toBeOnTheScreen();
    expect(screen.getByRole("tab", { name: "Regular mensual" })).toBeOnTheScreen();
    expect(screen.getByRole("tab", { name: "Paquete 2 personas" })).toBeOnTheScreen();
    expect(screen.getByText("Individual · 1 mes")).toBeOnTheScreen();
    expect(screen.getByText("$440")).toBeOnTheScreen();
    expect(screen.getByText("Acceso a rutinas y entrenamientos")).toBeOnTheScreen();
  });

  it("cambia el resumen al elegir otro plan y abre su detalle", async () => {
    jest.mocked(getMembershipPlans).mockResolvedValue([monthly, couple]);
    await renderWithSession(<MembershipsView area="client" />);
    const user = userEvent.setup();

    await user.press(await screen.findByRole("tab", { name: "Paquete 2 personas" }));

    expect(screen.getByText("$780")).toBeOnTheScreen();
    expect(screen.getByText("por 1 mes · $390 por persona")).toBeOnTheScreen();
    expect(screen.getByText("2 PERSONAS")).toBeOnTheScreen();

    await user.press(
      screen.getByRole("link", { name: "Ver detalle de la membresía Paquete 2 personas" }),
    );

    expect(router.push).toHaveBeenCalledWith({
      pathname: "/memberships/[id]",
      params: { id: couple.id },
    });
  });

  it("abre el detalle dentro de la cuenta del entrenador", async () => {
    jest.mocked(getMembershipPlans).mockResolvedValue([monthly]);
    await renderWithSession(<MembershipsView area="trainer" />, "entrenador");

    await userEvent
      .setup()
      .press(
        await screen.findByRole("link", { name: "Ver detalle de la membresía Regular mensual" }),
      );

    expect(router.push).toHaveBeenCalledWith({
      pathname: "/trainer/account/memberships/[id]",
      params: { id: monthly.id },
    });
  });

  it("muestra el error con opción de reintentar y vuelve a consultar", async () => {
    jest
      .mocked(getMembershipPlans)
      .mockRejectedValueOnce(new TypeError("Network request failed"))
      .mockResolvedValueOnce([monthly]);
    await renderWithSession(<MembershipsView area="client" />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /No fue posible conectar con el servidor/,
    );

    await userEvent.setup().press(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByRole("tab", { name: "Regular mensual" })).toBeOnTheScreen();
    expect(getMembershipPlans).toHaveBeenCalledTimes(2);
  });

  it("indica cuando no hay membresías disponibles", async () => {
    jest.mocked(getMembershipPlans).mockResolvedValue([]);
    await renderWithSession(<MembershipsView area="client" />);

    expect(await screen.findByText("No hay membresías disponibles")).toBeOnTheScreen();
  });

  it("muestra el skeleton solo si la carga tarda más de 300 ms", async () => {
    jest.mocked(getMembershipPlans).mockReturnValue(new Promise(() => undefined));
    await renderWithSession(<MembershipsView area="client" />);

    expect(screen.queryByLabelText("Cargando membresías")).toBeNull();
    expect(
      await screen.findByLabelText("Cargando membresías", {}, { timeout: 2000 }),
    ).toBeOnTheScreen();
  });
});

describe("Integración — detalle de membresía", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("muestra el detalle completo del plan", async () => {
    jest.mocked(getMembershipPlan).mockResolvedValue(couple);
    await renderWithSession(<MembershipDetailView area="client" planId={couple.id} />);

    expect(await screen.findByText("PAQUETE 2 PERSONAS")).toBeOnTheScreen();
    expect(screen.getByText("$780")).toBeOnTheScreen();
    expect(screen.getByText("$390 por persona")).toBeOnTheScreen();
    expect(screen.getByText("Grupal")).toBeOnTheScreen();
    expect(screen.getByText("Acceso mensual para 2 personas")).toBeOnTheScreen();
    expect(getMembershipPlan).toHaveBeenCalledWith(couple.id);
  });

  it("no consulta la API cuando el id no es válido", async () => {
    await renderWithSession(<MembershipDetailView area="client" planId="semana" />);

    expect(await screen.findByRole("alert")).toHaveTextContent("No encontramos esta membresía.");
    expect(getMembershipPlan).not.toHaveBeenCalled();
  });

  it("muestra que el plan no existe cuando la API responde 404", async () => {
    jest
      .mocked(getMembershipPlan)
      .mockRejectedValue(new ApiError("Plan de membresía no encontrado", 404));
    await renderWithSession(
      <MembershipDetailView area="client" planId="00000000-0000-0000-0000-000000000000" />,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("No encontramos esta membresía.");
  });
});

describe("Integración — comprar membresía", () => {
  const CHECKOUT_URL = "https://www.mercadopago.com.mx/checkout/v1/redirect?pref_id=123";

  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(getMembershipPlans).mockResolvedValue([monthly, couple]);
  });

  it("pide iniciar sesión al visitante y no crea ningún pago", async () => {
    await renderWithSession(<MembershipsView area="client" />);

    await userEvent.setup().press(await screen.findByRole("button", { name: "Comprar por $440" }));

    expect(router.push).toHaveBeenCalledWith("/login");
    expect(createMembershipCheckout).not.toHaveBeenCalled();
  });

  it("abre el pago de Mercado Pago del plan elegido para el cliente", async () => {
    jest.mocked(createMembershipCheckout).mockResolvedValue({ checkoutUrl: CHECKOUT_URL });
    await renderWithSession(<MembershipsView area="client" />, "cliente");
    const user = userEvent.setup();

    await user.press(await screen.findByRole("tab", { name: "Paquete 2 personas" }));
    await user.press(screen.getByRole("button", { name: "Comprar por $780" }));

    expect(createMembershipCheckout).toHaveBeenCalledWith(couple.id, expect.any(String));
    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(CHECKOUT_URL);
  });

  it("usa la misma llave si el cliente reintenta el mismo pago", async () => {
    jest
      .mocked(createMembershipCheckout)
      .mockRejectedValueOnce(new TypeError("Network request failed"))
      .mockResolvedValueOnce({ checkoutUrl: CHECKOUT_URL });
    jest.mocked(getMembershipPlan).mockResolvedValue(monthly);
    await renderWithSession(<MembershipDetailView area="client" planId={monthly.id} />, "cliente");
    const user = userEvent.setup();

    const button = await screen.findByRole("button", { name: "Comprar por $440" });
    await user.press(button);
    expect(await screen.findByRole("alert")).toHaveTextContent(/No pudimos iniciar el pago/);

    await user.press(screen.getByRole("button", { name: "Comprar por $440" }));

    const [firstKey, secondKey] = jest
      .mocked(createMembershipCheckout)
      .mock.calls.map(([, key]) => key);
    expect(secondKey).toBe(firstKey);
    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(CHECKOUT_URL);
  });

  it("muestra el motivo cuando el backend rechaza la compra", async () => {
    jest
      .mocked(createMembershipCheckout)
      .mockRejectedValue(new ApiError("Ya tienes una membresía activa", 409));
    await renderWithSession(<MembershipsView area="client" />, "cliente");

    await userEvent.setup().press(await screen.findByRole("button", { name: "Comprar por $440" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Ya tienes una membresía activa");
    expect(WebBrowser.openBrowserAsync).not.toHaveBeenCalled();
  });

  it("no muestra el botón de compra al entrenador", async () => {
    await renderWithSession(<MembershipsView area="trainer" />, "entrenador");

    expect(await screen.findByText("ELIGE TU MEMBRESÍA")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: /Comprar por/ })).toBeNull();
  });
});
