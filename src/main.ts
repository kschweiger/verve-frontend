import './assets/main.css';

import { createApp, markRaw, watch } from 'vue';
import { createPinia } from 'pinia';

import App from './App.vue';
import router from './router';
import { createAppI18n } from './i18n';
import { resolveLocale } from './i18n/locale';
import { useUserStore } from './stores/auth';
import { useSettingsStore } from './stores/settings';
import { useTypeStore } from './stores/types';

const app = createApp(App);
const pinia = createPinia();

// Add router to pinia store context
pinia.use(({ store }) => {
  store.$router = markRaw(router);
});

app.use(pinia);
const userStore = useUserStore(pinia);
const settingsStore = useSettingsStore(pinia);
const typeStore = useTypeStore(pinia);
const i18n = createAppI18n();
app.use(i18n);
watch(
  () => userStore.token,
  (token) => {
    if (token) void settingsStore.ensureSettings().catch(() => undefined);
  },
  { immediate: true }
);
watch(
  () => resolveLocale(settingsStore.userSettings?.locale ?? null, navigator.languages),
  (locale) => {
    i18n.global.locale.value = locale;
    document.documentElement.lang = locale;
    typeStore.setLocale(locale);
  },
  { immediate: true, flush: 'sync' }
);
app.use(router);

app.mount('#app');
