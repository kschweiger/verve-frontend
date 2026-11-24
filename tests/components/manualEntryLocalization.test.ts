import '../helpers/vueComponents';
import { afterEach, expect, test } from 'bun:test';
import { createSSRApp } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { createPinia } from 'pinia';
import { createAppI18n } from '../../src/i18n';

const { default: ActivityCreateForm } =
  await import('../../src/components/forms/ActivityCreateForm.vue');
const { default: SwimmingMetadataWidget } =
  await import('../../src/components/widgets/SwimmingMetadataWidget.vue');
const originalStorage = globalThis.localStorage;

afterEach(() => {
  globalThis.localStorage = originalStorage;
});

test('manual entry uses German labels and keeps native datetime and number fields', async () => {
  globalThis.localStorage = {
    getItem: () => null,
    setItem() {},
    removeItem() {},
    clear() {},
    key: () => null,
    length: 0,
  };
  const app = createSSRApp(ActivityCreateForm);
  app.use(createPinia());
  app.use(createAppI18n('de'));
  const html = await renderToString(app);
  expect(html).toContain('Aktivität erfassen');
  expect(html).toContain('Datum und Uhrzeit');
  expect(html).toContain('Aktivität speichern');
  expect(html).toContain('aria-label="Aktivitätsformular schließen"');
  expect(html).toContain('type="datetime-local"');
  expect(html).toContain('step="0.01"');
});

test('swim metadata renders the translated style and locale-formatted SWOLF value', async () => {
  const app = createSSRApp(SwimmingMetadataWidget, {
    metadata: {
      averageSwolf: 85.9,
      styles: ['freestyle'],
      sets: [{ index: 0, style: 'freestyle', durationSeconds: 65 }],
    },
  });
  app.use(createAppI18n('de'));
  const html = await renderToString(app);
  expect(html).toContain('Freistil');
  expect(html).toContain('85,9');
  expect(html).toContain('1min 05s');
});
