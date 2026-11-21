import { useClientRendering } from '../helpers/vueComponents';
import { stubFetch } from '../helpers/fetch';
import { afterEach, expect, test } from 'bun:test';
import { createRenderer, h, nextTick, ref } from 'vue';
import { createPinia } from 'pinia';
import { useUserStore } from '../../src/stores/auth';
useClientRendering(import.meta.dir + '/../../src/components/ActivityWorkout.vue');
useClientRendering(import.meta.dir + '/../../src/components/WorkoutExerciseFields.vue');
const { default: ActivityWorkout } = await import('../../src/components/ActivityWorkout.vue');
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
  globals.Document = class {};
  globals.ShadowRoot = class {};
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
  const app = renderer.createApp({ render: () => h(ActivityWorkout, { activityId: id.value }) });
  app.use(pinia);
  app.component('router-link', { render: () => h('a', 'Planning') });
  useUserStore(pinia).token = 'token';
  const root = new Element('root');
  app.mount(root);
  cleanup = () => app.unmount();
  const all = (node: Element): Element[] => [node, ...node.children.flatMap(all)];
  const content = () =>
    all(root)
      .map((el) => el.text)
      .join(' ');
  return { id, root, all, content, pinia };
}
test('saved empty snapshot does not offer template application', async () => {
  globalThis.fetch = stubFetch(async (input: RequestInfo | URL) =>
    String(input).endsWith('/exercises')
      ? Response.json({ data: [] })
      : Response.json({ id: 'snapshot', activity_id: 'one', entries: [] })
  );
  const ui = mount();
  await flush();
  expect(ui.content()).toContain('This workout has no exercises.');
  expect(ui.content()).not.toContain('Apply plan');
});
test('missing snapshot offers planning while other errors offer local retry', async () => {
  globalThis.fetch = stubFetch(async (input: RequestInfo | URL) =>
    String(input).endsWith('/exercise_plans')
      ? Response.json({ data: [] })
      : new Response('', { status: 404 })
  );
  const ui = mount();
  await flush();
  expect(ui.content()).toContain('No workout plans available.');
  globalThis.fetch = stubFetch(async () => new Response('', { status: 500 }));
  ui.id.value = 'two';
  await flush();
  expect(ui.content()).toContain('Retry workout');
  expect(ui.content()).not.toContain('No workout plans available.');
});
test('a stale snapshot cannot replace the next activity', async () => {
  let finish: ((response: Response) => void) | undefined;
  globalThis.fetch = stubFetch(async (input: RequestInfo | URL) =>
    String(input).endsWith('/one')
      ? new Promise<Response>((resolve) => {
          finish = resolve;
        })
      : String(input).endsWith('/exercises')
        ? Response.json({ data: [] })
        : Response.json({ id: 'new', activity_id: 'two', entries: [] })
  );
  const ui = mount();
  ui.id.value = 'two';
  await flush();
  finish?.(new Response('', { status: 500 }));
  await flush();
  expect(ui.content()).toContain('This workout has no exercises.');
  expect(ui.content()).not.toContain('Retry workout');
});

test('a conflict reloads the existing snapshot and does not reapply', async () => {
  let gets = 0;
  let posts = 0;
  globalThis.fetch = stubFetch(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith('/exercise_plans'))
      return Response.json({ data: [{ id: 'plan', name: 'Plan', entries: [] }] });
    if (init?.method === 'POST') {
      posts++;
      return new Response('', { status: 409 });
    }
    gets++;
    return gets === 1
      ? new Response('', { status: 404 })
      : Response.json({ id: 'snapshot', activity_id: 'one', entries: [] });
  });
  const ui = mount();
  await flush();
  const select = ui.all(ui.root).find((el) => el.tag === 'select')!;
  (select.props['onUpdate:modelValue'] as (value: string) => void)('plan');
  await nextTick();
  const button = ui.all(ui.root).find((el) => el.tag === 'button' && el.text === 'Apply plan')!;
  await (button.props.onClick as () => Promise<void>)();
  await flush();
  expect(posts).toBe(1);
  expect(gets).toBe(2);
  expect(ui.content()).toContain('The existing workout has been loaded.');
  expect(ui.content()).toContain('This workout has no exercises.');
  expect(ui.content()).not.toContain('Apply plan');
});

