import { useClientRendering } from '../helpers/vueComponents';
import { afterEach, expect, test } from 'bun:test';
import { createRenderer, h, nextTick, ref } from 'vue';
import { createPinia } from 'pinia';
import { stubFetch } from '../helpers/fetch';
import { useUserStore } from '../../src/stores/auth';
useClientRendering(import.meta.dir + '/../../src/components/ActivityExportButton.vue');
const { default: ExportButton } = await import('../../src/components/ActivityExportButton.vue');

class Element {
  children: Element[] = [];
  parent: Element | null = null;
  props: Record<string, unknown> = {};
  text = '';
  constructor(readonly tag: string) {}
  focus() {
    recordFocus(this);
  }
  contains(node: Element): boolean {
    return this === node || this.children.some((child) => child.contains(node));
  }
  querySelectorAll(): Element[] {
    return this.children.flatMap((child) => [
      ...(child.props.role === 'menuitem' ? [child] : []),
      ...child.querySelectorAll(),
    ]);
  }
}
let focused: Element | null = null;
function recordFocus(element: Element) {
  focused = element;
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
const originals = {
  document: globalThis.document,
  Node: globalThis.Node,
  fetch: globalThis.fetch,
  storage: globalThis.localStorage,
  create: URL.createObjectURL,
  revoke: URL.revokeObjectURL,
};
let cleanup = () => {};
afterEach(() => {
  cleanup();
  Object.assign(globalThis, {
    document: originals.document,
    Node: originals.Node,
    fetch: originals.fetch,
    localStorage: originals.storage,
  });
  URL.createObjectURL = originals.create;
  URL.revokeObjectURL = originals.revoke;
});
function mount() {
  const downloads: string[] = [];
  const listeners = new Map<string, (event: unknown) => void>();
  Object.assign(globalThis, {
    Node: Element,
    document: {
      get activeElement() {
        return focused;
      },
      addEventListener: (name: string, fn: (event: unknown) => void) => listeners.set(name, fn),
      removeEventListener: (name: string) => listeners.delete(name),
      createElement: () => ({
        download: '',
        click() {
          downloads.push(this.download);
        },
        remove() {},
      }),
      body: { append() {} },
    },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  });
  URL.createObjectURL = () => 'blob:test';
  // The delayed cleanup must not call the restored native implementation.
  const revoked: string[] = [];
  URL.revokeObjectURL = (url) => {
    revoked.push(url);
  };
  const pinia = createPinia();
  const id = ref('one');
  const app = renderer.createApp({ render: () => h(ExportButton, { activityId: id.value }) });
  app.use(pinia);
  useUserStore(pinia).token = 'token';
  const root = new Element('root');
  app.mount(root);
  cleanup = () => app.unmount();
  function all(node: Element): Element[] {
    return [node, ...node.children.flatMap(all)];
  }
  const buttons = () => all(root).filter((el) => el.tag === 'button');
  const click = (el: Element) => (el.props.onClick as () => Promise<void>)();
  return { id, app, pinia, root, buttons, click, downloads, listeners, revoked, all };
}
test('split button menu supports focus, keyboard selection, fixed default and cleanup', async () => {
  const ui = mount();
  const urls: string[] = [];
  globalThis.fetch = stubFetch(async (url: Parameters<typeof fetch>[0]) => {
    urls.push(String(url));
    return new Response('file');
  });
  await ui.click(ui.buttons()[1]!);
  expect(focused?.text.trim()).toBe('Verve GeoJSON (.geojson)');
  const menu = ui.all(ui.root).find((el) => el.props.role === 'menu')!;
  (menu.props.onKeydown as (event: unknown) => void)({ key: 'End', preventDefault() {} });
  expect(focused?.text.trim()).toBe('GPX (.gpx)');
  await ui.click(ui.buttons()[3]!);
  expect(ui.downloads).toEqual(['activity-one.gpx']);
  expect(focused?.props['aria-label']).toBe('Choose export format');
  await ui.click(ui.buttons()[0]!);
  expect(urls[1]).toEndWith('output_format=geojson');
  expect(ui.downloads[1]).toBe('activity-one.geojson');
  await new Promise((resolve) => setTimeout(resolve, 1100));
  expect(ui.revoked).toEqual(['blob:test', 'blob:test']);
});
test('prevents duplicate requests, reports failure and permits retry', async () => {
  const ui = mount();
  let finish!: (response: Response) => void;
  let calls = 0;
  globalThis.fetch = stubFetch(() => {
    calls++;
    return new Promise((resolve) => {
      finish = resolve;
    });
  });
  const pending = ui.click(ui.buttons()[0]!);
  await nextTick();
  expect(ui.buttons().every((button) => button.props.disabled)).toBe(true);
  await ui.click(ui.buttons()[0]!);
  expect(calls).toBe(1);
  finish(new Response(null, { status: 422 }));
  await pending;
  await nextTick();
  expect(
    ui.all(ui.root).some((el) => el.props.role === 'alert' && el.text.includes('Failed to export'))
  ).toBe(true);
  expect(ui.buttons()[0]!.props.disabled).toBe(false);
});
for (const change of ['activity', 'account', 'unmount'] as const) {
  test(`ignores pending downloads after ${change} change`, async () => {
    const ui = mount();
    let finish!: (response: Response) => void;
    globalThis.fetch = stubFetch(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const pending = ui.click(ui.buttons()[0]!);
    if (change === 'activity') {
      ui.id.value = 'two';
      await nextTick();
    }
    if (change === 'account') useUserStore(ui.pinia).token = 'other';
    if (change === 'unmount') {
      ui.app.unmount();
      cleanup = () => {};
    }
    finish(new Response('file'));
    await pending;
    expect(ui.downloads).toEqual([]);
  });
}

test('Escape and outside clicks dismiss the menu; focus leaving permits Tab', async () => {
  const ui = mount();
  await ui.click(ui.buttons()[1]!);
  const menu = ui.all(ui.root).find((el) => el.props.role === 'menu')!;
  (menu.props.onKeydown as (event: unknown) => void)({ key: 'Escape', preventDefault() {} });
  await nextTick();
  expect(ui.buttons()).toHaveLength(2);
  expect(focused?.props['aria-label']).toBe('Choose export format');
  await ui.click(ui.buttons()[1]!);
  ui.listeners.get('pointerdown')?.({ target: new Element('outside') });
  await nextTick();
  expect(ui.buttons()).toHaveLength(2);
  await ui.click(ui.buttons()[1]!);
  const wrapper = ui.root.children[0]!;
  (wrapper.props.onFocusout as (event: unknown) => void)({ relatedTarget: new Element('outside') });
  await nextTick();
  expect(ui.buttons()).toHaveLength(2);
});
