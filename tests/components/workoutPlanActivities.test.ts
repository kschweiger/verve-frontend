import { useClientRendering } from '../helpers/vueComponents';
import { afterEach, expect, test } from 'bun:test';
import { createRenderer, defineComponent, h, nextTick, ref } from 'vue';
import { createPinia } from 'pinia';
import { useUserStore } from '../../src/stores/auth';
import { createAppI18n } from '../../src/i18n';
import type { ActivityPublic } from '../../src/types/api';
import { stubFetch } from '../helpers/fetch';
useClientRendering(import.meta.dir + '/../../src/components/WorkoutPlanActivities.vue');
const { default: Panel } = await import('../../src/components/WorkoutPlanActivities.vue');
class Element {
  children: Element[] = [];
  parent: Element | null = null;
  props: Record<string, unknown> = {};
  text = '';
  value: string | number = '';
  type = '';
  constructor(readonly tag: string) {}
  get options() {
    return this.children.filter((child) => child.tag === 'option');
  }
  focus() {}
  getRootNode() {
    return {};
  }
  listeners: Record<string, (event: Event) => void> = {};
  addEventListener(name: string, callback: (event: Event) => void) {
    this.listeners[name] = callback;
  }
  showModal() {}
  close() {}
  removeEventListener() {}
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
const globals = globalThis as unknown as Record<string, unknown>;
const originalDocument = globals.Document;
const originalShadowRoot = globals.ShadowRoot;
const originalFetch = globalThis.fetch;
const originalStorage = globalThis.localStorage;
let cleanup = () => {};
afterEach(() => {
  cleanup();
  globals.Document = originalDocument;
  globals.ShadowRoot = originalShadowRoot;
  globalThis.fetch = originalFetch;
  globalThis.localStorage = originalStorage;
});

async function flush() {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
}
function mount() {
  globalThis.localStorage = {
    getItem: () => null,
    setItem() {},
    removeItem() {},
    clear() {},
    key: () => null,
    length: 0,
  };
  const pinia = createPinia();
  const id = ref('one');
  const app = renderer.createApp({ render: () => h(Panel, { planId: id.value }) });
  app.use(pinia);
  const i18n = createAppI18n('en');
  app.use(i18n);
  app.component(
    'router-link',
    defineComponent({
      props: ['to'],
      setup(props, { slots }) {
        return () => h('a', { targetRoute: props.to }, slots.default?.());
      },
    })
  );
  const auth = useUserStore(pinia);
  auth.token = 'first';
  const root = new Element('root');
  app.mount(root);
  cleanup = () => app.unmount();
  const all = (node: Element): Element[] => [node, ...node.children.flatMap(all)];
  const content = () =>
    all(root)
      .map((el) => el.text)
      .join(' ');
  return { id, auth, root, all, content, i18n };
}
test('links activities to detail and displays activity-local time', async () => {
  const activity: ActivityPublic = {
    id: '00000000-0000-4000-8000-000000000001',
    name: 'Run',
    start: '2024-01-01T23:30:00Z',
    timezone: 'Asia/Tokyo',
    created_at: '2024-01-03T00:00:00Z',
    duration: 'PT30M',
    distance: null,
    type_id: 1,
    sub_type_id: null,
    tags: [],
  };
  globalThis.fetch = (async () =>
    Response.json({
      data: [activity],
    })) as unknown as typeof fetch;
  const view = mount();
  await flush();
  expect(view.content()).toContain('Run');
  expect(view.all(view.root).find((el) => el.tag === 'a')?.props.targetRoute).toEqual({
    name: 'activity-detail',
    params: { id: activity.id },
  });
  expect(view.all(view.root).find((el) => el.tag === 'time')?.props.title).toBe('Asia/Tokyo');
  const expectedLocalTime = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date('2024-01-01T23:30:00Z'));
  expect(view.content()).toContain(expectedLocalTime);
  const details = view.all(view.root).find((el) => el.tag === 'details');
  expect(details).toBeDefined();
  expect(details?.props.open).toBeUndefined();
  const summary = view.all(view.root).find((el) => el.tag === 'summary')!;
  const summaryText = view
    .all(summary)
    .map((el) => el.text)
    .join(' ');
  const expectedLocalDate = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date('2024-01-01T23:30:00Z'));
  expect(summaryText).toContain('1 linked activity');
  expect(summaryText).toContain(expectedLocalDate);

