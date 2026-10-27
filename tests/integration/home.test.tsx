import { render, screen, userEvent } from "@testing-library/react-native";
import { router } from "expo-router";

import { HomeView } from "../../src/features/home/views/home-view";
import { getMyPayments } from "../../src/features/payments/api/payments-api";
import type { Payment } from "../../src/features/payments/models/payment";
import { getProducts } from "../../src/features/store/api/products-api";
import type { Product } from "../../src/features/store/models/product";
import { AuthProvider } from "../../src/providers/auth-provider";
import { restoreSession } from "../../src/services/authService";

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

jest.mock("../../src/features/store/api/products-api", () => ({
  getProduct: jest.fn(),
  getProducts: jest.fn(),
}));

jest.mock("../../src/features/payments/api/payments-api", () => ({
  getMyPayments: jest.fn(),
}));

const creatine: Product = {
  id: 138,
  name: "Creatina monohidratada",
  brand: "Optimum Nutrition",
  categoryId: 2,
  categoryName: "Suplementos",
  kind: "supplement",
  price: 480,
  stock: 10,
  imageUrls: ["https://res.cloudinary.com/demo/creatine.jpg"],
  description: "",
  features: [],
  createdAt: null,
  specs: [],
};

const paidPayment: Payment = {
  id: "p1",
  amount: 499,
  currency: "MXN",
  status: "paid",
  date: new Date(2026, 9, 12),
  orderId: "o1",
  orderNumber: "ORD-2026-000002",
  method: "online_checkout",
};

async function renderHome(session: "guest" | "client") {
  jest.mocked(restoreSession).mockResolvedValue(
    session === "client"
      ? {
          authenticated: true,
          user: { id: "1", email: "20230008@uthh.edu.mx", rol: "cliente" },
        }
      : { authenticated: false },
  );

  await render(
    <AuthProvider>
      <HomeView />
    </AuthProvider>,
  );
}

describe("Integración — inicio del cliente", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(getProducts).mockResolvedValue([creatine]);
  });

  it("muestra el número de socio y su último pago", async () => {
    jest.mocked(getMyPayments).mockResolvedValue([paidPayment]);
    await renderHome("client");

    expect(await screen.findByText("Socio 20230008")).toBeOnTheScreen();
    expect(await screen.findByText("Último pago · $499.00")).toBeOnTheScreen();
    expect(screen.getByText("ORD-2026-000002 · 12 oct 2026")).toBeOnTheScreen();
    expect(screen.getByText("Pagado")).toBeOnTheScreen();
  });

  it("indica cuando el cliente aún no tiene pagos", async () => {
    jest.mocked(getMyPayments).mockResolvedValue([]);
    await renderHome("client");

    expect(await screen.findByText("Aún no tienes pagos registrados.")).toBeOnTheScreen();
  });

  it("recomienda productos y abre su detalle", async () => {
    jest.mocked(getMyPayments).mockResolvedValue([]);
    await renderHome("client");

    await userEvent
      .setup()
      .press(await screen.findByRole("button", { name: "Creatina monohidratada, $480.00" }));

    expect(router.push).toHaveBeenCalledWith({ pathname: "/store/[id]", params: { id: "138" } });
  });

  it("lleva a membresías y a la tienda desde los accesos rápidos", async () => {
    jest.mocked(getMyPayments).mockResolvedValue([]);
    await renderHome("client");
    const user = userEvent.setup();

    await user.press(await screen.findByRole("button", { name: "Membresía" }));
    expect(router.push).toHaveBeenCalledWith("/memberships");

    await user.press(screen.getByRole("button", { name: "Tienda" }));
    expect(router.push).toHaveBeenCalledWith("/store");
  });

  it("muestra como próximamente lo que aún no tiene datos", async () => {
    jest.mocked(getMyPayments).mockResolvedValue([]);
    await renderHome("client");

    expect(await screen.findByText("Reserva tus clases desde la app")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Mis pagos, próximamente" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Reservar, próximamente" })).toBeDisabled();
    expect(screen.getByLabelText("Notificaciones, próximamente")).toBeOnTheScreen();
  });
});

describe("Integración — inicio del visitante", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(getProducts).mockResolvedValue([creatine]);
  });

  it("saluda al invitado y no consulta pagos", async () => {
    await renderHome("guest");

    expect(await screen.findByText("Hola, invitado")).toBeOnTheScreen();
    expect(screen.getByText("Inicia sesión para consultar tu último pago.")).toBeOnTheScreen();
    expect(getMyPayments).not.toHaveBeenCalled();
  });

  it("invita a iniciar sesión o ver los planes", async () => {
    await renderHome("guest");
    const user = userEvent.setup();

    await user.press(await screen.findByRole("button", { name: "VER PLANES" }));
    expect(router.push).toHaveBeenCalledWith("/memberships");

    await user.press(screen.getByRole("button", { name: "INICIAR SESIÓN" }));
    expect(router.push).toHaveBeenCalledWith("/login");
  });
});
