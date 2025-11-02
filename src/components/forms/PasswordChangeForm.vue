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
    error.value = "New passwords do not match.";
    return;
  }
  if (!oldPassword.value || !newPassword.value) {
    error.value = "All fields are required.";
    return;
  }
  emit('save', { old_password: oldPassword.value, new_password: newPassword.value });
}
</script>
<template>
  <div class="space-y-4 pt-4">
    <div>
      <label for="current-password" class="block text-sm font-medium text-gray-700">Current Password</label>
      <input v-model="oldPassword" type="password" id="current-password"
        class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
    </div>
    <div>
      <label for="new-password" class="block text-sm font-medium text-gray-700">New Password</label>
      <input v-model="newPassword" type="password" id="new-password"
        class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
    </div>
    <div>
      <label for="confirm-password" class="block text-sm font-medium text-gray-700">Confirm New Password</label>
      <input v-model="confirmPassword" type="password" id="confirm-password"
        class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
    </div>
    <div v-if="error" class="text-red-600 text-sm pt-1">{{ error }}</div>
    <div class="flex justify-end space-x-3 pt-4">
      <button @click="$emit('cancel')"
        class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
        Cancel
      </button>
      <button @click="onSave"
        class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">
        Update Password
      </button>
    </div>
  </div>
</template>
