import '../helpers/vueComponents';
import { afterEach, beforeEach, expect, test } from 'bun:test';
import { createSSRApp } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { createPinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import { createAppI18n } from '../../src/i18n';
import { useGoalStore, type Goal } from '../../src/stores/goals';
import { useLocationStore } from '../../src/stores/location';
const { default: GoalCreateForm } = await import('../../src/components/forms/GoalCreateForm.vue');
const { default: GoalCard } = await import('../../src/components/GoalCard.vue');
const { default: GoalsWidget } = await import('../../src/components/widgets/GoalsWidget.vue');
const { default: LocationGoalCreateForm } = await import(
  '../../src/components/forms/LocationGoalCreateForm.vue'
);
const { default: ActivityLocationsWidget } = await import(
  '../../src/components/widgets/ActivityLocationsWidget.vue'
);

const originalStorage = globalThis.localStorage;
beforeEach(() => {
  globalThis.localStorage = {
    getItem: () => null, setItem() {}, removeItem() {}, clear() {}, key: () => null, length: 0,
  };
});
afterEach(() => { globalThis.localStorage = originalStorage; });
const goal: Goal = {
  id: 'goal-1', name: 'Stay active', description: null,
  type: 'activity', aggregation: 'active_days',
  current: 3, target: 10, progress: 0.3, reached: false,
  temporal_type: 'monthly', year: 2026, month: 11, constraints: {},
};
test('goal form offers Active Days as a metric', async () => {
  const app = createSSRApp(GoalCreateForm);
  app.use(createPinia());
  app.use(createAppI18n());
  const html = await renderToString(app);
  expect(html).toContain('value="active_days"');
  expect(html).toContain('Active Days');
});
test('active day goal card displays progress in days', async () => {
  const app = createSSRApp(GoalCard, { goal });
  app.use(createPinia());
  app.use(createAppI18n());
  const html = await renderToString(app);
  expect(html).toContain('3 days');
  expect(html).toContain('10 days');
  expect(html).toContain('30%');
});
test('dashboard goal widget displays active day units', async () => {
  const pinia = createPinia();
  useGoalStore(pinia).monthlyGoals = [goal];
  const app = createSSRApp(GoalsWidget);
  app.use(pinia);
  app.use(createAppI18n());
  const html = await renderToString(app);
  expect(html).toContain('Stay active');
  expect(html).toMatch(/3 \/\s*10 days/);
});

test('dashboard goal widget localizes progress and keeps the original goal names', async () => {
  const pinia = createPinia();
  useGoalStore(pinia).monthlyGoals = [
    { ...goal, target: 1 },
    { ...goal, id: 'goal-2', aggregation: 'duration', current: 5400, target: 7200 },
  ];
  const app = createSSRApp(GoalsWidget);
  app.use(pinia);
  app.use(createAppI18n('de'));

  const html = await renderToString(app);
  expect(html).toContain('Meine Ziele');
  expect(html).toContain('Stay active');
  expect(html).toMatch(/3 \/\s*1 Tag/);
  expect(html).toMatch(/1,5 \/\s*2,0 h/);
});

test('German goal cards localize progress and actions while preserving the saved name', async () => {
  const app = createSSRApp(GoalCard, {
    goal: { ...goal, aggregation: 'total_distance', current: 1250.5, type: 'manual' },
  }).use(createPinia()).use(createAppI18n('de'));
  const html = await renderToString(app);
  expect(html).toContain('Stay active');
  expect(html).toMatch(/1\.250,5\s*km/);
  expect(html).toMatch(/30\s+%/);
  expect(html).toContain('aria-label="Fortschritt für Stay active erhöhen"');
});

test('German location goal creation localizes the default draft name and month labels', async () => {
  const app = createSSRApp(LocationGoalCreateForm, {
    location: { id: 'location-1', name: 'Hidden Lake' },
  }).use(createPinia()).use(createAppI18n('de'));
  const html = await renderToString(app);
  expect(html).toContain('Ziel für einen Ort festlegen');
  expect(html).toContain('value="Hidden Lake besuchen"');
  expect(html).toMatch(/<option value="3"(?: selected)?>März<\/option>/);
});

test('matched locations show German coordinates and retain numeric map link parameters', async () => {
  const pinia = createPinia();
  useLocationStore(pinia).currentActivityLocations = [{
    id: 'location-1', name: 'Hidden Lake', description: null, latitude: 48.1234,
    longitude: 11.5678, created_at: '2026-01-01T10:00:00Z', type_id: 1, sub_type_id: 1,
  }];
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/locations', name: 'locations', component: { render: () => null } }],
  });
  const app = createSSRApp(ActivityLocationsWidget).use(pinia).use(router).use(createAppI18n('de'));
  await router.push('/locations');
  const html = await renderToString(app);
  expect(html).toContain('Zugeordnete Orte');
  expect(html).toContain('Hidden Lake');
  expect(html).toContain('48,1234; 11,5678');
  expect(html).toContain('/locations?focus_id=location-1&amp;lat=48.1234&amp;lng=11.5678');
});
