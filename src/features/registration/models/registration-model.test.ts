import { validateRegistration } from "./registration-model";

describe("registration model", () => {
  it("normalizes valid registration data", () => {
    expect(
      validateRegistration(" Usuario@Correo.COM ", "Titanium1!", "Titanium1!", true),
    ).toEqual({
      email: "usuario@correo.com",
      errors: {},
    });
  });

  it("reports invalid fields without calling the API", () => {
    expect(
      validateRegistration("correo", "simple", "diferente", true).errors,
    ).toEqual({
      email: "Ingresa un correo electrónico válido.",
      password: "La contraseña todavía no cumple todos los requisitos.",
      confirmPassword: "Las contraseñas no coinciden.",
    });
  });

  it('rechaza un registro válido sin aceptación explícita', () => {
    expect(validateRegistration('usuario@correo.com', 'Titanium1!', 'Titanium1!', false).errors).toEqual({
      privacyAccepted: 'Debes aceptar el Aviso de Privacidad para crear tu cuenta.',
    });
  });

  it('marca los campos vacíos y el consentimiento faltante', () => {
    expect(validateRegistration('', '', '', false).errors).toEqual({
      email: 'Ingresa tu correo electrónico.',
      password: 'Ingresa una contraseña.',
      confirmPassword: 'Confirma tu contraseña.',
      privacyAccepted: 'Debes aceptar el Aviso de Privacidad para crear tu cuenta.',
    });
  });
});
