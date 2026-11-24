import '../helpers/vueComponents';
import { afterEach, beforeEach, expect, test } from 'bun:test';
import { createSSRApp, h } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { createPinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import { createAppI18n } from '../../src/i18n';
import { useStatisticsStore } from '../../src/stores/statistics';
import { useTagsStore } from '../../src/stores/tags';

const { default: HelpView } = await import('../../src/views/HelpView.vue');
const { default: TagsView } = await import('../../src/views/TagsView.vue');
const { default: CalendarWidget } = await import('../../src/components/widgets/CalendarWidget.vue');
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

test('help localizes format guidance while preserving identifiers', async () => {
  const app = createSSRApp({ render: () => h(HelpView) });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/help', component: HelpView }],
  });
  app.use(router);
  app.use(createAppI18n('de'));
  await router.push('/help#formats');

  const html = await renderToString(app);
  expect(html).toContain('aria-label="Hilfe"');
  expect(html).toContain('Dateiformate');
  expect(html).toContain('Verve unterstützt Dateien in den Formaten');
  expect(html).toContain('<strong>GPX</strong>');
  expect(html).toContain('<strong>FIT</strong>');
  expect(html).toContain('<strong>GeoJSON</strong>');
  expect(html).toContain('(öffnet in einem neuen Tab)');
});

test('tag management keeps custom names and localizes the associated controls', async () => {
  const pinia = createPinia();
  const store = useTagsStore(pinia);
  store.categories = [{ id: 1, name: 'Weather notes' }];
  store.tags = [
    { id: 10, category_id: 1, name: 'Sunshine in the Alps' },
    { id: 11, category_id: null, name: 'Favorite outing' },
  ];
  const app = createSSRApp({ render: () => h(TagsView) });
  app.use(pinia);
  app.use(createAppI18n('de'));

  const html = await renderToString(app);
  expect(html).toContain('Tags verwalten');
  expect(html).toContain('aria-label="Name der Kategorie"');
  expect(html).toContain('aria-label="Kategorie Weather notes löschen"');
  expect(html).toContain('aria-label="Tag Sunshine in the Alps löschen"');
  expect(html).toContain('aria-label="Tag Favorite outing löschen"');
  expect(html).toContain('Tags ohne Kategorie');
});

test('calendar widget localizes navigation and formats distance using the account language', async () => {
  const pinia = createPinia();
  const stats = useStatisticsStore(pinia);
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  stats.calendarData = {
    year,
    month,
    weeks: [{
      days: [{
        date: `${year}-${String(month).padStart(2, '0')}-01`,
        is_in_month: true,
        items: [],
        active_type_ids: [1],
        total: { count: 1, distance: 1250.5, duration: 5400, effective_duration: 5400, elevation_gain: 0 },
      }],
      week_summary: { count: 1, distance: 1250.5, duration: 5400, effective_duration: 5400, elevation_gain: 0 },
    }],
  };
  const app = createSSRApp({ render: () => h(CalendarWidget) });
  app.use(pinia);
  app.use(createAppI18n('de'));

  const html = await renderToString(app);
  expect(html).toContain('aria-label="Vorheriger Monat"');
  expect(html).toContain('title="1.250,5 km · Tag anzeigen"');
});
