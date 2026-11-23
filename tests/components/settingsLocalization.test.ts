import '../helpers/vueComponents';
import { expect, test } from 'bun:test';
import { createSSRApp, h } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { createAppI18n } from '../../src/i18n';

const { default: PasswordChangeForm } =
  await import('../../src/components/forms/PasswordChangeForm.vue');

test('renders password form labels in German', async () => {
  const app = createSSRApp({ render: () => h(PasswordChangeForm) });
  app.use(createAppI18n('de'));
  const html = await renderToString(app);
  expect(html).toContain('Aktuelles Passwort');
  expect(html).toContain('Neues Passwort bestätigen');
});
