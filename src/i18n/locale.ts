import type { SupportedLocale } from '@/types/api';

export function resolveLocale(
  account: SupportedLocale | null,
  languages: readonly string[]
): SupportedLocale {
  if (account) return account;
  for (const language of languages) {
    const code = language.toLowerCase().split('-')[0];
    if (code === 'en' || code === 'de') return code;
  }
  return 'en';
}
