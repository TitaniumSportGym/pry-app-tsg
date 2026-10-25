import { render, screen, userEvent } from "@testing-library/react-native";
import { Pressable, Text } from "react-native";

import { getCartCount } from "../../src/features/cart/models/cart";
import { useAuth } from "../../src/hooks/use-auth";
import { useCart } from "../../src/hooks/use-cart";
import { AuthProvider } from "../../src/providers/auth-provider";
import { CartProvider } from "../../src/providers/cart-provider";
import { restoreSession } from "../../src/services/authService";

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

function CartProbe() {
  const cart = useCart();
  const { status, signOut } = useAuth();

  return (
    <>
      <Text>{`estado: ${status}`}</Text>
      <Text>{`piezas: ${getCartCount(cart.items)}`}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() =>
          cart.add({ productId: 1, name: "Creatina", price: 549, imageUrl: null, detail: "", stock: 5 })
        }
      >
        <Text>Agregar</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => void signOut()}>
        <Text>Salir</Text>
      </Pressable>
    </>
  );
}

describe("Integración — carrito y sesión", () => {
  it("vacía el carrito al cerrar la sesión", async () => {
    jest.mocked(restoreSession).mockResolvedValue({
      authenticated: true,
      user: { id: "1", email: "cliente@correo.com", rol: "cliente" },
    });
    await render(
      <AuthProvider>
        <CartProvider>
          <CartProbe />
        </CartProvider>
      </AuthProvider>,
    );
    const user = userEvent.setup();

    expect(await screen.findByText("estado: authenticated")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Agregar" }));
    expect(screen.getByText("piezas: 1")).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Salir" }));

    expect(await screen.findByText("estado: unauthenticated")).toBeOnTheScreen();
    expect(screen.getByText("piezas: 0")).toBeOnTheScreen();
  });
});