test('account change invalidates old work without requesting the old activity for the new account', async () => {
  let finish: ((response: Response) => void) | undefined;
  let requests = 0;
  globalThis.fetch = stubFetch(async () => {
    requests++;
    return new Promise<Response>((resolve) => {
      finish = resolve;
    });
  });
  const ui = mount();
  useUserStore(ui.pinia).token = 'other-token';
  finish?.(Response.json({ id: 'old', activity_id: 'one', entries: [] }));
  await flush();
  expect(requests).toBe(1);
  expect(ui.content()).not.toContain('This workout has no exercises.');
});

test('applying a template displays the returned independent snapshot including zero weight', async () => {
  globalThis.fetch = stubFetch(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith('/exercise_plans'))
      return Response.json({ data: [{ id: 'plan', name: 'Plan', entries: [] }] });
    if (init?.method === 'POST')
      return Response.json(
        {
          id: 'snapshot',
          activity_id: 'one',
          entries: [{ id: 1, exercise_id: 'exercise', weight: 0 }],
        },
        { status: 201 }
      );
    if (url.endsWith('/exercises')) return Response.json({ data: [] });
    if (url.endsWith('/exercises/exercise'))
      return Response.json({
        id: 'exercise',
        name: 'Squat',
        is_active: false,
        code: 'squat',
        muscles: [],
      });
    return new Response('', { status: 404 });
  });
  const ui = mount();
  await flush();
  const select = ui.all(ui.root).find((el) => el.tag === 'select')!;
  (select.props['onUpdate:modelValue'] as (value: string) => void)('plan');
  await nextTick();
  const button = ui.all(ui.root).find((el) => el.tag === 'button' && el.text === 'Apply plan')!;
  await (button.props.onClick as () => Promise<void>)();
  await flush();
  expect(ui.content()).toContain('Squat');
  expect(ui.content()).toContain('(inactive)');
  expect(ui.content()).toContain('0 kg');
  expect(ui.content()).not.toContain('Apply plan');
});

test('a rejected session offers sign-in recovery without retrying the apply request', async () => {
  let posts = 0;
  globalThis.fetch = stubFetch(async (input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input).endsWith('/exercise_plans')) {
      return Response.json({ data: [{ id: 'plan', name: 'Plan', entries: [] }] });
    }
    if (init?.method === 'POST') {
      posts++;
      return Response.json({ detail: 'Could not validate credentials' }, { status: 403 });
    }
    return new Response('', { status: 404 });
  });
  const ui = mount();
  await flush();
  const select = ui.all(ui.root).find((element) => element.tag === 'select')!;
  (select.props['onUpdate:modelValue'] as (value: string) => void)('plan');
  await nextTick();
  const apply = ui
    .all(ui.root)
    .find((element) => element.tag === 'button' && element.text === 'Apply plan')!;
  await (apply.props.onClick as () => Promise<void>)();
  await flush();

  expect(ui.content()).toContain('Your sign-in is no longer valid.');
  expect(ui.content()).not.toContain('Could not validate credentials');
  const signIn = ui
    .all(ui.root)
    .find((element) => element.tag === 'button' && element.text.trim() === 'Sign in again')!;
  expect(useUserStore(ui.pinia).isAuthenticated).toBe(true);
  (signIn.props.onClick as () => void)();
  expect(useUserStore(ui.pinia).isAuthenticated).toBe(false);
  expect(posts).toBe(1);
});

