import { ApiError } from "@/types/auth";

import {
  FORBIDDEN_MESSAGE,
  getAccessErrorMessage,
  NETWORK_ERROR_MESSAGE,
  SERVER_ERROR_MESSAGE,
  SESSION_EXPIRED_MESSAGE,
} from "./access-errors";

describe("getAccessErrorMessage", () => {
  const notFound = "Rutina no encontrada.";

  it("distingue sesión expirada, falta de permisos y recurso inexistente", () => {
    expect(getAccessErrorMessage(new ApiError("x", 401), notFound)).toBe(SESSION_EXPIRED_MESSAGE);
    expect(getAccessErrorMessage(new ApiError("x", 403), notFound)).toBe(FORBIDDEN_MESSAGE);
    expect(getAccessErrorMessage(new ApiError("x", 404), notFound)).toBe(notFound);
  });

  it("no muestra los detalles internos de un error del servidor", () => {
    const error = new ApiError('invalid input syntax for type uuid: "abc"', 500);

    expect(getAccessErrorMessage(error, notFound)).toBe(SERVER_ERROR_MESSAGE);
  });

  it("trata cualquier otro fallo como un problema de conexión", () => {
    expect(getAccessErrorMessage(new TypeError("Network request failed"), notFound)).toBe(
      NETWORK_ERROR_MESSAGE,
    );
  });
});
