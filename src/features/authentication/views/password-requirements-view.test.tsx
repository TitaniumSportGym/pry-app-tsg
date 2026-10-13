import { render, screen } from "@testing-library/react-native";

import { PasswordRequirementsView } from "@/features/authentication/views/password-requirements-view";

describe("PasswordRequirementsView", () => {
  it("marca todos los requisitos como pendientes con una contraseña vacía", async () => {
    await render(<PasswordRequirementsView password="" />);

    expect(screen.getAllByLabelText(/: pendiente$/)).toHaveLength(5);
    expect(screen.queryAllByLabelText(/: cumplido$/)).toHaveLength(0);
  });

  it("marca solo los requisitos que cumple la contraseña", async () => {
    await render(<PasswordRequirementsView password="abcdefgh" />);

    expect(screen.getByLabelText("Al menos 8 caracteres: cumplido")).toBeOnTheScreen();
    expect(screen.getByLabelText("Incluye una letra minúscula: cumplido")).toBeOnTheScreen();
    expect(screen.getByLabelText("Incluye una letra mayúscula: pendiente")).toBeOnTheScreen();
    expect(screen.getByLabelText("Incluye un número: pendiente")).toBeOnTheScreen();
    expect(screen.getByLabelText("Incluye un símbolo: pendiente")).toBeOnTheScreen();
  });

  it("marca todos los requisitos como cumplidos con una contraseña segura", async () => {
    await render(<PasswordRequirementsView password="Password123!" />);

    expect(screen.getAllByLabelText(/: cumplido$/)).toHaveLength(5);
  });
});