  view.i18n.global.locale.value = 'de';
  await nextTick();
  expect(view.content()).toContain('1 verknüpfte Aktivität');
  expect(view.content()).toContain('02.01.2024');
  expect(view.content()).toContain('Run');
  expect(view.all(view.root).find((el) => el.tag === 'time')?.props.datetime).toBe(activity.start);
});

test('expanded activities are paged locally and reset when the plan changes', async () => {
  const data = Array.from({ length: 12 }, (_, index) => {
    const day = index + 1;
    return {
      id: `activity-${day}`,
      name: `Workout ${day}`,
      start: `2024-01-${String(day).padStart(2, '0')}T23:30:00Z`,
      timezone: 'UTC',
    };
  });
  let requests = 0;
  globalThis.fetch = (async () => {
    requests++;
    return Response.json({ data });
  }) as unknown as typeof fetch;
  const view = mount();
  await flush();
  const links = () => view.all(view.root).filter((el) => el.tag === 'a');
  const button = (label: string) =>
    view.all(view.root).find((el) => el.props['aria-label'] === label)!;
  expect(view.content()).toContain('12 linked activities');
  expect(links()).toHaveLength(10);
  expect(links()[0]?.props.targetRoute).toEqual({
    name: 'activity-detail',
    params: { id: 'activity-12' },
  });
  expect(button('Previous page').props['aria-disabled']).toBe(true);
  (button('Next page').props.onClick as () => void)();
  await nextTick();
  expect(links()).toHaveLength(2);
  expect(links()[0]?.props.targetRoute).toEqual({
    name: 'activity-detail',
    params: { id: 'activity-2' },
  });
  expect(button('Next page').props['aria-disabled']).toBe(true);
  (button('Next page').props.onClick as () => void)();
  await nextTick();
  expect(links()).toHaveLength(2);
  expect(view.content()).toContain('Page 2 of 2');
  view.i18n.global.locale.value = 'de';
  await nextTick();
  expect(view.content()).toContain('Seite 2 von 2');
  expect(links()).toHaveLength(2);
  view.i18n.global.locale.value = 'en';
  await nextTick();
  (button('Previous page').props.onClick as () => void)();
  await nextTick();
  expect(links()).toHaveLength(10);
  (button('Next page').props.onClick as () => void)();
  await nextTick();
  expect(requests).toBe(1);

  view.id.value = 'two';
  await flush();
  expect(view.content()).toContain('Page 1 of 2');
  expect(links()).toHaveLength(10);
  expect(requests).toBe(2);
});

test('failure offers a local retry and then shows the empty state', async () => {
  let calls = 0;
  globalThis.fetch = (async () =>
    ++calls === 1
      ? new Response('', { status: 500 })
      : Response.json({ data: [] })) as unknown as typeof fetch;
  const view = mount();
  await flush();
  expect(view.content()).toContain('Could not load linked activities.');
  expect(view.content()).toContain('Unavailable');
  const retry = view.all(view.root).find((el) => el.tag === 'button');
  (retry?.props.onClick as () => void)();
  await flush();
  expect(view.content()).toContain('No linked activities yet.');
  expect(view.content()).toContain('0 linked activities');
});

test('preserves the server diagnostic when the linked activities error changes language', async () => {
  globalThis.fetch = stubFetch(async () =>
    Response.json({ detail: 'Exercise plan not found' }, { status: 404 })
  );
  const view = mount();
  await flush();
  view.i18n.global.locale.value = 'de';
  await nextTick();

  expect(view.content()).toContain('Verknüpfte Aktivitäten konnten nicht geladen werden.');
  expect(view.content()).toContain('Exercise plan not found');
});

test('account changes invalidate pending responses and disable stale retry', async () => {
  let resolve!: (response: Response) => void;
  let calls = 0;
  globalThis.fetch = (() => {
    calls++;
    return new Promise<Response>((done) => {
      resolve = done;
    });
  }) as unknown as typeof fetch;
  const view = mount();
  view.auth.token = 'second';
  resolve(
    Response.json({
      data: [{ id: 'old', name: 'Old activity', start: '2024-01-01T00:00:00Z', timezone: 'UTC' }],
    })
  );
  await flush();
  expect(view.content()).not.toContain('Old activity');
  expect(calls).toBe(1);
});
