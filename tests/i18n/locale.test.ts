import { describe, expect, test } from 'bun:test';
import { resolveLocale } from '../../src/i18n/locale';

describe('locale resolution', () => {
  test('uses the account language even when the browser prefers another language', () => {
    expect(resolveLocale('en', ['de-DE'])).toBe('en');
    expect(resolveLocale('de', ['en-US'])).toBe('de');
  });

  test('uses the first supported browser language before account settings are available', () => {
    expect(resolveLocale(null, ['fr-FR', 'DE-ch', 'en-US'])).toBe('de');
    expect(resolveLocale(null, ['en-US', 'de-DE'])).toBe('en');
  });

  test('falls back to English when the browser has no supported language', () => {
    expect(resolveLocale(null, ['fr-FR'])).toBe('en');
    expect(resolveLocale(null, [])).toBe('en');
  });
});
