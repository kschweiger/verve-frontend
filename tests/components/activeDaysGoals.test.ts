import '../helpers/vueComponents';
import { afterEach, beforeEach, expect, test } from 'bun:test';
import { createSSRApp } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { createPinia } from 'pinia';
import { createAppI18n } from '../../src/i18n';
import { useGoalStore, type Goal } from '../../src/stores/goals';
const { default: GoalCreateForm } = await import('../../src/components/forms/GoalCreateForm.vue');
const { default: GoalCard } = await import('../../src/components/GoalCard.vue');
const { default: GoalsWidget } = await import('../../src/components/widgets/GoalsWidget.vue');

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
  const html = await renderToString(app);
  expect(html).toContain('value="active_days"');
  expect(html).toContain('Active Days');
});
test('active day goal card displays progress in days', async () => {
  const app = createSSRApp(GoalCard, { goal });
  app.use(createPinia());
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
