import '../helpers/vueComponents';
import { afterEach, beforeEach, expect, test } from 'bun:test';
import { renderToString } from '@vue/server-renderer';
import { createPinia } from 'pinia';
import { createSSRApp, h, type Component } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { createAppI18n } from '../../src/i18n';

const { default: ActivityListView } = await import('../../src/views/ActivityListView.vue');
const { default: DashboardView } = await import('../../src/views/DashboardView.vue');
const originalStorage = globalThis.localStorage;

beforeEach(() => {
  globalThis.localStorage = {
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
    clear: () => undefined,
    key: () => null,
    length: 0,
  };
});

afterEach(() => {
  globalThis.localStorage = originalStorage;
});

async function renderGerman(view: Component): Promise<string> {
  const app = createSSRApp({ render: () => h(view) });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: { render: () => null } }],
  });

  app.use(createPinia());
  app.use(router);
  app.use(createAppI18n('de'));
  await router.push('/');
  return renderToString(app);
}

test('renders the dashboard overview in the app language', async () => {
  expect(await renderGerman(DashboardView)).toContain('Aktivitätsübersicht');
});

test('renders the activity list heading in the app language', async () => {
  expect(await renderGerman(ActivityListView)).toMatch(/<h1[^>]*>\s*Meine Aktivitäten\s*<\/h1>/);
});
