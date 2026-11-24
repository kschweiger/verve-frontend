import '../helpers/vueComponents';
import { germanTimeUnit } from '../helpers/intl';
import { afterEach, beforeEach, expect, test } from 'bun:test';
import { createSSRApp } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { createPinia } from 'pinia';
import { createAppI18n } from '../../src/i18n';
import { useStatisticsStore, type ActivityGridResponse } from '../../src/stores/statistics';

const { default: ActivityGridWidget } = await import('../../src/components/widgets/ActivityGridWidget.vue');
const { default: DashboardOverviewStrip } = await import('../../src/components/dashboard/DashboardOverviewStrip.vue');

const originalStorage = globalThis.localStorage;
beforeEach(() => {
  globalThis.localStorage = {
    getItem: () => null, setItem() {}, removeItem() {}, clear() {}, key: () => null, length: 0,
  };
});
afterEach(() => { globalThis.localStorage = originalStorage; });

const date = '2024-12-30';
const activeDay = {
  date, activity_count: 1, duration_seconds: 3600, effective_duration_seconds: 2700,
};
const anotherActiveDay = {
  date: '2024-12-31', activity_count: 2345, duration_seconds: 1800, effective_duration_seconds: 1800,
};
const grid: ActivityGridResponse = {
  weeks: [{ start_date: date, month: 12, days: [activeDay, anotherActiveDay, null, null, null, null, null] }],
  scale_max: { activity_count: 2345, duration_seconds: 3600, effective_duration_seconds: 2700 },
  totals: { activity_count: 2346, duration_seconds: 4_445_100, effective_duration_seconds: 4_444_200, active_days: 2 },
  summary: { last_active_day: null, week_activity_streak: 1, activities_this_month: 1234 },
};

test('history cell names its original calendar day and localizes the activity count and durations', async () => {
  const pinia = createPinia();
  useStatisticsStore(pinia).activityGrid = grid;
  const app = createSSRApp(ActivityGridWidget);
  app.use(pinia);
  app.use(createAppI18n('de'));

  const html = await renderToString(app);
  expect(html).toContain('Aktivitätsverlauf');
  expect(html).toContain('>Mo<');
  expect(html).toContain('>Dez<');
  expect(html).toContain(`aria-label="30.12.2024 · 1 Aktivität · ${germanTimeUnit(45, 'minute')} aktiv · 1h gesamt"`);
  expect(html).toContain(`aria-label="31.12.2024 · 2.345 Aktivitäten · ${germanTimeUnit(30, 'minute')} aktiv"`);
});

test('dashboard summary localizes numbers and plurals from backend totals and summary', async () => {
  const pinia = createPinia();
  useStatisticsStore(pinia).activityGrid = grid;
  const app = createSSRApp(DashboardOverviewStrip);
  app.use(pinia);
  app.use(createAppI18n('de'));

  const html = await renderToString(app);
  expect(html).toContain('Aktive Zeit');
  expect(html).toContain(`1.234h ${germanTimeUnit(30, 'minute')}`);
  expect(html).toContain('Diesen Monat');
  expect(html).toContain('>1.234<');
  expect(html).toContain('Keine Aktivität');
  expect(html).toContain('1 Woche');
});
