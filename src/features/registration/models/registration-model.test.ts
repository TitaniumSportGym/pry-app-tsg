import { validateRegistration } from "./registration-model";

describe("registration model", () => {
  it("normalizes valid registration data", () => {
    expect(
      validateRegistration(" Usuario@Correo.COM ", "Titanium1!", "Titanium1!"),
    ).toEqual({
      email: "usuario@correo.com",
      errors: {},
    });
  });

  it("reports invalid fields without calling the API", () => {
    expect(
      validateRegistration("correo", "simple", "diferente").errors,
    ).toEqual({
      email: "Ingresa un correo electrónico válido.",
      password: "La contraseña todavía no cumple todos los requisitos.",
      confirmPassword: "Las contraseñas no coinciden.",
    });
  });
});
