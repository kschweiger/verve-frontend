import { createI18n } from 'vue-i18n';
import type { SupportedLocale } from '@/types/api';
import * as navigation from './navigation';
import * as auth from './auth';
import * as settings from './settings';
import * as activities from './activities';
import * as calendar from './calendar';
import * as dashboard from './dashboard';

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
        activities: activities.en,
        calendar: calendar.en,
        dashboard: dashboard.en,
        language: {
          en: 'English',
          de: 'German',
        },
      },
      de: {
        navigation: navigation.de,
        auth: auth.de,
        settings: settings.de,
        activities: activities.de,
        calendar: calendar.de,
        dashboard: dashboard.de,
        language: {
          en: 'Englisch',
          de: 'Deutsch',
        },
      },
    },
  });
}
