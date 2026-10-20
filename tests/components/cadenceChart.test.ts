import { useClientRendering } from '../helpers/vueComponents';
import { resolve } from 'node:path';
import { expect, mock, test } from 'bun:test';
import { createSSRApp, createRenderer, defineComponent, h, nextTick, ref } from 'vue';
import { renderToString } from '@vue/server-renderer';
import type { ChartData, ChartOptions, TooltipItem, TooltipModel } from 'chart.js';
import type { TrackPoint } from '../../src/services/api';

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
    (props: RenderedChart) => {
      rendered = props;
      return () => h('canvas');
    },
    { props: ['data', 'options'] }
  ),
}));
useClientRendering(resolve(import.meta.dir, '../../src/components/CombinedMetricsChart.vue'));
const { default: CombinedMetricsChart } =
  await import('../../src/components/CombinedMetricsChart.vue');
async function renderCadence(
  cadenceUnit: 'steps/min' | 'RPM' | 'counts/min',
  values: (number | null)[]
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
  await renderToString(
    createSSRApp({
      render: () => h(CombinedMetricsChart, { trackData, cadenceUnit, hoveredIndex: null }),
    })
  );
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

test('an existing cadence chart updates its axis, dataset, and tooltip units', async () => {
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
  } finally {
    app.unmount();
  }
});
