import { useClientRendering } from '../helpers/vueComponents';
import { resolve } from 'node:path';
import { expect, mock, test } from 'bun:test';
import { createSSRApp, createRenderer, defineComponent, h, nextTick, ref } from 'vue';
import { renderToString } from '@vue/server-renderer';
import type { ChartData, ChartOptions, Scale, TooltipItem, TooltipModel } from 'chart.js';
import { createAppI18n } from '../../src/i18n';
import type { TrackPoint } from '../../src/services/api';
import type { SupportedLocale } from '../../src/types/api';

interface RenderedChart {
  data: ChartData<'line', (number | null)[]>;
  options: ChartOptions<'line'>;
}
let rendered: RenderedChart | undefined;
function renderedChart(): RenderedChart {
  expect(rendered).toBeDefined();
  return rendered!;
}
// Chart.js needs a browser canvas; capture the real component's chart configuration instead.
mock.module('vue-chartjs', () => ({
  Line: defineComponent(
    (props: RenderedChart & { ariaLabel: string }) => {
      rendered = props;
      return () => h('canvas', { 'aria-label': props.ariaLabel });
    },
    { props: ['data', 'options', 'ariaLabel'] }
  ),
}));
useClientRendering(resolve(import.meta.dir, '../../src/components/CombinedMetricsChart.vue'));
const { default: CombinedMetricsChart } =
  await import('../../src/components/CombinedMetricsChart.vue');
const { default: ElevationChart } = await import('../../src/components/ElevationChart.vue');

async function renderCadence(
  cadenceUnit: 'steps/min' | 'RPM' | 'counts/min',
  values: (number | null)[],
  locale: SupportedLocale = 'en'
) {
  rendered = undefined;
  const trackData: TrackPoint[] = values.map((cad, index) => ({
    id: index,
    lat: null,
    lon: null,
    ele: null,
    time: `2026-10-01T12:00:0${index}Z`,
    dist: index,
    cad,
  }));
  const app = createSSRApp({
    render: () => h(CombinedMetricsChart, { trackData, cadenceUnit, hoveredIndex: null }),
  });
  app.use(createAppI18n(locale));
  await renderToString(app);
  return renderedChart();
}
test('cadence charts retain fractions and zero, and leave unavailable samples as gaps', async () => {
  const chart = await renderCadence('steps/min', [171.567, null, 0, 171]);
  expect(chart.data.datasets[0]?.data).toEqual([171.567, null, 0, 171]);
  expect(chart.data.datasets[0]?.spanGaps).toBe(false);
  expect(chart.data.datasets[0]?.label).toBe('Cadence (steps/min)');
  expect(chart.options.scales?.yMetric?.title?.text).toBe('Cadence (steps/min)');
});
test.each([
  ['steps/min', 171, 'Cadence: 171 steps/min'],
  ['steps/min', 171.5, 'Cadence: 171.5 steps/min'],
  ['steps/min', 171.567, 'Cadence: 171.6 steps/min'],
  ['RPM', 85.5, 'Cadence: 85.5 RPM'],
  ['counts/min', 0, 'Cadence: 0 counts/min'],
] as const)('cadence tooltips use %s for %s', async (unit, value, expected) => {
  const chart = await renderCadence(unit, [value]);
  const label = chart.options.plugins?.tooltip?.callbacks?.label;
  const context = {
    dataset: chart.data.datasets[0],
    parsed: { x: 0, y: value },
  } as TooltipItem<'line'>;
  expect(label?.call({} as TooltipModel<'line'>, context)).toBe(expected);
});

