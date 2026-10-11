import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { createPinia, setActivePinia } from 'pinia';
import { useUserStore } from '../../src/stores/auth';
import { useAdminStore } from '../../src/stores/admin';
import { resolveAdminAccess } from '../../src/router/adminGuard';

const originalFetch = globalThis.fetch;
const originalStorage = globalThis.localStorage;
const me = { id: '00000000-0000-4000-8000-000000000001', name: 'runner',
  email: 'runner@example.com', full_name: null, is_admin: true };
const other = { id: '00000000-0000-4000-8000-000000000002', name: 'rider1',
  email: 'rider@example.com', full_name: 'Other Rider' };
const taskId = '00000000-0000-4000-8000-000000000003';
const completionId = '00000000-0000-4000-8000-000000000004';
const activityId = '00000000-0000-4000-8000-000000000005';
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

beforeEach(async () => {
  globalThis.localStorage = { getItem: () => null, setItem: () => undefined,
    removeItem: () => undefined, clear: () => undefined, key: () => null, length: 0 };
  setActivePinia(createPinia());
  useUserStore().setToken('token');
  globalThis.fetch = mock(async () => json(me)) as typeof fetch;
  await useUserStore().ensureCurrentUser();
});
afterEach(() => { globalThis.fetch = originalFetch; globalThis.localStorage = originalStorage; });

async function loadUsers(others: unknown = [other]) {
  globalThis.fetch = mock(async () => json(others)) as typeof fetch;
  const store = useAdminStore();
  await store.ensureUsers();
  return store;
}

