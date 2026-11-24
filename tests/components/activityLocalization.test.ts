import '../helpers/vueComponents';
import { germanTimeUnit } from '../helpers/intl';
import { expect, test } from 'bun:test';
import { renderToString } from '@vue/server-renderer';
import { createPinia } from 'pinia';
import { createSSRApp, h, type VNode } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { createAppI18n } from '../../src/i18n';
import { mapApiActivity } from '../../src/services/api';

const { default: ActivityListItem } = await import('../../src/components/ActivityListItem.vue');
const { default: UploadActivityWidget } = await import('../../src/components/widgets/UploadActivityWidget.vue');

async function renderGerman(render: () => VNode): Promise<string> {
  const app = createSSRApp({ render });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { render: () => null } },
      { path: '/activity/:id', name: 'activity-detail', component: { render: () => null } },
      { path: '/help', component: { render: () => null } },
    ],
  });
  app.use(createPinia()).use(router).use(createAppI18n('de'));
  await router.push('/');
  return renderToString(app);
}

test.each([false, true])('activity row localizes active and total duration with compact=%p', async (compact) => {
  const activity = mapApiActivity({
    id: 'travel-activity',
    start: '2026-08-11T06:30:00Z',
    created_at: '2026-08-11T07:30:00Z',
    timezone: 'America/Los_Angeles',
    duration: 'PT1H30M',
    moving_duration: 'PT1H10M',
    distance: 18.435,
    type_id: 1,
    sub_type_id: null,
    name: 'California ride',
    tags: [],
  });

  const html = await renderGerman(() => h(ActivityListItem, { activity, compact }));

  expect(html).toContain(`1h ${germanTimeUnit(10, 'minute')}`);
  expect(html).toContain(`1h ${germanTimeUnit(30, 'minute')} gesamt`);
});

test('activity upload renders German options and an accessible file selection label', async () => {
  const originalStorage = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
    clear: () => undefined,
    key: () => null,
    length: 0,
  };
  try {
    const html = await renderGerman(() => h(UploadActivityWidget));

    expect(html).toContain('Aktivität hinzufügen');
    expect(html).toContain('Zeitzone (optional)');
    expect(html).toContain('aria-label="Unterstützte Formate ansehen"');
    expect(html).toMatch(/<label for="([^"]+)"[^>]*>\s*GPX-, FIT- und GeoJSON-Dateien\s*<\/label>.*<input[^>]*id="\1"[^>]*type="file"/);
  } finally {
    globalThis.localStorage = originalStorage;
  }
});
