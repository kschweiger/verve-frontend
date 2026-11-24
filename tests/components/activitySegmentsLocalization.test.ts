import '../helpers/vueComponents';
import { stubFetch } from '../helpers/fetch';
import { afterEach, expect, test } from 'bun:test';
import { createPinia } from 'pinia';
import { createRenderer, h, nextTick } from 'vue';
import { createAppI18n } from '../../src/i18n';
import { useUserStore } from '../../src/stores/auth';
import type { SegmentStatisticsResponse } from '../../src/types/api';

const { default: ActivitySegmentsPanel } =
  await import('../../src/components/ActivitySegmentsPanel.vue');

class Element {
  children: Element[] = [];
  parent: Element | null = null;
  props: Record<string, unknown> = {};
  text = '';
  constructor(readonly tag: string) {}

  get content(): string {
    return this.text + this.children.map((child) => child.content).join('');
  }
}

const renderer = createRenderer<Element, Element>({
  createElement: (tag) => new Element(tag),
  createText: (text) => Object.assign(new Element('text'), { text }),
  createComment: () => new Element('comment'),
  setText: (el, text) => {
    el.text = text;
  },
  setElementText: (el, text) => {
    el.text = text;
    el.children = [];
  },
  parentNode: (el) => el.parent,
  nextSibling: (el) => el.parent?.children[el.parent.children.indexOf(el) + 1] ?? null,
  patchProp: (el, key, _old, value: unknown) => {
    el.props[key] = value;
  },
  insert: (el, parent, anchor) => {
    el.parent = parent;
    const index = anchor ? parent.children.indexOf(anchor) : -1;
    parent.children.splice(index < 0 ? parent.children.length : index, 0, el);
  },
  remove: (el) => {
    if (el.parent) el.parent.children.splice(el.parent.children.indexOf(el), 1);
  },
});

const activityId = '00000000-0000-4000-8000-000000000001';
const statistics: SegmentStatisticsResponse = {
  segment_set_id: '00000000-0000-4000-8000-000000000002',
  name: 'Hill repeats',
  cuts: [2401],
  display_metadata: {
    primary_metric: 'speed',
    display_metrics: ['speed', 'cadence'],
    speed_unit: 'km/h',
  },
  segments: [
    {
      distance_m: 1540,
      duration_s: 61,
      elevation_gain: null,
      elevation_loss: null,
      speed: { min: null, avg: 2.5, max: null },
      cadence: { min: 0, avg: 171.5, max: null },
    },
  ],
};
const originalFetch = globalThis.fetch;
const originalStorage = globalThis.localStorage;
let cleanup = () => {};
afterEach(() => {
  cleanup();
  globalThis.fetch = originalFetch;
  globalThis.localStorage = originalStorage;
});

async function mount() {
  globalThis.localStorage = {
    getItem: () => null,
    setItem() {},
    removeItem() {},
    clear() {},
    key: () => null,
    length: 0,
  };
  const pinia = createPinia();
  const i18n = createAppI18n();
  const app = renderer.createApp({
    render: () =>
      h(ActivitySegmentsPanel, {
        activityId,
        cadenceUnit: 'steps/min',
        hoveredIndex: null,
        trackData: [
          { id: 301, lat: null, lon: null, ele: null, time: '2026-10-01T12:00:00Z', dist: 0 },
          { id: 2401, lat: null, lon: null, ele: null, time: '2026-10-01T12:01:01Z', dist: 1540 },
          { id: 5001, lat: null, lon: null, ele: null, time: '2026-10-01T12:03:00Z', dist: 5100 },
        ],
      }),
  });
  app.use(pinia);
  app.use(i18n);
  useUserStore(pinia).token = 'token';
  const root = new Element('root');
  app.mount(root);
  cleanup = () => app.unmount();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();

  function all(node: Element): Element[] {
    return [node, ...node.children.flatMap(all)];
  }
  function click(label: string) {
    const button = all(root).find((el) => el.tag === 'button' && el.content.trim() === label);
    if (!button) throw new Error(`Missing button: ${label}`);
    (button.props.onClick as () => void)();
  }
  return { root, i18n, click, elements: () => all(root) };
}

test('switches segment statistics and cut controls to German while keeping track positions', async () => {
  globalThis.fetch = stubFetch(async (input: Parameters<typeof fetch>[0]) =>
    Response.json(
      String(input).includes('/segments/sets/')
        ? { data: [statistics.segment_set_id], count: 1 }
        : statistics
    )
  );
  const panel = await mount();
  panel.click('Show stats');
  panel.click('Edit cuts');
  await nextTick();
  expect(panel.root.content).toContain('1.54 km');
  panel.i18n.global.locale.value = 'de';
  await nextTick();
  expect(panel.root.content).toContain('Hill repeats');
  expect(panel.root.content).toContain('Geschwindigkeit');
  expect(panel.root.content).toContain('1,54 km');
  expect(panel.root.content).toContain('9,0 km/h');
  expect(panel.root.content).toContain('171,5 steps/min');
  expect(panel.root.content).toContain('1:01');
  expect(panel.root.content).toContain('Trackpunkt 2401');
  expect(panel.elements().find((node) => node.tag === 'select')?.props['aria-label']).toBe(
    'Segmentsatz'
  );
  const slider = panel.elements().find((node) => node.props.type === 'range');
  expect(slider?.props['aria-label']).toBe('Position von Schnitt 1');
  expect(slider?.props.value).toBe(1);
  expect(panel.elements().some((node) => node.props['aria-label'] === 'Schnitt 1 entfernen')).toBe(
    true
  );
});

test.each([
  [new Response(null, { status: 503 }), 'Segmentsätze konnten nicht geladen werden.'],
  [
    Response.json(
      { detail: [{ loc: ['path', 'activity_id'], msg: '', type: 'value_error' }] },
      { status: 422 }
    ),
    'Segmentsätze konnten nicht geladen werden.',
  ],
  [
    Response.json(
      {
        detail: [
          { loc: ['path', 'activity_id'], msg: 'Segment processing queued', type: 'value_error' },
        ],
      },
      { status: 422 }
    ),
    'Segment processing queued',
  ],
])(
  'localizes a failed segment load and preserves server diagnostics',
  async (response, message) => {
    globalThis.fetch = stubFetch(async () => response);
    const panel = await mount();
    panel.i18n.global.locale.value = 'de';
    await nextTick();
    expect(panel.root.content).toContain(message);
    expect(panel.root.content).toContain('Segmentsätze erneut laden');
  }
);
