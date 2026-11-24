import '../helpers/vueComponents';
import { expect, test } from 'bun:test';
import { renderToString } from '@vue/server-renderer';
import { createSSRApp, h } from 'vue';
import { createAppI18n } from '../../src/i18n';

const { default: TrackExtensionDataModal } = await import('../../src/components/TrackExtensionDataModal.vue');

test('the sensor data dialog names each removal action in German', async () => {
  const app = createSSRApp({
    render: () => h(TrackExtensionDataModal, { isOpen: true, extensions: ['heartrate', 'power', 'cadence'] }),
  });
  app.use(createAppI18n('de'));

  const html = await renderToString(app);

  expect(html).toMatch(/role="dialog"[^>]*aria-labelledby="track-extension-data-title"/);
  expect(html).toMatch(/id="track-extension-data-title"[^>]*>\s*Sensordaten\s*<\/h2>/);
  expect(html).toContain('aria-label="Messwerte für Herzfrequenz entfernen"');
  expect(html).toContain('aria-label="Messwerte für Leistung entfernen"');
  expect(html).toContain('aria-label="Messwerte für Kadenz entfernen"');
});
