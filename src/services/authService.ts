import type { ConsentAcceptance } from '@/features/privacy/models/arco-contracts';

import {
    ApiError,
    type AuthResult,
    type LoginResponse,
    type RegisterRequest,
    type RegisterResponse,
    type ResendVerificationOtpRequest,
    type ResendVerificationOtpResponse,
    type UserProfileResponse,
    type VerifyAccountOtpRequest,
    type VerifyAccountOtpResponse,
} from "../types/auth";
import { apiRequest, shouldInvalidateSession } from "./apiClient";
import {
    getAccessToken,
    invalidateAccessToken,
    removeAccessToken,
    saveAccessToken,
} from "./sessionService";

export async function registerMobile(
  email: string,
  password: string,
  privacyConsent?: ConsentAcceptance,
): Promise<RegisterResponse> {
  const body: RegisterRequest = { email, password, client: "mobile", ...(privacyConsent ? { privacyConsent } : {}) };

  let receivedStatus = 0;
  const response = await apiRequest<RegisterResponse>("/api/auth/register", {
    method: "POST",
    body,
    auth: false,
    ...(privacyConsent ? { onResponse: (metadata: { status: number }) => { receivedStatus = metadata.status; } } : {}),
  });
  if (privacyConsent && receivedStatus !== 201) {
    throw new ApiError("No se confirmó el registro con evidencia de consentimiento.", 502, undefined, "INVALID_ARCO_RESPONSE");
  }
  return response;
}

export async function verifyAccountOtp(
  email: string,
  otp: string,
): Promise<VerifyAccountOtpResponse> {
  const body: VerifyAccountOtpRequest = { email, otp };

  return apiRequest<VerifyAccountOtpResponse>("/api/auth/verify-account-otp", {
    method: "POST",
    body,
    auth: false,
  });
}

export async function resendVerificationOtp(
  email: string,
): Promise<ResendVerificationOtpResponse> {
  const body: ResendVerificationOtpRequest = { email };

  return apiRequest<ResendVerificationOtpResponse>(
    "/api/auth/resend-verification-otp",
    {
      method: "POST",
      body,
      auth: false,
    },
  );
}

export async function login(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const response = await apiRequest<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: { email, password },
    auth: false,
  });

  if (response.twoFactorRequired !== true && response.accessToken) {
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
    await invalidateAccessToken(null);
    return;
  }

  try {
    await apiRequest("/api/auth/logout", {
      method: "POST",
      auth: true,
      expectedAccessToken: token,
    });
  } catch {
    // Ignore server-side auth failures; local session should still be cleared.
  } finally {
    await invalidateAccessToken(token);
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
        if (!error.sessionInvalidationHandled) await removeAccessToken();
        return { authenticated: false };
      }

      throw error;
    }

    throw error;
  }
}
