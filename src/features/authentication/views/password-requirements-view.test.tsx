import { render, screen } from "@testing-library/react-native";

import { PasswordRequirementsView } from "@/features/authentication/views/password-requirements-view";

describe("PasswordRequirementsView", () => {
  it("marca todos los requisitos como pendientes con una contraseña vacía", async () => {
    const result = await render(<PasswordRequirementsView password="" />);

    expect(screen.getAllByLabelText(/: pendiente$/)).toHaveLength(5);
    expect(screen.queryAllByLabelText(/: cumplido$/)).toHaveLength(0);
    expect(result.toJSON()).toMatchSnapshot();
  });

  it("marca solo los requisitos que cumple la contraseña", async () => {
    const result = await render(<PasswordRequirementsView password="abcdefgh" />);

    expect(screen.getByLabelText("Al menos 8 caracteres: cumplido")).toBeOnTheScreen();
    expect(screen.getByLabelText("Incluye una letra minúscula: cumplido")).toBeOnTheScreen();
    expect(screen.getByLabelText("Incluye una letra mayúscula: pendiente")).toBeOnTheScreen();
    expect(screen.getByLabelText("Incluye un número: pendiente")).toBeOnTheScreen();
    expect(screen.getByLabelText("Incluye un símbolo: pendiente")).toBeOnTheScreen();
    expect(result.toJSON()).toMatchSnapshot();
  });

  it("marca todos los requisitos como cumplidos con una contraseña segura", async () => {
    const result = await render(<PasswordRequirementsView password="Password123!" />);

    expect(screen.getAllByLabelText(/: cumplido$/)).toHaveLength(5);
    expect(result.toJSON()).toMatchSnapshot();
  });

  it("actualiza los requisitos al escribir y borrar la contraseña", async () => {
    const result = await render(<PasswordRequirementsView password="Password123!" />);
    await result.rerender(<PasswordRequirementsView password="" />);
    expect(screen.getAllByLabelText(/: pendiente$/)).toHaveLength(5);
    expect(screen.queryAllByLabelText(/: cumplido$/)).toHaveLength(0);
    await result.rerender(<PasswordRequirementsView password="Password123!" />);
    expect(screen.getAllByLabelText(/: cumplido$/)).toHaveLength(5);
    expect(screen.queryAllByLabelText(/: pendiente$/)).toHaveLength(0);
  });

  it("mantiene estados independientes en dos instancias", async () => {
    const result = await render(<>
      <PasswordRequirementsView password="Password123!" />
      <PasswordRequirementsView password="" />
    </>);
    expect(screen.getAllByLabelText(/: cumplido$/)).toHaveLength(5);
    expect(screen.getAllByLabelText(/: pendiente$/)).toHaveLength(5);
    await result.rerender(<>
      <PasswordRequirementsView password="" />
      <PasswordRequirementsView password="Password123!" />
    </>);
    expect(screen.getAllByLabelText(/: cumplido$/)).toHaveLength(5);
    expect(screen.getAllByLabelText(/: pendiente$/)).toHaveLength(5);
  });
});
