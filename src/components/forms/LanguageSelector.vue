<script setup lang="ts">
import { inject } from 'vue';
import { useI18n } from 'vue-i18n';
import { createLocalePreference, localePreferenceKey } from '@/i18n/locale';

const { t } = useI18n();
const preference = inject(localePreferenceKey, () => createLocalePreference(undefined, []), true);
</script>

<template>
  <label class="block text-sm font-semibold text-verve-brown">
    <span class="block mb-1">{{ t('language.label') }}</span>
    <select
      :value="preference.selection.value"
      class="w-full rounded-xl border border-verve-medium bg-white px-3 py-2 text-verve-brown focus-visible:outline-2 focus-visible:outline-verve-dark"
      @change="
        preference.select(($event.target as HTMLSelectElement).value as 'auto' | 'en' | 'de')
      "
    >
      <option value="auto">{{ t('language.auto') }}</option>
      <option value="en">{{ t('language.en') }}</option>
      <option value="de">{{ t('language.de') }}</option>
    </select>
  </label>
</template>
