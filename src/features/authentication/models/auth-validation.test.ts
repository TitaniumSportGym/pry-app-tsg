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

  it.each([
    "a@b.c", "user+tag@sub.example.com", "a..b@c.d", "a@b@c.d", "@a@b.c", "a@.b.c",
  ])("preserves the existing accepted email format: %s", (email) => {
    expect(validateEmail(email)).toEqual({ email });
  });

  it.each([
    "@b.c", "a@.c", "a@b.", "a.b", "a@b", "a b@c.d", "a@b\tc.d", "a@b\nc.d", "a@b\u00a0c.d",
  ])("rejects malformed emails: %j", (email) => {
    expect(validateEmail(email).error).toBe("Ingresa un correo electrónico válido.");
  });

  it("handles long emails without repeated backtracking", () => {
    const local = "a".repeat(100_000);
    expect(validateEmail(`${local}@example.com`)).toEqual({ email: `${local}@example.com` });
    expect(validateEmail(`${local}${"@".repeat(100_000)}`).error).toBeDefined();
    expect(validateEmail(`a@${"b.".repeat(50_000)}`).error).toBeDefined();
  });

  it("preserves OTP normalization, length and ASCII digit validation", () => {
    expect(normalizeOtp("a".repeat(100_000) + "001234567")).toBe("001234");
    expect(normalizeOtp("")).toBe("");
    expect(normalizeOtp("01-23-45", 4)).toBe("0123");
    expect(isValidOtp("0123", 4)).toBe(true);
    expect(isValidOtp("1234567")).toBe(false);
    expect(isValidOtp("１２３４５６")).toBe(false);
    expect(isValidOtp("12345a")).toBe(false);
    expect(isValidOtp("123\n456")).toBe(false);
    expect(isValidOtp("1".repeat(100_000))).toBe(false);
  });
});
