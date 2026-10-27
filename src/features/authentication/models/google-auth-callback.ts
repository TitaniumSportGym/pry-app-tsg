export class GoogleAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleAuthError";
  }
}

export function getTokenFromGoogleCallback(url: string) {
  const callbackUrl = new URL(url);
  const isExpectedCallback =
    callbackUrl.protocol === "pryapptsg:" &&
    callbackUrl.hostname === "oauth-callback";

  if (!isExpectedCallback) {
    throw new GoogleAuthError(
      "Google devolvió una respuesta que no pertenece a esta aplicación.",
    );
  }

  if (callbackUrl.searchParams.has("error")) {
    throw new GoogleAuthError("Google no pudo autorizar el inicio de sesión.");
  }

  const token = callbackUrl.searchParams.get("token");
  if (!token) {
    throw new GoogleAuthError(
      "El servidor no devolvió una sesión válida de Google.",
    );
  }

  return token;
}
