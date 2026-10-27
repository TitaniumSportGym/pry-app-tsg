import { isValidOtp, normalizeOtp, validateEmail } from "./auth-validation";

describe("auth validation model", () => {
  it("normalizes a valid email", () => {
    expect(validateEmail("  Usuario@Correo.COM ")).toEqual({
      email: "usuario@correo.com",
    });
  });

  it("reports empty and malformed emails", () => {
    expect(validateEmail(" ").error).toBe("Ingresa tu correo electrónico.");
    expect(validateEmail("correo-invalido").error).toBe(
      "Ingresa un correo electrónico válido.",
    );
  });

  it("normalizes and validates six-digit codes", () => {
    expect(normalizeOtp("01a23-4567")).toBe("012345");
    expect(isValidOtp("012345")).toBe(true);
    expect(isValidOtp("12345")).toBe(false);
  });
});
