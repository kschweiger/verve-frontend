import '../helpers/vueComponents';
import { expect, test } from 'bun:test';
import { renderToString } from '@vue/server-renderer';
import { createSSRApp, h } from 'vue';
import { createAppI18n } from '../../src/i18n';

const { default: WorkoutExerciseFields } =
  await import('../../src/components/WorkoutExerciseFields.vue');

test('exercise editor localizes its labels without changing numeric input values', async () => {
  const app = createSSRApp({
    render: () =>
      h(WorkoutExerciseFields, {
        exercises: [],
        labels: {},
        catalogLoading: false,
        catalogError: false,
        modelValue: [{ key: 1, exercise_id: 'known-id', sets: 2, repetitions: 8, weight: 12.5 }],
      }),
  });
  app.use(createAppI18n('de'));

  const html = await renderToString(app);
  expect(html).toContain('Übungen suchen');
  expect(html).toContain('Übung known-id');
  expect(html).toContain('aria-label="Wiederholungen für Zeile 1"');
  expect(html).toMatch(/<input(?=[^>]*aria-label="Gewicht \(kg\) für Zeile 1")[^>]*value="12\.5"/);
});
