import { render, screen, userEvent } from "@testing-library/react-native";
import { router } from "expo-router";
import type { ReactElement } from "react";

import { CLIENT_TABS } from "../../src/features/navigation/models/role-tabs";
import { getProduct, getProducts } from "../../src/features/store/api/products-api";
import type { Product } from "../../src/features/store/models/product";
import { ProductDetailView } from "../../src/features/store/views/product-detail-view";
import { StoreView } from "../../src/features/store/views/store-view";
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

jest.mock("../../src/features/store/api/products-api", () => ({
  getProduct: jest.fn(),
  getProducts: jest.fn(),
}));

const creatine: Product = {
  id: 138,
  name: "Creatina monohidratada 300 g",
  brand: "Optimum Nutrition",
  categoryId: 2,
  categoryName: "Suplementos",
  kind: "supplement",
  price: 549,
  stock: 26,
  imageUrls: ["https://res.cloudinary.com/demo/creatine.jpg"],
  description: "Creatina monohidratada micronizada",
  features: [],
  specs: [
    { label: "Sabor", value: "Sin sabor" },
    { label: "Presentación", value: "300 g" },
  ],
};

const shirt: Product = {
  ...creatine,
  id: 101,
  name: "Playera Block Party Negro",
  brand: "YoungLA",
  categoryId: 1,
  categoryName: "Ropa deportiva",
  kind: "apparel",
  price: 599,
  stock: 0,
  features: ["Corte ajustado"],
  specs: [{ label: "Talla", value: "M" }],
};

async function renderAsGuest(ui: ReactElement) {
  jest.mocked(restoreSession).mockResolvedValue({ authenticated: false });
  await render(<AuthProvider>{ui}</AuthProvider>);
}

describe("Integración — tienda", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("reemplaza la pestaña Entrena por Tienda para cliente y visitante", () => {
    expect(CLIENT_TABS.map((tab) => tab.label)).toEqual(["Inicio", "Servicios", "Tienda", "Cuenta"]);
  });

  it("muestra el catálogo con categoría, nombre, precio y agotados", async () => {
    jest.mocked(getProducts).mockResolvedValue([creatine, shirt]);
    await renderAsGuest(<StoreView />);

    expect(await screen.findByText("Creatina monohidratada 300 g")).toBeOnTheScreen();
    expect(screen.getByText("$549.00")).toBeOnTheScreen();
    expect(screen.getByText("SUPLEMENTOS")).toBeOnTheScreen();
    expect(screen.getByText("AGOTADO")).toBeOnTheScreen();
  });

  it("filtra por categoría y por búsqueda", async () => {
    jest.mocked(getProducts).mockResolvedValue([creatine, shirt]);
    await renderAsGuest(<StoreView />);
    const user = userEvent.setup();

    await user.press(await screen.findByRole("button", { name: "Ropa deportiva" }));
    expect(screen.queryByText("Creatina monohidratada 300 g")).toBeNull();
    expect(screen.getByText("Playera Block Party Negro")).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Todos" }));
    await user.type(screen.getByLabelText("Buscar productos"), "optimum");
    expect(screen.getByText("Creatina monohidratada 300 g")).toBeOnTheScreen();
    expect(screen.queryByText("Playera Block Party Negro")).toBeNull();

    await user.clear(screen.getByLabelText("Buscar productos"));
    await user.type(screen.getByLabelText("Buscar productos"), "bicicleta");
    expect(screen.getByText("No encontramos productos con esa búsqueda.")).toBeOnTheScreen();
  });

  it("abre el detalle del producto seleccionado", async () => {
    jest.mocked(getProducts).mockResolvedValue([creatine]);
    await renderAsGuest(<StoreView />);

    await userEvent
      .setup()
      .press(await screen.findByRole("button", { name: "Creatina monohidratada 300 g, $549.00" }));

    expect(router.push).toHaveBeenCalledWith({ pathname: "/store/[id]", params: { id: "138" } });
  });

  it("muestra el error con opción de reintentar", async () => {
    jest
      .mocked(getProducts)
      .mockRejectedValueOnce(new TypeError("Network request failed"))
      .mockResolvedValueOnce([creatine]);
    await renderAsGuest(<StoreView />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/No fue posible conectar/);
    await userEvent.setup().press(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("Creatina monohidratada 300 g")).toBeOnTheScreen();
  });

  it("muestra el skeleton si la carga tarda más de 300 ms", async () => {
    jest.mocked(getProducts).mockReturnValue(new Promise(() => undefined));
    await renderAsGuest(<StoreView />);

    expect(screen.queryByLabelText("Cargando productos")).toBeNull();
    expect(
      await screen.findByLabelText("Cargando productos", {}, { timeout: 2000 }),
    ).toBeOnTheScreen();
    expect(screen.getByText("TIENDA TITANIUM")).toBeOnTheScreen();
  });
});

describe("Integración — detalle de producto", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("muestra precio, disponibilidad, especificaciones y características", async () => {
    jest.mocked(getProduct).mockResolvedValue(shirt);
    await renderAsGuest(<ProductDetailView productId="101" />);

    expect(await screen.findByText("Playera Block Party Negro")).toBeOnTheScreen();
    expect(screen.getByText("$599.00")).toBeOnTheScreen();
    expect(screen.getByText("Agotado")).toBeOnTheScreen();
    expect(screen.getByText("Talla")).toBeOnTheScreen();
    expect(screen.getByText("Corte ajustado")).toBeOnTheScreen();
    expect(getProduct).toHaveBeenCalledWith(101);
  });

  it("no consulta la API cuando el id no es válido", async () => {
    await renderAsGuest(<ProductDetailView productId="1.5" />);

    expect(await screen.findByRole("alert")).toHaveTextContent("No encontramos este producto.");
    expect(getProduct).not.toHaveBeenCalled();
  });

  it("indica que el producto no existe cuando la API responde 404", async () => {
    jest.mocked(getProduct).mockRejectedValue(new ApiError("Producto no encontrado", 404));
    await renderAsGuest(<ProductDetailView productId="999999" />);

    expect(await screen.findByRole("alert")).toHaveTextContent("No encontramos este producto.");
  });
});
