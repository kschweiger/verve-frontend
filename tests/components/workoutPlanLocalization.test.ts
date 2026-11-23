import { useClientRendering } from '../helpers/vueComponents';
import { afterEach, expect, test } from 'bun:test';
import { createPinia } from 'pinia';
import { createRenderer, h, nextTick } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { createAppI18n } from '../../src/i18n';
import { useUserStore } from '../../src/stores/auth';
import { stubFetch } from '../helpers/fetch';

useClientRendering(import.meta.dir + '/../../src/views/WorkoutPlanListView.vue');
useClientRendering(import.meta.dir + '/../../src/views/WorkoutPlanView.vue');
useClientRendering(import.meta.dir + '/../../src/components/WorkoutPlanActivities.vue');
useClientRendering(import.meta.dir + '/../../src/components/WorkoutExerciseFields.vue');
const { default: WorkoutPlanListView } = await import('../../src/views/WorkoutPlanListView.vue');
const { default: WorkoutPlanView } = await import('../../src/views/WorkoutPlanView.vue');

class Element {
  children: Element[] = [];
  parent: Element | null = null;
  props: Record<string, unknown> = {};
  focused = false;

  constructor(public text = '') {}

  addEventListener() {}

  focus() {
    this.focused = true;
  }
}

const renderer = createRenderer<Element, Element>({
  createElement: () => new Element(),
  createText: (text) => new Element(text),
  createComment: () => new Element(),
  setText: (element, text) => {
    element.text = text;
  },
  setElementText: (element, text) => {
    element.text = text;
    element.children = [];
  },
  parentNode: (element) => element.parent,
  nextSibling: (element) =>
    element.parent?.children[element.parent.children.indexOf(element) + 1] ?? null,
  patchProp: (element, key, _old, value: unknown) => {
    element.props[key] = value;
  },
  insert: (element, parent, anchor) => {
    element.parent = parent;
    parent.children.splice(
      anchor ? parent.children.indexOf(anchor) : parent.children.length,
      0,
      element
    );
  },
  remove: (element) => {
    if (element.parent) element.parent.children.splice(element.parent.children.indexOf(element), 1);
  },
});

const originalFetch = globalThis.fetch;
const originalStorage = globalThis.localStorage;
let cleanup = () => {};

afterEach(() => {
  cleanup();
  globalThis.fetch = originalFetch;
  globalThis.localStorage = originalStorage;
});

async function mount(path: string) {
  globalThis.localStorage = {
    getItem: () => null,
    setItem() {},
    removeItem() {},
    clear() {},
    key: () => null,
    length: 0,
  };
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/plans', name: 'workout-plans', component: WorkoutPlanListView },
      { path: '/plans/new', name: 'workout-plan-create', component: WorkoutPlanView },
      { path: '/plans/:id', name: 'workout-plan-detail', component: WorkoutPlanView },
    ],
  });
  await router.push(path);
  const component = path === '/plans' ? WorkoutPlanListView : WorkoutPlanView;
  const app = renderer.createApp({ render: () => h(component) });
  const pinia = createPinia();
  const i18n = createAppI18n('en');
  app.use(pinia);
  app.use(i18n);
  app.use(router);
  useUserStore(pinia).token = 'token';
  const root = new Element();
  app.mount(root);
  cleanup = () => app.unmount();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
  const content = (element: Element = root): string =>
    [element.text, ...element.children.map((child) => content(child))].join(' ');
  const all = (element: Element = root): Element[] => [
    element,
    ...element.children.flatMap((child) => all(child)),
  ];
  return { all, content, i18n };
}

test('workout plan counts switch the language without changing plan names', async () => {
  const entries = [
    { id: 1, exercise_id: 'squat' },
    { id: 2, exercise_id: 'squat' },
  ];
  globalThis.fetch = stubFetch(async () =>
    Response.json({
      data: [
        { id: 'mornings', name: 'Morning', entries: entries.slice(0, 1) },
        { id: 'evenings', name: 'Evening', entries },
      ],
    })
  );
  const view = await mount('/plans');
  expect(view.content()).toContain('1 exercise');
  expect(view.content()).toContain('2 exercises');

  view.i18n.global.locale.value = 'de';
  await nextTick();
  expect(view.content()).toContain('1 Übung');
  expect(view.content()).toContain('2 Übungen');
  expect(view.content()).toContain('Morning');
  expect(view.content()).toContain('Evening');
});

test('saved exercise targets use locale number formatting while exercise labels stay intact', async () => {
  globalThis.fetch = stubFetch(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith('/activities')) return Response.json({ data: [] });
    if (url.endsWith('/exercises')) {
      return Response.json({
        data: [
          { id: 'squat', name: 'Catalog squat', code: 'squat', is_active: false, muscles: [] },
        ],
      });
    }
    return Response.json({
      id: 'mornings',
      name: 'Morning',
      entries: [{ id: 1, exercise_id: 'squat', sets: 2, repetitions: 3, weight: 12.5 }],
    });
  });
  const view = await mount('/plans/mornings');
  expect(view.content()).toContain('12.5 kg');

  view.i18n.global.locale.value = 'de';
  await nextTick();
  expect(view.content()).toContain('12,5 kg');
  expect(view.content()).toContain('(inaktiv)');
  expect(view.content()).toContain('Catalog squat');
});

test('a loaded workout plan error switches languages and keeps server details', async () => {
  globalThis.fetch = stubFetch(async () =>
    Response.json({ detail: 'Backend detail' }, { status: 500 })
  );
  const view = await mount('/plans');
  expect(view.content()).toContain('Failed to load workout plans. Backend detail');

  view.i18n.global.locale.value = 'de';
  await nextTick();
  expect(view.content()).toContain(
    'Die Trainingspläne konnten nicht geladen werden. Backend detail'
  );
});

test('a blank required plan name focuses the field and shows a localized error', async () => {
  globalThis.fetch = stubFetch(async () => Response.json({ data: [] }));
  const view = await mount('/plans/new');
  view.i18n.global.locale.value = 'de';
  await nextTick();
  const input = view.all().find((node) => node.props.id === 'plan-name')!;
  expect(input.props.required).toBe('');

  let prevented = false;
  const onInvalid = input.props.onInvalid as
    ((event: { currentTarget: Element; preventDefault(): void }) => void) | undefined;
  onInvalid?.({
    currentTarget: input,
    preventDefault() {
      prevented = true;
    },
  });
  await nextTick();

  expect(view.content()).toContain('Gib einen Plannamen ein.');
  expect(input.props['aria-describedby']).toBe('name-error');
  expect(input.focused).toBe(true);
  expect(prevented).toBe(true);
});
