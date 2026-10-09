import { apiRequest } from '@/services/apiClient';

interface MessageResponse {
  message: string;
}

interface ResetPasswordRequest {
  email: string;
  otp: string;
  newPassword: string;
}

export function requestPasswordReset(email: string) {
  return apiRequest<MessageResponse>('/api/auth/forgot-password', {
    method: 'POST',
    body: { email },
    auth: false,
  });
}

export function verifyPasswordResetCode(email: string, otp: string) {
  return apiRequest<MessageResponse>('/api/auth/verify-reset-otp', {
    method: 'POST',
    body: { email, otp },
    auth: false,
  });
}

export function resetPassword(body: ResetPasswordRequest) {
  return apiRequest<MessageResponse>('/api/auth/reset-password', {
    method: 'POST',
    body,
    auth: false,
  });
}
