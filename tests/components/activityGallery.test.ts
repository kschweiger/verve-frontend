import '../helpers/vueComponents';
import { afterEach, expect, test } from 'bun:test';
import { createSSRApp, h } from 'vue';
import { createPinia } from 'pinia';
import { renderToString } from '@vue/server-renderer';
import { createAppI18n } from '../../src/i18n';
const { default: ActivityGallery } = await import('../../src/components/ActivityGallery.vue');

const originalStorage = globalThis.localStorage;
afterEach(() => {
  globalThis.localStorage = originalStorage;
});
async function renderGallery(locale: 'en' | 'de') {
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
  app.use(createAppI18n(locale));
  return renderToString(app);
}
test('gallery photos are named buttons and the lightbox is a native dialog with a close control', async () => {
  const html = await renderGallery('en');
  expect(html).toMatch(/<button[^>]*aria-label="Open photo 1"/);
  expect(html).toMatch(/<button[^>]*aria-label="Open photo 2"/);
  expect(html).toMatch(/<dialog[^>]*aria-label="Activity photo viewer"/);
  expect(html).toContain('aria-label="Close photo viewer"');
});

test('gallery controls use German accessible names', async () => {
  const html = await renderGallery('de');
  expect(html).toMatch(/<button[^>]*aria-label="Foto 1 öffnen"/);
  expect(html).toMatch(/<dialog[^>]*aria-label="Aktivitätsfotos ansehen"/);
  expect(html).toContain('aria-label="Fotoansicht schließen"');
});
