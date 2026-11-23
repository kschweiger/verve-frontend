import { describe, expect, test } from 'bun:test';
import { resolveLocale, createLocalePreference } from '../../src/i18n/locale';

describe('locale resolution', () => {
  test('prefers the device selection, then account, then supported browser languages', () => {
    expect(resolveLocale('de', 'en', ['en-US'])).toBe('de');
    expect(resolveLocale('invalid', 'de', ['en-US'])).toBe('de');
    expect(resolveLocale(null, null, ['fr-FR', 'DE-ch'])).toBe('de');
    expect(resolveLocale(null, null, ['fr-FR'])).toBe('en');
  });

  test('persists selection, resets to account, and tolerates storage errors', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
      removeItem: (key: string) => {
        values.delete(key);
      },
    };
    const preference = createLocalePreference(storage, ['en-US']);
    preference.accountLocale.value = 'de';
    expect(preference.locale.value).toBe('de');
    preference.select('en');
    expect(createLocalePreference(storage, ['de']).locale.value).toBe('en');
    preference.select('auto');
    expect(preference.locale.value).toBe('de');
    preference.accountLocale.value = null;
    expect(preference.locale.value).toBe('en');
    const broken = createLocalePreference(
      {
        getItem: () => {
          throw Error();
        },
        setItem: () => {
          throw Error();
        },
        removeItem: () => {
          throw Error();
        },
      },
      []
    );
    broken.select('de');
    expect(broken.locale.value).toBe('de');
    broken.select('auto');
    expect(broken.locale.value).toBe('en');
  });
});
