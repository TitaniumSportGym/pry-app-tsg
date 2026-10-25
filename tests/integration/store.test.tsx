import { render, screen, userEvent } from "@testing-library/react-native";
import { router } from "expo-router";
import type { ReactElement } from "react";

import { CartView } from "../../src/features/cart/views/cart-view";
import { CLIENT_TABS } from "../../src/features/navigation/models/role-tabs";
import { getProduct, getProducts } from "../../src/features/store/api/products-api";
import type { Product } from "../../src/features/store/models/product";
import { CatalogView } from "../../src/features/store/views/catalog-view";
import { ProductDetailView } from "../../src/features/store/views/product-detail-view";
import { StoreView } from "../../src/features/store/views/store-view";
import { AuthProvider } from "../../src/providers/auth-provider";
import { CartProvider } from "../../src/providers/cart-provider";
import { restoreSession } from "../../src/services/authService";
import { ApiError } from "../../src/types/auth";

jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    navigate: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(),
  },
}));

// Plain functions (not jest.fn) so resetAllMocks does not clear the insets.
jest.mock("react-native-safe-area-context", () => ({
  ...require("react-native-safe-area-context/jest/mock").default,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
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

// Jest cannot measure on-screen positions, so the "fly to cart" animation is
// skipped the same way it is for users with "reduce motion" enabled.
jest.mock("../../src/hooks/use-reduce-motion", () => ({ useReduceMotion: () => true }));

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
  stock: 2,
  imageUrls: ["https://res.cloudinary.com/demo/creatine.jpg"],
  description: "Creatina monohidratada micronizada",
  features: [],
  createdAt: new Date("2026-07-22T04:07:30.295Z"),
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
  createdAt: new Date("2026-08-01T00:00:00.000Z"),
  specs: [{ label: "Talla", value: "M" }],
};

async function renderWithSession(ui: ReactElement, rol?: string) {
  jest.mocked(restoreSession).mockResolvedValue(
    rol
      ? { authenticated: true, user: { id: "1", email: "cliente@correo.com", rol } }
      : { authenticated: false },
  );
  await render(
    <AuthProvider>
      <CartProvider>{ui}</CartProvider>
    </AuthProvider>,
  );
}

const renderAsGuest = (ui: ReactElement) => renderWithSession(ui);
const renderAsClient = (ui: ReactElement) => renderWithSession(ui, "cliente");

describe("Integración — tienda (pantalla 09)", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(getProducts).mockResolvedValue([creatine, shirt]);
  });

  it("pone el Carrito al centro de las pestañas de cliente y visitante", () => {
    expect(CLIENT_TABS.map((tab) => tab.label)).toEqual([
      "Inicio",
      "Tienda",
      "Carrito",
      "Membresías",
      "Más",
    ]);
  });

  it("muestra categorías con su número de productos y los nuevos con existencias", async () => {
    await renderAsGuest(<StoreView />);

    expect(await screen.findByRole("button", { name: "Suplementos, 1 productos" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Ropa deportiva, 1 productos" })).toBeOnTheScreen();
    expect(screen.getByText("Nuevos")).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Creatina monohidratada 300 g, $549.00" }),
    ).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: /Playera Block Party Negro/ })).toBeNull();
  });

  it("no muestra promociones ni ofertas", async () => {
    await renderAsGuest(<StoreView />);

    await screen.findByText("Nuevos");
    expect(screen.queryByText(/oferta/i)).toBeNull();
    expect(screen.queryByText(/%/)).toBeNull();
  });

  it("abre el catálogo de una categoría o con la búsqueda", async () => {
    await renderAsGuest(<StoreView />);
    const user = userEvent.setup();

    await user.press(await screen.findByRole("button", { name: "Suplementos, 1 productos" }));
    expect(router.push).toHaveBeenCalledWith({
      pathname: "/store/catalog",
      params: { category: "2" },
    });

    await user.type(screen.getByLabelText("Buscar"), "creatina", { submitEditing: true });
    expect(router.push).toHaveBeenCalledWith({
      pathname: "/store/catalog",
      params: { q: "creatina" },
    });
  });
});

describe("Integración — catálogo (pantalla 10)", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(getProducts).mockResolvedValue([creatine, shirt]);
  });

  it("abre filtrado por la categoría recibida y permite cambiarla", async () => {
    await renderAsGuest(<CatalogView category="2" />);
    const user = userEvent.setup();

    expect(await screen.findByText("SUPLEMENTOS")).toBeOnTheScreen();
    expect(screen.queryByText("Playera Block Party Negro")).toBeNull();

    await user.press(screen.getByRole("button", { name: "Todos" }));
    expect(screen.getByText("CATÁLOGO")).toBeOnTheScreen();
    expect(screen.getByText("AGOTADO")).toBeOnTheScreen();
  });

  it("ignora una categoría inválida y aplica la búsqueda recibida", async () => {
    await renderAsGuest(<CatalogView category="abc" query="optimum" />);

    expect(await screen.findByText("CATÁLOGO")).toBeOnTheScreen();
    expect(screen.getByText("Creatina monohidratada 300 g")).toBeOnTheScreen();
    expect(screen.queryByText("Playera Block Party Negro")).toBeNull();
  });

  it("abre el detalle del producto", async () => {
    await renderAsGuest(<CatalogView />);

    await userEvent
      .setup()
      .press(await screen.findByRole("button", { name: "Creatina monohidratada 300 g, $549.00" }));

    expect(router.push).toHaveBeenCalledWith({ pathname: "/store/[id]", params: { id: "138" } });
  });
});

