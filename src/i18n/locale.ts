import { computed, ref, type InjectionKey } from 'vue';
import type { SupportedLocale } from '@/types/api';

const storageKey = 'verve.locale';
type PreferenceStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
type Selection = SupportedLocale | 'auto';

function supported(value: string | null | undefined): SupportedLocale | null {
  return value === 'en' || value === 'de' ? value : null;
}

export function resolveLocale(
  device: string | null,
  account: string | null,
  languages: readonly string[]
): SupportedLocale {
  const preferred = supported(device) ?? supported(account);
  if (preferred) return preferred;
  for (const language of languages) {
    const match = supported(language.toLowerCase().split('-')[0]);
    if (match) return match;
  }
  return 'en';
}

export function createLocalePreference(
  storage: PreferenceStorage | undefined,
  languages: readonly string[]
) {
  let saved: string | null = null;
  try {
    saved = storage?.getItem(storageKey) ?? null;
  } catch {
    /* Storage may be unavailable. */
  }
  const deviceLocale = ref<SupportedLocale | null>(supported(saved));
  const accountLocale = ref<string | null>(null);
  const locale = computed(() => resolveLocale(deviceLocale.value, accountLocale.value, languages));
  const selection = computed<Selection>(() => deviceLocale.value ?? 'auto');
  function select(value: Selection) {
    deviceLocale.value = value === 'auto' ? null : value;
    try {
      if (value === 'auto') storage?.removeItem(storageKey);
      else storage?.setItem(storageKey, value);
    } catch {
      /* Keep the in-memory preference when storage fails. */
    }
  }
  return { accountLocale, locale, selection, select };
}

export type LocalePreference = ReturnType<typeof createLocalePreference>;
export const localePreferenceKey: InjectionKey<LocalePreference> = Symbol('localePreference');
