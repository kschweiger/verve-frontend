import { useClientRendering } from '../helpers/vueComponents';
import { expect, test } from 'bun:test';
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { createAppI18n } from '../../src/i18n';

useClientRendering(import.meta.dir + '/../../src/components/WorkoutMuscleMap.vue');

test('highlights the backend catalog groups on the applicable body views', async () => {
  const { default: WorkoutMuscleMap } = await import('../../src/components/WorkoutMuscleMap.vue');
  const frontOnly = [
    ['chest', 'Brust', 'primary'],
    ['front_shoulders', 'Vordere Schultern', 'secondary'],
    ['front_upper_arms', 'Oberarme vorne', 'primary'],
    ['side_chest', 'Seitlicher Brustkorb', 'secondary'],
    ['front_abdomen', 'Bauch vorne', 'primary'],
    ['side_abdomen', 'Bauch seitlich', 'secondary'],
    ['front_hips', 'Hüften vorne', 'secondary'],
    ['front_thighs', 'Oberschenkel vorne', 'primary'],
    ['tibialis', 'Schienbeinmuskulatur', 'secondary'],
  ] as const;
  const backOnly = [
    ['rear_shoulders', 'Hintere Schultern', 'primary'],
    ['rotator_cuff', 'Rotatorenmanschette', 'secondary'],
    ['upper_trapezius', 'Oberer Trapezbereich', 'secondary'],
    ['middle_back', 'Mittlerer Rücken', 'primary'],
    ['back_sides', 'Seitlicher Rücken', 'primary'],
    ['lower_back', 'Unterer Rücken', 'secondary'],
    ['back_upper_arms', 'Oberarme hinten', 'primary'],
    ['buttocks', 'Gesäß', 'primary'],
    ['back_thighs', 'Oberschenkel hinten', 'primary'],
    ['calves', 'Waden', 'primary'],
  ] as const;
  const both = [
    ['side_shoulders', 'Seitliche Schultern', 'primary'],
    ['forearms', 'Unterarme', 'secondary'],
    ['outer_hips', 'Hüften seitlich', 'secondary'],
    ['inner_thighs', 'Oberschenkel innen', 'secondary'],
  ] as const;
  const groups = [
    ...frontOnly,
    ...backOnly,
    ...both,
    ['new_group', 'Neue Muskelgruppe', 'secondary'] as const,
  ].map(([code, name, role]) => ({
    id: code,
    code,
    name,
    role,
    exercise_count: 1,
    exercise_ids: ['exercise'],
  }));
  const app = createSSRApp({ render: () => h(WorkoutMuscleMap, { groups }) });
  app.use(createAppI18n('de'));
  const html = await renderToString(app);
  const [front, back] = html.match(/<svg\b.*?<\/svg>/gs) ?? [];
  const coloredRegion = (code: string, role: 'primary' | 'secondary') => {
    const fill = role === 'primary' ? 'fill-verve-dark' : 'fill-verve-medium';
    return `data-muscle="${code}" data-role="${role}" class="${fill}`;
  };
  for (const [code, , role] of frontOnly) {
    expect(front).toContain(coloredRegion(code, role));
    expect(back).not.toContain(`data-muscle="${code}"`);
  }
  for (const [code, , role] of backOnly) {
    expect(back).toContain(coloredRegion(code, role));
    expect(front).not.toContain(`data-muscle="${code}"`);
  }
  for (const [code, , role] of both) {
    expect(front).toContain(coloredRegion(code, role));
    expect(back).toContain(coloredRegion(code, role));
  }
  const disclosure = html.match(/<details\b[^>]*>.*?<\/details>/s)?.[0] ?? '';
  expect(html.indexOf('<details')).toBeGreaterThan(html.lastIndexOf('</svg>'));
  expect(disclosure).not.toMatch(/^<details\b[^>]*\sopen[\s=>]/);
  expect(disclosure).toContain('Primär beanspruchte Muskeln');
  expect(disclosure).toContain('Sekundär beanspruchte Muskeln');
  expect(disclosure).toContain('Neue Muskelgruppe');
  expect(html).toContain('Vorderseite');
  expect(html).toContain('Rückseite');
  expect(html).not.toContain('data-muscle="new_group"');
});
