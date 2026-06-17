import { afterEach, describe, expect, mock, test } from 'bun:test';
import { requestPasswordReset, resetPassword } from '../../src/services/passwordReset';

const originalFetch = globalThis.fetch;

const jsonResponse = (body: unknown, init?: ResponseInit): Response =>
  new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('password reset service', () => {
  test('posts the forgot-password email and parses reset_link', async () => {
    const fetchMock = mock(async () =>
      jsonResponse({
        message: 'Reset link generated.',
        reset_link: '/reset-password?token=abc',
      })
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const result = await requestPasswordReset('user@example.com');

    expect(fetchMock).toHaveBeenCalledWith(
      `${import.meta.env.VITE_API_BASE_URL}/login/forgot-password`,
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'user@example.com' }),
      })
    );
    expect(result).toEqual({
      message: 'Reset link generated.',
      resetLink: '/reset-password?token=abc',
    });
  });

  test('returns null resetLink when reset_link is missing or null', async () => {
    const missingFetchMock = mock(async () => jsonResponse({ message: 'Email sent.' }));
    globalThis.fetch = missingFetchMock as typeof fetch;

    await expect(requestPasswordReset('user@example.com')).resolves.toEqual({
      message: 'Email sent.',
      resetLink: null,
    });

    const nullFetchMock = mock(async () => jsonResponse({ message: 'Email sent.', reset_link: null }));
    globalThis.fetch = nullFetchMock as typeof fetch;

    await expect(requestPasswordReset('user@example.com')).resolves.toEqual({
      message: 'Email sent.',
      resetLink: null,
    });
  });

  test('posts the reset-password payload', async () => {
    const fetchMock = mock(async () => jsonResponse({}));
    globalThis.fetch = fetchMock as typeof fetch;

    await resetPassword({ token: 'abc', new_password: 'newpassword123' });

    expect(fetchMock).toHaveBeenCalledWith(
      `${import.meta.env.VITE_API_BASE_URL}/login/reset-password`,
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'abc', new_password: 'newpassword123' }),
      })
    );
  });

  test('throws the first FastAPI validation message on non-OK responses', async () => {
    const fetchMock = mock(async () =>
      jsonResponse(
        {
          detail: [
            {
              loc: ['body', 'new_password'],
              msg: 'String should have at least 8 characters',
              type: 'string_too_short',
            },
          ],
        },
        { status: 422 }
      )
    );
    globalThis.fetch = fetchMock as typeof fetch;

    await expect(resetPassword({ token: 'abc', new_password: 'short' })).rejects.toThrow(
      'String should have at least 8 characters'
    );
  });
});