test('cadence tooltip and tick formatting use the app language', async () => {
  const chart = await renderCadence('RPM', [171.567, null], 'de');
  const context = {
    dataset: chart.data.datasets[0],
    parsed: { x: 0, y: 171.567 },
  } as TooltipItem<'line'>;
  expect(chart.options.locale).toBe('de');
  expect(chart.data.datasets[0]?.data).toEqual([171.567, null]);
  expect(chart.data.datasets[0]?.label).toBe('Kadenz (RPM)');
  expect(
    chart.options.plugins?.tooltip?.callbacks?.label?.call({} as TooltipModel<'line'>, context)
  ).toBe('Kadenz: 171,6 RPM');
  expect(chart.options.scales?.yMetric?.title?.text).toBe('Kadenz (RPM)');
  expect(chart.options.scales?.yMetric?.ticks?.callback?.call({} as Scale, 171.5, 0, [])).toBe(
    '171,5'
  );
});

test('elevation chart localizes its accessible name and axis while keeping elapsed positions', async () => {
  rendered = undefined;
  const trackData: TrackPoint[] = [
    { id: 1, lat: null, lon: null, ele: 1234.5, time: '2026-10-25T02:55:00+02:00', dist: 0 },
    { id: 2, lat: null, lon: null, ele: 1235.6, time: '2026-10-25T02:05:00+01:00', dist: 200 },
  ];
  const app = createSSRApp({
    render: () => h(ElevationChart, { trackData, hoveredIndex: 1, cutIndices: [1] }),
  });
  app.use(createAppI18n('de'));
  expect(await renderToString(app)).toContain('aria-label="Höhenprofil"');

  const chart = renderedChart();
  expect(chart.options.locale).toBe('de');
  expect(chart.options.scales?.y?.title?.text).toBe('Höhe (m)');
  expect(chart.options.scales?.x?.title?.text).toBe('Verstrichene Zeit');
  expect(chart.data.labels).toEqual(['0m', '10m']);
  expect(chart.data.datasets[0]?.label).toBe('Höhe');
  expect(chart.data.datasets[0]?.data).toEqual([1234.5, 1235.6]);
  expect(chart.options.plugins?.annotation?.annotations).toMatchObject({
    cut0: { value: 1, label: { content: 'Schnitt 1' } },
    line1: { value: 1 },
  });
});

test('a mounted cadence chart reacts to unit and language changes', async () => {
  // Exercise Vue updates without a browser DOM or Chart.js canvas.
  const renderer = createRenderer<object, object>({
    createElement: () => ({}),
    createText: () => ({}),
    createComment: () => ({}),
    insert: () => undefined,
    remove: () => undefined,
    patchProp: () => undefined,
    setText: () => undefined,
    setElementText: () => undefined,
    parentNode: () => null,
    nextSibling: () => null,
  });
  const cadenceUnit = ref<'counts/min' | 'steps/min'>('counts/min');
  const app = renderer.createApp({
    render: () =>
      h(CombinedMetricsChart, {
        trackData: [
          {
            id: 1,
            lat: null,
            lon: null,
            ele: null,
            time: '2026-10-01T12:00:00Z',
            dist: 0,
            cad: 171,
          },
        ],
        cadenceUnit: cadenceUnit.value,
        hoveredIndex: null,
      }),
  });
  const i18n = createAppI18n('en');
  app.use(i18n);
  rendered = undefined;
  app.mount({});
  try {
    const chart = renderedChart();
    expect(chart.data.datasets[0]?.label).toBe('Cadence (counts/min)');
    cadenceUnit.value = 'steps/min';
    await nextTick();
    expect(chart.data.datasets[0]?.label).toBe('Cadence (steps/min)');
    expect(chart.options.scales?.yMetric?.title?.text).toBe('Cadence (steps/min)');
    const context = {
      dataset: chart.data.datasets[0],
      parsed: { x: 0, y: 171 },
    } as TooltipItem<'line'>;
    expect(
      chart.options.plugins?.tooltip?.callbacks?.label?.call({} as TooltipModel<'line'>, context)
    ).toBe('Cadence: 171 steps/min');

    i18n.global.locale.value = 'de';
    await nextTick();
    expect(chart.options.locale).toBe('de');
    expect(chart.data.datasets[0]?.label).toBe('Kadenz (steps/min)');
    expect(chart.options.scales?.yMetric?.title?.text).toBe('Kadenz (steps/min)');
  } finally {
    app.unmount();
  }
});
