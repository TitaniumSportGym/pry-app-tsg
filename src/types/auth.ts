export interface UserSession {
  id: string;
  email: string;
  rol: string;
  mustChangePassword?: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export type AuthMethod = "otp" | "totp" | "confirm-link" | string;

export interface LoginResponse {
  message?: string;
  accessToken?: string;
  user?: UserSession;
  twoFactorRequired?: boolean;
  method?: AuthMethod;
}

export interface VerifyOtpRequest {
  email: string;
  otp: string;
}

export interface UserProfileResponse extends UserSession {
  authMethod?: string;
  provider?: string;
  loginMethod?: string;
}

export interface AuthResult {
  authenticated: boolean;
  user?: UserProfileResponse | UserSession;
  requiresTwoFactor?: boolean;
  method?: AuthMethod;
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly data?: unknown;
  public readonly code?: string;

  constructor(message: string, status: number, data?: unknown, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
    this.code = code;
  }
}