test('editing preserves the saved snapshot on cancel and a failed replacement', async () => {
  let patches = 0;
  globalThis.fetch = stubFetch(async (input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === 'PATCH') {
      patches++;
      return new Response('', { status: 404 });
    }
    if (String(input).endsWith('/exercises')) return Response.json({ data: [] });
    if (String(input).endsWith('/exercises/exercise'))
      return Response.json({
        id: 'exercise',
        code: 'squat',
        name: 'Squat',
        is_active: false,
        muscles: [],
      });
    return Response.json({
      id: 'snapshot',
      activity_id: 'one',
      entries: [{ id: 1, exercise_id: 'exercise', weight: 0 }],
    });
  });
  const ui = mount();
  await flush();
  const button = (label: string) =>
    ui.all(ui.root).find((el) => el.tag === 'button' && el.text.trim() === label)!;
  (button('Edit workout').props.onClick as () => void)();
  await flush();
  (button('Remove').props.onClick as () => void)();
  await nextTick();
  (button('Cancel').props.onClick as () => void)();
  await nextTick();
  expect(ui.content()).toContain('0 kg');
  expect(patches).toBe(0);
  (button('Edit workout').props.onClick as () => void)();
  await flush();
  (button('Remove').props.onClick as () => void)();
  await nextTick();
  const form = ui.all(ui.root).find((el) => el.tag === 'form')!;
  await (form.props.onSubmit as (event: { preventDefault(): void }) => Promise<void>)({
    preventDefault() {},
  });
  await flush();
  expect(patches).toBe(1);
  expect(ui.content()).toContain('Failed to save workout.');
  expect(ui.content()).toContain('Cancel');
  expect(ui.content()).not.toContain('No workout plans available.');
});

test('saving an edited workout replaces entries and displays the returned snapshot', async () => {
  let body: unknown;
  let catalogReads = 0;
  globalThis.fetch = stubFetch(async (input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === 'PATCH') {
      body = JSON.parse(String(init.body));
      return Response.json({
        id: 'snapshot',
        activity_id: 'one',
        source_plan_id: 'plan',
        entries: [
          { id: 9, exercise_id: 'old', sets: 3, repetitions: null, weight: 0 },
          { id: 10, exercise_id: 'new', sets: null, repetitions: null, weight: null },
        ],
      });
    }
    if (String(input).endsWith('/exercises')) {
      const active = { id: 'new', code: 'new', name: 'New exercise', is_active: true, muscles: [] };
      const retired = { ...active, id: 'retired', code: 'retired', name: 'Retired exercise' };
      return Response.json({ data: ++catalogReads === 1 ? [active, retired] : [active] });
    }
    if (String(input).endsWith('/exercises/old'))
      return Response.json({
        id: 'old',
        code: 'old',
        name: 'Old exercise',
        is_active: false,
        muscles: [],
      });
    return Response.json({
      id: 'snapshot',
      activity_id: 'one',
      source_plan_id: 'plan',
      entries: [{ id: 1, exercise_id: 'old', weight: 0 }],
    });
  });
  const ui = mount();
  await flush();
  const button = (label: string) =>
    ui.all(ui.root).find((el) => el.tag === 'button' && el.text.trim() === label)!;
  (button('Edit workout').props.onClick as () => void)();
  await flush();
  const sets = ui.all(ui.root).find((el) => el.props['aria-label'] === 'Sets for row 1')!;
  sets.value = 3;
  (sets.props['onUpdate:modelValue'] as (value: number) => void)(3);
  const search = ui.all(ui.root).find((el) => el.tag === 'input' && el.props.type === 'search')!;
  search.value = 'Retired';
  (search.props['onUpdate:modelValue'] as (value: string) => void)('Retired');
  await nextTick();
  expect(ui.content()).not.toContain('Retired exercise');
  search.value = 'New';
  (search.props['onUpdate:modelValue'] as (value: string) => void)('New');
  await nextTick();
  (button('New exercise').props.onClick as () => void)();
  await nextTick();
  const form = ui.all(ui.root).find((el) => el.tag === 'form')!;
  await (form.props.onSubmit as (event: { preventDefault(): void }) => Promise<void>)({
    preventDefault() {},
  });
  await flush();
  expect(body).toEqual({
    entries: [
      { exercise_id: 'old', sets: 3, repetitions: null, weight: 0 },
      { exercise_id: 'new', sets: null, repetitions: null, weight: null },
    ],
  });
  expect(ui.content()).toContain('3 sets');
  expect(ui.content()).toContain('New exercise');
  expect(ui.content()).toContain('Edit workout');
});

