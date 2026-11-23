import { createI18n } from 'vue-i18n';
import type { SupportedLocale } from '@/types/api';
import * as navigation from './navigation';
import * as auth from './auth';
import * as settings from './settings';

export function createAppI18n(initialLocale: SupportedLocale = 'en') {
  return createI18n({
    legacy: false,
    locale: initialLocale,
    fallbackLocale: 'en',
    messages: {
      en: {
        navigation: navigation.en,
        auth: auth.en,
        settings: settings.en,
        language: {
          en: 'English',
          de: 'German',
        },
      },
      de: {
        navigation: navigation.de,
        auth: auth.de,
        settings: settings.de,
        language: {
          en: 'Englisch',
          de: 'Deutsch',
        },
      },
    },
  });
}
