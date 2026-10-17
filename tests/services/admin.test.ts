import { stubFetch } from '../helpers/fetch';
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { createPinia, setActivePinia } from 'pinia';
import { useUserStore } from '../../src/stores/auth';
import {
  fetchAdminUsers,
  reprocessUserTracks,
  recalculateUserHighlights,
  fetchAdminTask,
} from '../../src/services/admin';

const originalFetch = globalThis.fetch;
const originalStorage = globalThis.localStorage;
const userId = '00000000-0000-4000-8000-000000000001';
const taskId = '00000000-0000-4000-8000-000000000002';
const activityId = '00000000-0000-4000-8000-000000000003';
const user = { id: userId, name: 'runner', email: 'runner@example.com', full_name: null };
const tracks = {
  tracks: [{ user_id: userId, task_id: taskId, activity_id: activityId }],
  completion_tasks: [{ user_id: userId, task_id: '00000000-0000-4000-8000-000000000004' }],
};
const highlights = { users: [{ user_id: userId, task_id: taskId }] };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

beforeEach(() => {
  globalThis.localStorage = {
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
    clear: () => undefined,
    key: () => null,
    length: 0,
  };
  setActivePinia(createPinia());
  useUserStore().setToken('token');
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  globalThis.localStorage = originalStorage;
});

describe('admin API contract', () => {
  test('loads the plain user list without requiring admin flags on listed users', async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    globalThis.fetch = stubFetch(
      mock(async (input: RequestInfo | URL, init?: RequestInit) => {
        requests.push({ url: input.toString(), init });
        return json([user]);
      })
    );
    expect(await fetchAdminUsers()).toEqual([user]);
    expect(requests[0]?.url.endsWith('/admin/users')).toBe(true);
    expect(requests[0]?.init).toEqual({
      method: 'GET',
      headers: { Authorization: 'Bearer token' },
    });
  });

  test('passes one user_id and no body to both supported POST routes', async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    globalThis.fetch = stubFetch(
      mock(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = input.toString();
        requests.push({ url, init });
        return json(url.includes('/reprocess_tracks?') ? tracks : highlights, 202);
      })
    );
    expect(await reprocessUserTracks(userId)).toEqual(tracks);
    expect(await recalculateUserHighlights(userId)).toEqual(highlights);
    expect(requests.map((request) => request.url.split('/admin/')[1])).toEqual([
      'reprocess_tracks?user_id=00000000-0000-4000-8000-000000000001',
      'recalculate_highlights?user_id=00000000-0000-4000-8000-000000000001',
    ]);
    expect(
      requests.every(
        (request) => request.init?.method === 'POST' && request.init.body === undefined
      )
    ).toBe(true);
    expect(requests[0]?.init?.headers).toEqual({ Authorization: 'Bearer token' });
  });

  test('requires a user target before sending either POST request', async () => {
    let requests = 0;
    globalThis.fetch = stubFetch(
      mock(async () => {
        requests++;
        return json(highlights, 202);
      })
    );
    expect(() => reprocessUserTracks('')).toThrow();
    expect(() => recalculateUserHighlights('')).toThrow();
    expect(requests).toBe(0);
  });

  test('accepts arbitrary state strings and nullable optional task details', async () => {
    const result = { count: 2, outcomes: [{ activity_id: activityId, rebuilt: true }] };
    globalThis.fetch = stubFetch(
      mock(async (input: RequestInfo | URL) => {
        expect(input.toString().endsWith('/admin/tasks/' + taskId)).toBe(true);
        return json({ task_id: taskId, state: 'CUSTOM_BACKEND_STATE', result, error: null });
      })
    );
    expect(await fetchAdminTask(taskId)).toEqual({
      task_id: taskId,
      state: 'CUSTOM_BACKEND_STATE',
      result,
      error: null,
    });
  });

  test('does not retry failed maintenance POSTs', async () => {
    let requests = 0;
    globalThis.fetch = stubFetch(
      mock(async () => {
        requests++;
        return json({}, 503);
      })
    );
    await expect(reprocessUserTracks(userId)).rejects.toThrow();
    expect(requests).toBe(1);
  });
});
