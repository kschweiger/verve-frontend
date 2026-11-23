import '../helpers/vueComponents';
import { afterEach, expect, test } from 'bun:test';
import { renderToString } from '@vue/server-renderer';
import { createPinia } from 'pinia';
import { createSSRApp } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { createAppI18n } from '../../src/i18n';
import { useRecordsStore } from '../../src/stores/records';

const { default: RecordsView } = await import('../../src/views/RecordsView.vue');
const originalStorage = globalThis.localStorage;

afterEach(() => {
  globalThis.localStorage = originalStorage;
});

test('the German trophy case renders the saved rank and value with the original activity link', async () => {
  globalThis.localStorage = {
    getItem: () => null,
    setItem() {},
    removeItem() {},
    clear() {},
    key: () => null,
    length: 0,
  };
  const id = '00000000-0000-4000-8000-000000000001';
  const pinia = createPinia();
  const records = useRecordsStore(pinia);
  records.groups = [
    {
      metric: 'distance',
      records: [
        {
          activity_id: id,
          type_id: 1,
          metric: 'distance',
          scope: 'yearly',
          year: 2026,
          track_id: null,
          value: 1250.5,
          rank: 1,
        },
      ],
    },
  ];
  records.selectedMetric = 'distance';
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/records', component: RecordsView },
      { path: '/activity/:id', name: 'activity-detail', component: { render: () => null } },
    ],
  });
  const app = createSSRApp(RecordsView).use(pinia).use(router).use(createAppI18n('de'));
  await router.push('/records');

  const html = await renderToString(app);
  expect(html).toContain('Bestleistungen');
  expect(html).toContain('Ausdauer');
  expect(html).toContain('Platz 1');
  expect(html).toContain('1.250,50 km');
  expect(html).toContain(`href="/activity/${id}"`);
});
