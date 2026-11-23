import '../helpers/vueComponents';
import { afterEach, expect, test } from 'bun:test';
import { createSSRApp, h } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { createPinia } from 'pinia';
import { createAppI18n } from '../../src/i18n';
import { useHighlightStore } from '../../src/stores/highlights';

const { default: ActivityHighlights } = await import('../../src/components/ActivityHighlights.vue');
const originalStorage = globalThis.localStorage;

afterEach(() => {
  globalThis.localStorage = originalStorage;
});

test('labels activity highlight metrics, ranks and scopes in the active language', async () => {
  globalThis.localStorage = {
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
    clear: () => undefined,
    key: () => null,
    length: 0,
  };
  const id = '00000000-0000-4000-8000-000000000001';
  const pinia = createPinia();
  const store = useHighlightStore(pinia);
  store.activityHighlights = [
    {
      activity_id: id,
      type_id: 1,
      metric: 'avg_power20min',
      scope: 'yearly',
      year: 2026,
      track_id: null,
      value: 235,
      rank: 2,
    },
    {
      activity_id: id,
      type_id: 1,
      metric: 'distance',
      scope: 'lifetime',
      year: null,
      track_id: null,
      value: 100,
      rank: 1,
    },
  ];
  const app = createSSRApp({ render: () => h(ActivityHighlights, { activityId: id }) });
  app.use(pinia);
  app.use(createAppI18n('de'));

  const html = await renderToString(app);
  expect(html).toContain('Bestleistungen');
  expect(html).toContain('Durchschnittsleistung über 20 Min.');
  expect(html).toContain('Platz 2');
  expect(html).toContain('Im Jahr 2026');
  expect(html).toContain('Gesamter Zeitraum');
});
