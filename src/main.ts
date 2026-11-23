import './assets/main.css';

import { createApp, markRaw, watch } from 'vue';
import { createPinia } from 'pinia';

import App from './App.vue';
import router from './router';
import { createAppI18n } from './i18n';
import { createLocalePreference, localePreferenceKey } from './i18n/locale';
import { useUserStore } from './stores/auth';
import { useSettingsStore } from './stores/settings';

const app = createApp(App);
const pinia = createPinia();

// Add router to pinia store context
pinia.use(({ store }) => {
  store.$router = markRaw(router);
});

app.use(pinia);
const userStore = useUserStore(pinia);
const settingsStore = useSettingsStore(pinia);
let storage: Storage | undefined;
try {
  storage = window.localStorage;
} catch {
  /* Use an in-memory preference. */
}
const preference = createLocalePreference(storage, navigator.languages);
const i18n = createAppI18n(preference.locale.value);
app.provide(localePreferenceKey, preference);
app.use(i18n);
watch(
  () => settingsStore.userSettings?.locale ?? null,
  (locale) => {
    preference.accountLocale.value = locale;
  },
  { immediate: true, flush: 'sync' }
);
watch(
  () => userStore.token,
  (token) => {
    if (token) void settingsStore.ensureSettings().catch(() => undefined);
  },
  { immediate: true }
);
watch(
  preference.locale,
  (locale) => {
    i18n.global.locale.value = locale;
    document.documentElement.lang = locale;
  },
  { immediate: true, flush: 'sync' }
);
app.use(router);

app.mount('#app');
