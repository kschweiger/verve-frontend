import { afterEach, expect, test } from 'bun:test';
import { createPinia, setActivePinia } from 'pinia';
import { useUserStore } from '../../src/stores/auth';
import {
  ApiResponseError,
  getAuthHeaders,
  getJsonAuthHeaders,
  responseError,
} from '../../src/services/authHeaders';

const storage = globalThis.localStorage;
afterEach(() => {
  globalThis.localStorage = storage;
});
test('authenticated headers share the missing-token guard and keep JSON optional for file uploads', () => {
  globalThis.localStorage = {
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
    clear: () => undefined,
    key: () => null,
    length: 0,
  };
  setActivePinia(createPinia());
  expect(() => getAuthHeaders()).toThrow('Not authenticated.');
  expect(() => getJsonAuthHeaders()).toThrow('Not authenticated.');
  useUserStore().setToken('test-token');
  expect(getAuthHeaders()).toEqual({ Authorization: 'Bearer test-token' });
  expect(getJsonAuthHeaders()).toEqual({
    Authorization: 'Bearer test-token',
    'Content-Type': 'application/json',
  });
});
test.each([
  [Response.json({ detail: 'Cannot save.' }, { status: 409 }), 'Cannot save.', 409],
  [
    Response.json({ detail: [{ msg: 'Target is required.' }] }, { status: 422 }),
    'Target is required.',
    422,
  ],
  [new Response('upstream unavailable', { status: 503 }), 'Fallback', 503],
] as const)(
  'HTTP errors retain status and actionable details (%#)',
  async (response, message, status) => {
    const error = await responseError(response, 'Fallback');
    expect(error).toBeInstanceOf(ApiResponseError);
    expect(error.message).toBe(message);
    expect(error.status).toBe(status);
  }
);