describe("Integración — detalle y carrito (pantallas 11 y 12)", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("muestra precio, disponibilidad y especificaciones del producto", async () => {
    jest.mocked(getProduct).mockResolvedValue(creatine);
    await renderAsGuest(<ProductDetailView productId="138" />);

    expect(await screen.findByText("Creatina monohidratada 300 g")).toBeOnTheScreen();
    expect(screen.getByText("$549.00")).toBeOnTheScreen();
    expect(screen.getByText("Últimas 2 piezas")).toBeOnTheScreen();
    expect(screen.getByText("Sabor: Sin sabor")).toBeOnTheScreen();
    expect(getProduct).toHaveBeenCalledWith(138);
  });

  it("agrega al carrito hasta el límite de existencias y lo refleja en el carrito", async () => {
    jest.mocked(getProduct).mockResolvedValue(creatine);
    await renderAsClient(
      <>
        <ProductDetailView productId="138" />
        <CartView />
      </>,
    );
    const user = userEvent.setup();
    const increase = "Agregar una unidad de Creatina monohidratada 300 g";

    await user.press(await screen.findByRole("button", { name: "AGREGAR" }));
    expect(screen.getByText("AGREGADO")).toBeOnTheScreen();
    expect(screen.getByText("Tienes 1 en tu carrito.")).toBeOnTheScreen();
    expect(screen.getByText("Total (1 producto)")).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: increase }));
    expect(screen.getByText("Total (2 productos)")).toBeOnTheScreen();
    expect(screen.getAllByText("$1,098.00").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: increase })).toBeDisabled();
    expect(screen.getByText("Tienes 2 en tu carrito, el máximo disponible.")).toBeOnTheScreen();

    await user.press(
      screen.getByRole("button", { name: "Quitar Creatina monohidratada 300 g del carrito" }),
    );
    expect(screen.getByText("Tu carrito está vacío")).toBeOnTheScreen();
  });

  it("comprar agrega el producto y lleva al carrito", async () => {
    jest.mocked(getProduct).mockResolvedValue(creatine);
    await renderAsClient(<ProductDetailView productId="138" />);

    await userEvent.setup().press(await screen.findByRole("button", { name: "COMPRAR" }));

    expect(router.navigate).toHaveBeenCalledWith("/cart");
    expect(screen.getByText("Tienes 1 en tu carrito.")).toBeOnTheScreen();
  });

  it("pide iniciar sesión al visitante antes de agregar o comprar", async () => {
    jest.mocked(getProduct).mockResolvedValue(creatine);
    await renderAsGuest(<ProductDetailView productId="138" />);
    const user = userEvent.setup();

    expect(
      await screen.findByText("Inicia sesión para agregar productos a tu carrito."),
    ).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "AGREGAR" }));
    await user.press(screen.getByRole("button", { name: "COMPRAR" }));

    expect(router.push).toHaveBeenNthCalledWith(1, "/login");
    expect(router.push).toHaveBeenNthCalledWith(2, "/login");
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it("muestra al visitante el acceso en lugar del carrito", async () => {
    await renderAsGuest(<CartView />);
    const user = userEvent.setup();

    expect(await screen.findByText("Inicia sesión para usar tu carrito")).toBeOnTheScreen();
    expect(screen.queryByText("Tu carrito está vacío")).toBeNull();

    await user.press(screen.getByRole("button", { name: "Iniciar sesión" }));
    expect(router.push).toHaveBeenCalledWith("/login");
  });

  it("no permite agregar ni comprar un producto agotado", async () => {
    jest.mocked(getProduct).mockResolvedValue(shirt);
    await renderAsGuest(<ProductDetailView productId="101" />);

    expect(await screen.findByRole("button", { name: "AGOTADO" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "COMPRAR" })).toBeDisabled();
  });

  it("deja el pago como próximamente", async () => {
    jest.mocked(getProduct).mockResolvedValue(creatine);
    await renderAsClient(
      <>
        <ProductDetailView productId="138" />
        <CartView />
      </>,
    );

    await userEvent.setup().press(await screen.findByRole("button", { name: "AGREGAR" }));

    expect(screen.getByLabelText("Pagar, próximamente")).toBeOnTheScreen();
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