describe('admin user maintenance', () => {
  test('defaults to the current user and retains them when no other users exist', async () => {
    const store = await loadUsers([]);
    expect(store.users.map(user => user.id)).toEqual([me.id]);
    expect(store.selectedUserId).toBe(me.id);
    expect(store.canSubmit).toBe(true);
  });

  test('shares user loads, retries failures, and permits only listed targets', async () => {
    const store = useAdminStore();
    globalThis.fetch = mock(async () => json({}, 503)) as typeof fetch;
    await store.ensureUsers();
    expect(store.usersError).toBeTruthy();
    expect(store.canSubmit).toBe(false);
    let requests = 0;
    globalThis.fetch = mock(async () => { requests++; return json([other]); }) as typeof fetch;
    await Promise.all([store.ensureUsers(), store.ensureUsers()]);
    expect(requests).toBe(1);
    expect(store.users.map(user => user.id)).toEqual([me.id, other.id]);
    store.selectedUserId = '';
    expect(store.canSubmit).toBe(false);
    store.selectedUserId = '00000000-0000-4000-8000-000000000099';
    expect(store.canSubmit).toBe(false);
    store.selectedUserId = other.id;
    expect(store.canSubmit).toBe(true);
  });

  test('captures the selected user and all track/completion tasks, preventing duplicate submissions', async () => {
    const store = await loadUsers();
    store.selectedUserId = other.id;
    let resolve!: (response: Response) => void;
    let requests = 0;
    globalThis.fetch = mock((input: RequestInfo | URL) => {
      requests++;
      expect(input.toString().endsWith('/admin/reprocess_tracks?user_id=' + other.id)).toBe(true);
      return new Promise<Response>(r => { resolve = r; });
    }) as typeof fetch;
    const pending = store.submit('reprocess-tracks');
    await store.submit('reprocess-tracks');
    store.selectedUserId = me.id;
    resolve(json({ tracks: [{ activity_id: activityId, user_id: other.id, task_id: taskId }],
      completion_tasks: [{ user_id: other.id, task_id: completionId }] }, 202));
    await pending;
    expect(requests).toBe(1);
    expect(store.runs[0]?.user.id).toBe(other.id);
    expect(store.runs[0]?.tasks.map(task => task.taskId)).toEqual([taskId, completionId]);
    expect(store.isSubmitting).toBe(false);
  });

  test('supports empty queued jobs and exposes POST errors without losing previous jobs', async () => {
    const store = await loadUsers();
    globalThis.fetch = mock(async () => json({ users: [] }, 202)) as typeof fetch;
    await store.submit('recalculate-highlights');
    expect(store.runs[0]?.tasks).toEqual([]);
    globalThis.fetch = mock(async () => json({}, 503)) as typeof fetch;
    await store.submit('recalculate-highlights');
    expect(store.submissionError).toBeTruthy();
    expect(store.runs).toHaveLength(1);
  });

  test('refreshes status manually and keeps prior status when refresh fails', async () => {
    const store = await loadUsers();
    globalThis.fetch = mock(async () => json({ users: [{ user_id: me.id, task_id: taskId }] }, 202)) as typeof fetch;
    await store.submit('recalculate-highlights');
    const task = store.runs[0]!.tasks[0]!;
    expect(task.status).toBeNull();
    globalThis.fetch = mock(async () => json({ task_id: taskId, state: 'CUSTOM', result: { count: 2 } })) as typeof fetch;
    await store.refreshTask(task);
    expect(task.status?.state).toBe('CUSTOM');
    expect(task.status?.result).toEqual({ count: 2 });
    globalThis.fetch = mock(async () => json({}, 503)) as typeof fetch;
    await store.refreshTask(task);
    expect(task.status?.state).toBe('CUSTOM');
    expect(task.refreshError).toBeTruthy();
  });

  test('discards pending user lists after logout', async () => {
    const store = useAdminStore();
    let resolve!: (response: Response) => void;
    globalThis.fetch = mock(() => new Promise<Response>(r => { resolve = r; })) as typeof fetch;
    const pending = store.ensureUsers();
    useUserStore().logout();
    resolve(json([other]));
    await pending;
    expect(store.users).toEqual([]);
    expect(store.selectedUserId).toBe('');
    expect(store.usersError).toBeNull();
    expect(store.canSubmit).toBe(false);
  });

  test('discards pending POST results when the account changes', async () => {
    const store = await loadUsers();
    let resolve!: (response: Response) => void;
    globalThis.fetch = mock(() => new Promise<Response>(r => { resolve = r; })) as typeof fetch;
    const pending = store.submit('recalculate-highlights');
    useUserStore().setToken('another-token');
    resolve(json({ users: [{ user_id: me.id, task_id: taskId }] }, 202));
    await pending;
    expect(store.runs).toEqual([]);
    expect(store.submissionError).toBeNull();
    expect(store.isSubmitting).toBe(false);
  });

  test('revokes admin UI and clears session jobs after a forbidden response', async () => {
    const store = await loadUsers();
    globalThis.fetch = mock(async () => json({}, 403)) as typeof fetch;
    await store.submit('recalculate-highlights');
    expect(useUserStore().isAdmin).toBe(false);
    expect(store.users).toEqual([]);
    expect(store.runs).toEqual([]);
  });

  test('clears authentication after an unauthorized admin response', async () => {
    const store = await loadUsers();
    globalThis.fetch = mock(async () => json({}, 401)) as typeof fetch;
    await store.submit('recalculate-highlights');
    expect(useUserStore().token).toBeNull();
    expect(store.canSubmit).toBe(false);
  });
});

describe('admin route access', () => {
  test('verifies admin status for direct navigation with a restored token', async () => {
    useUserStore().setToken('restored-token');
    globalThis.fetch = mock(async () => json(me)) as typeof fetch;
    expect(await resolveAdminAccess()).toBe(true);
  });
  test('redirects ordinary users and failed account loads to dashboard', async () => {
    globalThis.fetch = mock(async () => json({ ...me, is_admin: false })) as typeof fetch;
    expect(await resolveAdminAccess()).toEqual({ name: 'dashboard' });
    globalThis.fetch = mock(async () => json({}, 503)) as typeof fetch;
    expect(await resolveAdminAccess()).toEqual({ name: 'dashboard' });
  });
  test('redirects unauthenticated and expired sessions to login', async () => {
    useUserStore().logout();
    expect(await resolveAdminAccess()).toEqual({ name: 'login' });
    useUserStore().setToken('expired-token');
    globalThis.fetch = mock(async () => json({}, 401)) as typeof fetch;
    expect(await resolveAdminAccess()).toEqual({ name: 'login' });
  });
});
