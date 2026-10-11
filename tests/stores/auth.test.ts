import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { createPinia, setActivePinia } from 'pinia';
import { useUserStore } from '../../src/stores/auth';

const originalFetch = globalThis.fetch;
const originalStorage = globalThis.localStorage;
const user = {
  id: '00000000-0000-4000-8000-000000000001', name: 'runner',
  email: 'runner@example.com', full_name: null, is_admin: true,
};
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });

beforeEach(() => {
  globalThis.localStorage = {
    getItem: (key: string) => key === 'auth_token' ? 'saved-token' : null,
    setItem: () => undefined, removeItem: () => undefined,
    clear: () => undefined, key: () => null, length: 1,
  };
  setActivePinia(createPinia());
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  globalThis.localStorage = originalStorage;
});

describe('account state', () => {
  test('restores admin status from the backend, sharing and caching requests', async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push({ url: input.toString(), init });
      return json(user);
    }) as typeof fetch;
    const store = useUserStore();
    expect(store.isAdmin).toBe(false);
    await Promise.all([store.ensureCurrentUser(), store.ensureCurrentUser()]);
    await store.ensureCurrentUser();
    expect(store.isAdmin).toBe(true);
    expect(store.currentUser?.id).toBe(user.id);
    expect(store.user_name).toBe('runner');
    expect(requests).toHaveLength(1);
    expect(requests[0]?.url.endsWith('/users/me')).toBe(true);
    expect(requests[0]?.init?.headers).toEqual({ Authorization: 'Bearer saved-token' });
  });

  test('allows non-admin accounts without showing admin access', async () => {
    globalThis.fetch = mock(async () => json({ ...user, is_admin: false })) as typeof fetch;
    const store = useUserStore();
    await store.ensureCurrentUser();
    expect(store.isAdmin).toBe(false);
    expect(store.currentUser?.name).toBe('runner');
  });

  test('clears account data on logout and rejects a late profile response', async () => {
    let resolve!: (response: Response) => void;
    globalThis.fetch = mock(() => new Promise<Response>(r => { resolve = r; })) as typeof fetch;
    const store = useUserStore();
    const request = store.ensureCurrentUser();
    store.logout();
    resolve(json(user));
    await expect(request).rejects.toThrow();
    expect(store.currentUser).toBeNull();
    expect(store.isAdmin).toBe(false);
    expect(store.user_name).toBeNull();
    expect(store.currentUserError).toBeNull();
  });

  test('does not let a failed old account request clear the new account', async () => {
    let resolve!: (response: Response) => void;
    globalThis.fetch = mock(() => new Promise<Response>(r => { resolve = r; })) as typeof fetch;
    const store = useUserStore();
    const oldRequest = store.ensureCurrentUser();
    store.setToken('new-token');
    globalThis.fetch = mock(async () => json({ ...user, is_admin: false })) as typeof fetch;
    await store.ensureCurrentUser();
    resolve(json({}, 401));
    await expect(oldRequest).rejects.toThrow();
    expect(store.token).toBe('new-token');
    expect(store.currentUser?.is_admin).toBe(false);
  });

  test('refreshes account privileges and can retry a failed load', async () => {
    const store = useUserStore();
    globalThis.fetch = mock(async () => json({}, 503)) as typeof fetch;
    await expect(store.ensureCurrentUser()).rejects.toThrow();
    globalThis.fetch = mock(async () => json(user)) as typeof fetch;
    await store.ensureCurrentUser();
    globalThis.fetch = mock(async () => json({ ...user, is_admin: false })) as typeof fetch;
    await store.ensureCurrentUser(true);
    expect(store.isAdmin).toBe(false);
    store.setToken('another-token');
    expect(store.currentUser).toBeNull();
    expect(store.isAdmin).toBe(false);
  });

  test('loads the login profile and clears a session if loading fails', async () => {
    globalThis.fetch = mock(async (input: RequestInfo | URL) =>
      input.toString().endsWith('/login/access_token')
        ? json({ access_token: 'new-token' }) : json(user)
    ) as typeof fetch;
    const store = useUserStore();
    expect(await store.login('runner@example.com', 'password')).toBe(true);
    expect(store.isAdmin).toBe(true);
    globalThis.fetch = mock(async (input: RequestInfo | URL) =>
      input.toString().endsWith('/login/access_token')
        ? json({ access_token: 'bad-profile-token' }) : json({}, 503)
    ) as typeof fetch;
    expect(await store.login('runner@example.com', 'password')).toBe(false);
    expect(store.token).toBeNull();
    expect(store.isAdmin).toBe(false);
  });

  test('does not clear a newer login when an earlier profile response arrives late', async () => {
    let resolveOldProfile!: (response: Response) => void;
    let profileStarted!: () => void;
    const started = new Promise<void>(resolve => { profileStarted = resolve; });
    let logins = 0;
    globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (input.toString().endsWith('/login/access_token')) {
        return json({ access_token: ++logins === 1 ? 'old-login-token' : 'new-login-token' });
      }
      if (new Headers(init?.headers).get('Authorization') === 'Bearer old-login-token') {
        profileStarted();
        return new Promise<Response>(resolve => { resolveOldProfile = resolve; });
      }
      return json({ ...user, name: 'newuser', is_admin: false });
    }) as typeof fetch;
    const store = useUserStore();
    const oldLogin = store.login('runner@example.com', 'password');
    await started;
    expect(await store.login('new@example.com', 'password')).toBe(true);
    resolveOldProfile(json(user));
    expect(await oldLogin).toBe(false);
    expect(store.token).toBe('new-login-token');
    expect(store.currentUser?.name).toBe('newuser');
  });

  test('ignores a token response from a superseded login', async () => {
    let resolveOldToken!: (response: Response) => void;
    let logins = 0;
    globalThis.fetch = mock(async (input: RequestInfo | URL) => {
      if (input.toString().endsWith('/login/access_token')) {
        if (++logins === 1) return new Promise<Response>(resolve => { resolveOldToken = resolve; });
        return json({ access_token: 'new-login-token' });
      }
      return json({ ...user, name: 'newuser' });
    }) as typeof fetch;
    const store = useUserStore();
    const oldLogin = store.login('runner@example.com', 'password');
    expect(await store.login('new@example.com', 'password')).toBe(true);
    resolveOldToken(json({ access_token: 'old-login-token' }));
    expect(await oldLogin).toBe(false);
    expect(store.token).toBe('new-login-token');
    expect(store.currentUser?.name).toBe('newuser');
  });
});
