import { apiRequest } from '../../../services/apiClient';
import {
  requestPasswordReset,
  resetPassword,
  verifyPasswordResetCode,
} from './password-recovery-api';

jest.mock('../../../services/apiClient', () => ({
  apiRequest: jest.fn(),
}));

const apiRequestMock = jest.mocked(apiRequest);

describe('password recovery API', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    apiRequestMock.mockResolvedValue({ message: 'ok' });
  });

  it('requests a recovery code without authentication', async () => {
    await requestPasswordReset('usuario@correo.com');

    expect(apiRequestMock).toHaveBeenCalledWith('/api/auth/forgot-password', {
      method: 'POST',
      body: { email: 'usuario@correo.com' },
      auth: false,
    });
  });

  it('verifies the recovery code as a string', async () => {
    await verifyPasswordResetCode('usuario@correo.com', '012345');

    expect(apiRequestMock).toHaveBeenCalledWith('/api/auth/verify-reset-otp', {
      method: 'POST',
      body: { email: 'usuario@correo.com', otp: '012345' },
      auth: false,
    });
  });

  it('sends the verified code with the new password', async () => {
    await resetPassword({
      email: 'usuario@correo.com',
      otp: '012345',
      newPassword: 'Titanium1!',
    });

    expect(apiRequestMock).toHaveBeenCalledWith('/api/auth/reset-password', {
      method: 'POST',
      body: {
        email: 'usuario@correo.com',
        otp: '012345',
        newPassword: 'Titanium1!',
      },
      auth: false,
    });
  });
});
