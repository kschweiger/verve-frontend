import { responseError } from './authHeaders';

export interface PasswordForgotPayload {
  email: string;
}

export interface PasswordForgotResult {
  message: string;
  resetLink: string | null;
}

export interface PasswordResetPayload {
  token: string;
  new_password: string;
}

interface PasswordForgotApiResponse {
  message: string;
  reset_link?: string | null;
}

export async function requestPasswordReset(email: string): Promise<PasswordForgotResult> {
  const payload: PasswordForgotPayload = { email };
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/login/forgot_password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw await responseError(response, 'Failed to request password reset.');
  const data: PasswordForgotApiResponse = await response.json();
  return { message: data.message, resetLink: data.reset_link ?? null };
}

export async function resetPassword(payload: PasswordResetPayload): Promise<void> {
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/login/reset_password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await responseError(response, 'Failed to reset password.');
  }
}
