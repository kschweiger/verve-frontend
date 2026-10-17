import '../helpers/vueComponents';
import { afterEach, expect, test } from 'bun:test';
import { createSSRApp, h } from 'vue';
import { createPinia } from 'pinia';
import { renderToString } from '@vue/server-renderer';
const { default: ActivityGallery } = await import('../../src/components/ActivityGallery.vue');

const originalStorage = globalThis.localStorage;
afterEach(() => {
  globalThis.localStorage = originalStorage;
});
test('gallery photos are named buttons and the lightbox is a native dialog with a close control', async () => {
  globalThis.localStorage = {
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
    clear: () => undefined,
    key: () => null,
    length: 0,
  };
  const app = createSSRApp({
    render: () =>
      h(ActivityGallery, {
        activityId: 'activity-1',
        images: [
          { id: 'photo-1', url: 'photo-1.png' },
          { id: 'photo-2', url: 'photo-2.png' },
        ],
      }),
  });
  app.use(createPinia());
  const html = await renderToString(app);
  expect(html).toMatch(/<button[^>]*aria-label="Open photo 1"/);
  expect(html).toMatch(/<button[^>]*aria-label="Open photo 2"/);
  expect(html).toMatch(/<dialog[^>]*aria-label="Activity photo viewer"/);
  expect(html).toContain('aria-label="Close photo viewer"');
});
