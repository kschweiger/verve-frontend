import { stubFetch } from '../helpers/fetch';
import '../helpers/vueComponents';
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { createSSRApp, h } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { renderToString } from '@vue/server-renderer';
import { createMemoryHistory, createRouter } from 'vue-router';
import { useUserStore } from '../../src/stores/auth';
import { useAdminStore } from '../../src/stores/admin';
import { createAppI18n } from '../../src/i18n';
import type { SupportedLocale } from '../../src/types/api';

const { default: AppNavbar } = await import('../../src/components/AppNavbar.vue');
const { default: AdminView } = await import('../../src/views/AdminView.vue');
const originalFetch = globalThis.fetch;
const originalStorage = globalThis.localStorage;
const me = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'runner',
  email: 'runner@example.com',
  full_name: null,
  is_admin: true,
};
const other = {
  id: '00000000-0000-4000-8000-000000000002',
  name: 'rider1',
  email: 'rider@example.com',
  full_name: 'Other Rider',
};
const json = (value: unknown) => new Response(JSON.stringify(value));

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
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  globalThis.localStorage = originalStorage;
});

async function render(component: typeof AppNavbar | typeof AdminView, locale: SupportedLocale = 'en'): Promise<string> {
  const app = createSSRApp({ render: () => h(component) });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/admin', name: 'admin', component: { render: () => null } },
      { path: '/:pathMatch(.*)*', component: { render: () => null } },
    ],
  });
  app.use(router);
  app.use(createAppI18n(locale));
  await router.push('/dashboard');
  return renderToString(app);
}

describe('admin navigation and page', () => {
  test('renders navigation labels in the selected locale', async () => {
    const html = await render(AppNavbar);
    expect(html).toContain('Main menu');
    expect(html).toContain('Workout Plans');
    expect(html).toContain('Search...');
    const germanHtml = await render(AppNavbar, 'de');
    expect(germanHtml).toContain('Hauptmenü');
    expect(germanHtml).toContain('Trainingspläne');
    expect(germanHtml).toContain('Suchen...');
  });

  test('renders the admin account link only for an admin account', async () => {
    const auth = useUserStore();
    auth.setToken('token');
    expect(await render(AppNavbar)).not.toContain('href="/admin"');
    globalThis.fetch = stubFetch(mock(async () => json(me)));
    await auth.ensureCurrentUser();
    expect(await render(AppNavbar)).toContain('href="/admin"');
    globalThis.fetch = stubFetch(mock(async () => json({ ...me, is_admin: false })));
    await auth.ensureCurrentUser(true);
    expect(await render(AppNavbar)).not.toContain('href="/admin"');
    auth.logout();
    expect(await render(AppNavbar)).not.toContain('href="/admin"');
  });

  test('renders the current user as the selected default and only user tools', async () => {
    const auth = useUserStore();
    auth.setToken('token');
    globalThis.fetch = stubFetch(mock(async () => json(me)));
    await auth.ensureCurrentUser();
    globalThis.fetch = stubFetch(mock(async () => json([other])));
    await useAdminStore().ensureUsers();
    const html = await render(AdminView);
    expect(html).toMatch(/<option[^>]*value="00000000-0000-4000-8000-000000000001"[^>]*selected/);
    expect(html).toContain('runner@example.com');
    expect(html).toContain('rider@example.com');
    expect(html).toContain('Reprocess tracks');
    expect(html).toContain('Recalculate highlights');
    expect(html).not.toContain('Activity ID');
    expect(html).not.toContain('All users');
  });

  test('localizes a single queued task and preserves user and task data', async () => {
    const auth = useUserStore();
    auth.setToken('token');
    globalThis.fetch = stubFetch(mock(async () => json(me)));
    await auth.ensureCurrentUser();
    globalThis.fetch = stubFetch(mock(async () => json([other])));
    const admin = useAdminStore();
    await admin.ensureUsers();
    admin.selectedUserId = other.id;
    const taskId = '00000000-0000-4000-8000-000000000003';
    globalThis.fetch = stubFetch(async () =>
      Response.json({ users: [{ user_id: other.id, task_id: taskId }] }, { status: 202 })
    );
    await admin.submit('recalculate-highlights');
    const task = admin.runs[0]?.tasks[0];
    if (!task) throw new Error('Expected one queued task');
    globalThis.fetch = stubFetch(async () =>
      json({ task_id: taskId, state: 'CUSTOM_STATE', error: 'Backend task diagnostic' })
    );
    await admin.refreshTask(task);

    const german = await render(AdminView, 'de');
    expect(german).toContain('Highlights neu berechnen');
    expect(german).toContain('1 Aufgabe');
    expect(german).toContain(`aria-label="Status für Aufgabe ${taskId} aktualisieren"`);
    expect(german).toContain(other.full_name);
    expect(german).toContain('CUSTOM_STATE');
    expect(german).toContain('Backend task diagnostic');
  });

  test('localizes user-list failures and retains details returned by the backend', async () => {
    const auth = useUserStore();
    auth.setToken('token');
    globalThis.fetch = stubFetch(mock(async () => json(me)));
    await auth.ensureCurrentUser();
    const admin = useAdminStore();
    globalThis.fetch = stubFetch(async () => new Response(null, { status: 503 }));
    await admin.ensureUsers();
    expect(await render(AdminView, 'de')).toContain('Konten konnten nicht geladen werden.');

    globalThis.fetch = stubFetch(async () =>
      Response.json({ detail: 'Backend user-list diagnostic' }, { status: 503 })
    );
    await admin.ensureUsers();
    expect(await render(AdminView, 'de')).toContain('Backend user-list diagnostic');
  });

  test('keeps the resubmission caution when the backend returns a diagnostic', async () => {
    const auth = useUserStore();
    auth.setToken('token');
    globalThis.fetch = stubFetch(async () => json(me));
    await auth.ensureCurrentUser();
    globalThis.fetch = stubFetch(async () => json([]));
    const admin = useAdminStore();
    await admin.ensureUsers();
    globalThis.fetch = stubFetch(async () =>
      Response.json({ detail: 'Backend job diagnostic' }, { status: 503 })
    );
    await admin.submit('recalculate-highlights');

    const german = await render(AdminView, 'de');
    expect(german).toContain('Prüfe den Auftrag, bevor du ihn erneut absendest.');
    expect(german).toContain('Backend job diagnostic');
  });
});
