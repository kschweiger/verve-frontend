<script setup lang="ts">
import { ref } from 'vue';
import type { PasswordUpdatePayload } from '@/stores/settings';

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
    error.value = 'New passwords do not match.';
    return;
  }
  if (!oldPassword.value || !newPassword.value) {
    error.value = 'All fields are required.';
    return;
  }
  emit('save', { old_password: oldPassword.value, new_password: newPassword.value });
}
</script>

<template>
  <div class="space-y-4 pt-2">
    <div>
      <label for="current-password" class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">Current
        Password</label>
      <input v-model="oldPassword" type="password" id="current-password"
        class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white" />
    </div>

    <div>
      <label for="new-password" class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">New Password</label>
      <input v-model="newPassword" type="password" id="new-password"
        class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white" />
    </div>

    <div>
      <label for="confirm-password" class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">Confirm New
        Password</label>
      <input v-model="confirmPassword" type="password" id="confirm-password"
        class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white" />
    </div>

    <div v-if="error" class="text-red-600 text-sm pt-1 bg-red-50 p-2 rounded-lg border border-red-100">
      {{ error }}
    </div>

    <div class="flex justify-end gap-3 pt-4 border-t border-verve-medium/30">
      <button @click="$emit('cancel')"
        class="px-5 py-2.5 border border-verve-medium/50 rounded-xl text-verve-brown font-semibold hover:bg-verve-light transition-colors">
        Cancel
      </button>
      <button @click="onSave"
        class="px-6 py-2.5 bg-verve-neon text-verve-brown font-bold rounded-xl shadow-sm hover:brightness-105 border border-verve-dark/5 transition-all">
        Update Password
      </button>
    </div>
  </div>
</template>
