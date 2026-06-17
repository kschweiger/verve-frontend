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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const parseApiError = (value: unknown, fallback: string): string => {
  if (!isRecord(value)) return fallback;

  if (typeof value.detail === 'string') return value.detail;

  if (Array.isArray(value.detail)) {
    const firstMessage = value.detail.find(
      (item): item is { msg: string } => isRecord(item) && typeof item.msg === 'string'
    );
    return firstMessage?.msg ?? fallback;
  }

  return fallback;
};

const parseJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const parseForgotResponse = (value: unknown): PasswordForgotResult => {
  if (!isRecord(value) || typeof value.message !== 'string') {
    throw new Error('Invalid password reset response.');
  }

  const response: PasswordForgotApiResponse = {
    message: value.message,
    reset_link: typeof value.reset_link === 'string' ? value.reset_link : null,
  };

  return {
    message: response.message,
    resetLink: response.reset_link ?? null,
  };
};

export async function requestPasswordReset(email: string): Promise<PasswordForgotResult> {
  const payload: PasswordForgotPayload = { email };
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/login/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await parseJson(response);

  if (!response.ok) {
    throw new Error(parseApiError(data, 'Failed to request password reset.'));
  }

  return parseForgotResponse(data);
}

export async function resetPassword(payload: PasswordResetPayload): Promise<void> {
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/login/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(parseApiError(await parseJson(response), 'Failed to reset password.'));
  }
}
