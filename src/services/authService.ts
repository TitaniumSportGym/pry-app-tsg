import {
    ApiError,
    type AuthResult,
    type LoginResponse,
    type UserProfileResponse,
} from "../types/auth";
import { apiRequest, shouldInvalidateSession } from "./apiClient";
import {
    getAccessToken,
    removeAccessToken,
    saveAccessToken,
} from "./sessionService";

export async function login(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const response = await apiRequest<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: { email, password },
    auth: false,
  });

  if (response.twoFactorRequired === true) {
    return response;
  }

  if (response.accessToken) {
    await saveAccessToken(response.accessToken);
  }

  return response;
}

export async function verifyOtp(
  email: string,
  otp: string,
): Promise<LoginResponse> {
  const response = await apiRequest<LoginResponse>("/api/auth/verify-otp", {
    method: "POST",
    body: { email, otp },
    auth: false,
  });

  if (response.accessToken) {
    await saveAccessToken(response.accessToken);
  }

  return response;
}

export async function logout(): Promise<void> {
  const token = await getAccessToken();

  if (!token) {
    await removeAccessToken();
    return;
  }

  try {
    await apiRequest("/api/auth/logout", {
      method: "POST",
      auth: true,
    });
  } catch {
    // Ignore server-side auth failures; local session should still be cleared.
  } finally {
    await removeAccessToken();
  }
}

export async function getCurrentUser(): Promise<UserProfileResponse> {
  return apiRequest<UserProfileResponse>("/api/user/profile", {
    method: "GET",
    auth: true,
  });
}

export async function restoreSession(): Promise<AuthResult> {
  const token = await getAccessToken();

  if (!token) {
    return { authenticated: false };
  }

  try {
    const user = await getCurrentUser();
    return { authenticated: true, user };
  } catch (error) {
    if (error instanceof ApiError) {
      if (shouldInvalidateSession(error.status, error.data)) {
        await removeAccessToken();
        return { authenticated: false };
      }

      throw error;
    }

    throw error;
  }
}