test('a rejected save keeps unsaved targets visible until the user signs out', async () => {
  let patches = 0;
  globalThis.fetch = stubFetch(async (input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === 'PATCH') {
      patches++;
      return Response.json({ detail: 'Could not validate credentials' }, { status: 403 });
    }
    if (String(input).endsWith('/exercises')) {
      return Response.json({
        data: [{ id: 'exercise', code: 'squat', name: 'Squat', is_active: true, muscles: [] }],
      });
    }
    return Response.json({
      id: 'snapshot',
      activity_id: 'one',
      entries: [{ id: 1, exercise_id: 'exercise', sets: 2 }],
    });
  });
  const ui = mount();
  await flush();
  const button = (label: string) =>
    ui.all(ui.root).find((el) => el.tag === 'button' && el.text.trim() === label)!;
  (button('Edit workout').props.onClick as () => void)();
  await flush();
  const target = () => ui.all(ui.root).find((el) => el.props['aria-label'] === 'Sets for row 1');
  const sets = target()!;
  sets.value = 3;
  (sets.props['onUpdate:modelValue'] as (value: number) => void)(3);
  await nextTick();
  const form = ui.all(ui.root).find((el) => el.tag === 'form')!;
  const submit = form.props.onSubmit as (event: { preventDefault(): void }) => Promise<void>;
  await submit({ preventDefault() {} });
  await flush();

  expect(target()?.value).toBe(3);
  expect(ui.content()).toContain('Signing in again discards this draft.');
  expect(useUserStore(ui.pinia).isAuthenticated).toBe(true);
  await submit({ preventDefault() {} });
  expect(patches).toBe(1);
  (button('Sign in again').props.onClick as () => void)();
  expect(useUserStore(ui.pinia).isAuthenticated).toBe(false);
});

test('quick delete removes only the chosen saved entry after a 204 response', async () => {
  let finishDelete: ((response: Response) => void) | undefined;
  const deletions: { url: string; options: RequestInit | undefined }[] = [];
  globalThis.fetch = stubFetch(async (input: RequestInfo | URL, options?: RequestInit) => {
    const url = String(input);
    if (options?.method === 'DELETE') {
      deletions.push({ url, options });
      if (deletions.length > 1) return new Response(null, { status: 204 });
      return new Promise<Response>((resolve) => {
        finishDelete = resolve;
      });
    }
    if (url.endsWith('/exercises')) {
      return Response.json({
        data: [{ id: 'exercise', code: 'squat', name: 'Squat', is_active: true, muscles: [] }],
      });
    }
    return Response.json({
      id: 'snapshot',
      activity_id: 'one',
      entries: [
        { id: 33, exercise_id: 'exercise', weight: 20 },
        { id: 34, exercise_id: 'exercise', weight: 30 },
      ],
    });
  });
  const ui = mount();
  await flush();
  const deleteFirstRow = () =>
    ui.all(ui.root).find((el) => el.props['aria-label'] === 'Delete Squat, row 1')!;
  const remove = (deleteFirstRow().props.onClick as () => Promise<void>)();
  await nextTick();
  expect(ui.content()).toContain('20 kg');
  expect(ui.all(ui.root).find((el) => el.text.trim() === 'Edit workout')?.props.disabled).toBe(
    true
  );
  finishDelete?.(new Response(null, { status: 204 }));
  await remove;
  await flush();

  expect(deletions[0]?.url).toMatch(/\/activity_exercise_plans\/one\/entry\?entry_id=33$/);
  expect(deletions[0]?.options?.headers).toEqual({ Authorization: 'Bearer token' });
  expect(deletions[0]?.options?.body).toBeUndefined();
  expect(ui.content()).not.toContain('20 kg');
  expect(ui.content()).toContain('30 kg');

  await (deleteFirstRow().props.onClick as () => Promise<void>)();
  await flush();
  expect(deletions[1]?.url).toMatch(/\?entry_id=34$/);
  expect(ui.content()).toContain('This workout has no exercises.');
  expect(ui.content()).toContain('Edit workout');
});

