<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { ref } from 'vue';
import type { PasswordUpdatePayload } from '@/stores/settings';

const { t } = useI18n();

const emit = defineEmits<{
  (e: 'save', payload: PasswordUpdatePayload): void;
  (e: 'cancel'): void;
}>();

const oldPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const error = ref<string | null>(null);

function onSave() {
  error.value = null;
  if (newPassword.value !== confirmPassword.value) {
    error.value = 'passwordMismatch';
    return;
  }
  if (!oldPassword.value || !newPassword.value) {
    error.value = 'fieldsRequired';
    return;
  }
  emit('save', { old_password: oldPassword.value, new_password: newPassword.value });
}
</script>

<template>
  <div class="space-y-4 pt-2">
    <div>
      <label
        for="current-password"
        class="block text-xs font-bold text-verve-brown/60 uppercase mb-1"
        >{{ t('settings.currentPassword') }}</label
      >
      <input
        v-model="oldPassword"
        type="password"
        id="current-password"
        class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white"
      />
    </div>

    <div>
      <label
        for="new-password"
        class="block text-xs font-bold text-verve-brown/60 uppercase mb-1"
        >{{ t('settings.newPassword') }}</label
      >
      <input
        v-model="newPassword"
        type="password"
        id="new-password"
        class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white"
      />
    </div>

    <div>
      <label
        for="confirm-password"
        class="block text-xs font-bold text-verve-brown/60 uppercase mb-1"
        >{{ t('settings.confirmPassword') }}</label
      >
      <input
        v-model="confirmPassword"
        type="password"
        id="confirm-password"
        class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white"
      />
    </div>

    <div
      v-if="error"
      class="text-red-600 text-sm pt-1 bg-red-50 p-2 rounded-lg border border-red-100"
    >
      {{ t(`settings.${error}`) }}
    </div>

    <div class="flex justify-end gap-3 pt-4 border-t border-verve-medium/30">
      <button
        @click="$emit('cancel')"
        class="px-5 py-2.5 border border-verve-medium/50 rounded-xl text-verve-brown font-semibold hover:bg-verve-light transition-colors"
      >
        {{ t('settings.cancel') }}
      </button>
      <button
        @click="onSave"
        class="px-6 py-2.5 bg-verve-neon text-verve-brown font-bold rounded-xl shadow-sm hover:brightness-105 border border-verve-dark/5 transition-all"
      >
        {{ t('settings.updatePassword') }}
      </button>
    </div>
  </div>
</template>
