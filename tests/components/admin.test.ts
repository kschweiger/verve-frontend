import { stubFetch } from '../helpers/fetch';
import '../helpers/vueComponents';
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { createSSRApp, h } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { renderToString } from '@vue/server-renderer';
import { createMemoryHistory, createRouter } from 'vue-router';
import { useUserStore } from '../../src/stores/auth';
import { useAdminStore } from '../../src/stores/admin';

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

async function render(component: typeof AppNavbar | typeof AdminView): Promise<string> {
  const app = createSSRApp({ render: () => h(component) });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/admin', name: 'admin', component: { render: () => null } },
      { path: '/:pathMatch(.*)*', component: { render: () => null } },
    ],
  });
  app.use(router);
  await router.push('/dashboard');
  return renderToString(app);
}

describe('admin navigation and page', () => {
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
});