test('a failed quick delete keeps the saved entry visible', async () => {
  globalThis.fetch = stubFetch(async (input: RequestInfo | URL, options?: RequestInit) => {
    if (options?.method === 'DELETE') {
      return Response.json({ detail: 'The exercise could not be removed.' }, { status: 500 });
    }
    if (String(input).endsWith('/exercises')) {
      return Response.json({
        data: [{ id: 'exercise', code: 'squat', name: 'Squat', is_active: true, muscles: [] }],
      });
    }
    return Response.json({
      id: 'snapshot',
      activity_id: 'one',
      entries: [{ id: 33, exercise_id: 'exercise', weight: 20 }],
    });
  });
  const ui = mount();
  await flush();
  const button = ui.all(ui.root).find((el) => el.props['aria-label'] === 'Delete Squat, row 1')!;
  await (button.props.onClick as () => Promise<void>)();
  await flush();
  expect(ui.content()).toContain('The exercise could not be removed.');
  expect(ui.content()).toContain('20 kg');
  expect(button.props['aria-disabled']).toBe(false);
});

test('a stale saved entry refreshes the workout after quick-delete 404', async () => {
  let snapshotReads = 0;
  globalThis.fetch = stubFetch(async (input: RequestInfo | URL, options?: RequestInit) => {
    if (options?.method === 'DELETE') return new Response(null, { status: 404 });
    if (String(input).endsWith('/exercises')) {
      return Response.json({
        data: [{ id: 'exercise', code: 'squat', name: 'Squat', is_active: true, muscles: [] }],
      });
    }
    return Response.json({
      id: 'snapshot',
      activity_id: 'one',
      entries: [
        ++snapshotReads === 1
          ? { id: 33, exercise_id: 'exercise', weight: 20 }
          : { id: 34, exercise_id: 'exercise', weight: 30 },
      ],
    });
  });
  const ui = mount();
  await flush();
  const button = ui.all(ui.root).find((el) => el.props['aria-label'] === 'Delete Squat, row 1')!;
  await (button.props.onClick as () => Promise<void>)();
  await flush();
  expect(ui.content()).toContain('The exercise list was refreshed.');
  expect(ui.content()).not.toContain('20 kg');
  expect(ui.content()).toContain('30 kg');
});

test('save as plan keeps a conflicting name for retry and confirms success in the workout', async () => {
  let posts = 0;
  globalThis.fetch = stubFetch(async (input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === 'POST') {
      expect(String(input)).toContain('/activity_exercise_plans/one/save_as_template');
      posts++;
      return posts === 1
        ? Response.json({ detail: 'duplicate' }, { status: 409 })
        : Response.json({ id: 'created-plan', name: 'Morning', entries: [] }, { status: 201 });
    }
    return Response.json({
      id: 'snapshot',
      activity_id: 'one',
      source_plan_id: 'old',
      entries: [],
    });
  });
  const ui = mount();
  await flush();
  const button = ui
    .all(ui.root)
    .find(
      (el) =>
        el.tag === 'button' && ui.all(el).some((child) => child.text.includes('Save as new plan'))
    );
  expect(button).toBeDefined();
  await (button!.props.onClick as () => Promise<void>)();
  await nextTick();
  expect(ui.content()).toContain('replacing its current plan link');
  const input = ui
    .all(ui.root)
    .find((el) => el.tag === 'input' && el.props.id === 'new-plan-name')!;
  input.value = 'Morning';
  input.listeners.input?.({ target: input } as unknown as Event);
  const form = ui.all(ui.root).find((el) => el.tag === 'form')!;
  const submit = form.props.onSubmit as (event: { preventDefault(): void }) => Promise<void>;
  await submit({ preventDefault() {} });
  await nextTick();
  expect(ui.content()).toContain('A plan with this name already exists.');
  expect(input.value).toBe('Morning');
  input.value = 'Evening';
  input.listeners.input?.({ target: input } as unknown as Event);
  await submit({ preventDefault() {} });
  await nextTick();
  expect(ui.content()).toContain('Workout saved as a new plan.');
  expect(ui.all(ui.root).some((el) => el.tag === 'dialog')).toBe(false);
  expect(ui.all(ui.root).some((el) => el.tag === 'a')).toBe(false);
});
