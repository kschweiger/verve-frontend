import '../helpers/vueComponents';
import { afterEach, beforeEach, expect, setSystemTime, test } from 'bun:test';
import { createSSRApp, h } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { createPinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import { createAppI18n } from '../../src/i18n';
import { useUserStore } from '../../src/stores/auth';
import { useStatisticsStore, type CalendarDay } from '../../src/stores/statistics';
import { stubFetch } from '../helpers/fetch';

const { default: CalendarView } = await import('../../src/views/CalendarView.vue');

const originalFetch = globalThis.fetch;
const originalStorage = globalThis.localStorage;
const originalTimezone = process.env.TZ;

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
  globalThis.fetch = originalFetch;
  globalThis.localStorage = originalStorage;
  if (originalTimezone === undefined) delete process.env.TZ;
  else process.env.TZ = originalTimezone;
  setSystemTime();
});

async function setupCalendar() {
  const pinia = createPinia();
  const i18n = createAppI18n('en');
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: CalendarView },
      { path: '/activity/:id', name: 'activity-detail', component: CalendarView },
    ],
  });
  await router.push('/');
  return {
    i18n,
    stats: useStatisticsStore(pinia),
    user: useUserStore(pinia),
    render() {
      const app = createSSRApp({ render: () => h(CalendarView) });
      app.use(pinia);
      app.use(i18n);
      app.use(router);
      return renderToString(app);
    },
  };
}

test('calendar renders localized activity metrics and preserves calendar dates in a UTC-negative zone', async () => {
  process.env.TZ = 'America/Los_Angeles';
  setSystemTime(new Date('2027-02-15T12:00:00Z'));
  const { i18n, stats, render } = await setupCalendar();
  const firstDay: CalendarDay = {
    date: '2027-02-01',
    is_in_month: true,
    items: [{
      id: '00000000-0000-4000-8000-000000000001',
      name: 'My long ride',
      type_id: 1,
      distance: 1250.5,
      duration: 5400,
      effective_duration: 5400,
      elevation_gain: null,
    }],
    active_type_ids: [1],
    total: { count: 1, distance: 1250.5, duration: 5400, effective_duration: 5400, elevation_gain: 0 },
  };
  const restTotals = { count: 0, distance: 0, duration: 0, effective_duration: 0, elevation_gain: 0 };
  stats.calendarData = {
    year: 2027,
    month: 2,
    weeks: Array.from({ length: 4 }, (_, weekIndex) => ({
      days: Array.from({ length: 7 }, (_, dayIndex) => {
        const day = weekIndex * 7 + dayIndex + 1;
        if (day === 1) return firstDay;
        return {
          date: `2027-02-${String(day).padStart(2, '0')}`,
          is_in_month: true,
          items: [],
          active_type_ids: [],
          total: restTotals,
        };
      }),
      week_summary: weekIndex === 0 ? firstDay.total : restTotals,
    })),
  };

  const english = await render();
  expect(english).toContain('1,250.5 km');
  expect(english).toContain('1h 30m');
  expect(english).toContain('1 activity');
  expect(english).toContain('title="My long ride"');
  expect(english).toContain('February');
  expect(english).toContain('Mon, Feb 1');

  i18n.global.locale.value = 'de';
  const german = await render();
  expect(german).toContain('1.250,5 km');
  expect(german).toContain('1h 30min');
  expect(german).toContain('1 Aktivität');
  expect(german).toContain('aria-label="Vorheriger Monat"');
  expect(german).toContain('aria-label="Heute, zum aktuellen Monat wechseln"');
  expect(german).toContain('title="My long ride"');
  expect(german).toContain('Februar');
  expect(german).toContain('Mo. 1. Feb.');
  expect(german).toContain('Ruhetag');
  expect(german).toContain('Ruhewoche');
  expect(german).toMatch(/<time [^>]*datetime="2027-02-01"[^>]*>1<\/time>/);
});

test('calendar translates frontend load errors and retains backend detail', async () => {
  const { i18n, stats, user, render } = await setupCalendar();
  i18n.global.locale.value = 'de';
  expect(await render()).toContain('Kalender wird geladen…');

  user.setToken('test-token');
  globalThis.fetch = stubFetch(async () => new Response(null, { status: 503 }));
  await stats.fetchCalendar(2026, 11);
  expect(await render()).toContain('Kalender konnte nicht geladen werden.');

  globalThis.fetch = stubFetch(async () =>
    Response.json({ detail: 'Backend calendar message' }, { status: 503 }),
  );
  await stats.fetchCalendar(2026, 11);
  expect(await render()).toContain('Backend calendar message');
});
