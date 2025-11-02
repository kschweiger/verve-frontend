<script setup lang="ts">
import { ref } from 'vue';
import type { UserProfile, UserProfilePayload } from '@/stores/settings';

const props = defineProps<{ initialProfile: UserProfile }>();
const emit = defineEmits<{
  (e: 'save', payload: UserProfilePayload): void;
  (e: 'cancel'): void;
}>();

const name = ref(props.initialProfile.name);
const email = ref(props.initialProfile.email);
const fullName = ref(props.initialProfile.full_name || '');

function onSave() {
  const payload: UserProfilePayload = {};
  if (name.value !== props.initialProfile.name) payload.name = name.value;
  if (email.value !== props.initialProfile.email) payload.email = email.value;
  if (fullName.value !== (props.initialProfile.full_name || '')) payload.full_name = fullName.value;

  if (Object.keys(payload).length > 0) {
    emit('save', payload);
  } else {
    emit('cancel'); // No changes, just cancel
  }
}
</script>
<template>
  <div class="space-y-4 pt-4">
    <div>
      <label for="profile-name" class="block text-sm font-medium text-gray-700">Username</label>
      <input v-model="name" type="text" id="profile-name"
        class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
    </div>
    <div>
      <label for="profile-fullname" class="block text-sm font-medium text-gray-700">Full Name</label>
      <input v-model="fullName" type="text" id="profile-fullname"
        class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
    </div>
    <div>
      <label for="profile-email" class="block text-sm font-medium text-gray-700">Email</label>
      <input v-model="email" type="email" id="profile-email"
        class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
    </div>
    <div class="flex justify-end space-x-3 pt-4">
      <!-- Secondary Button Style -->
      <button @click="$emit('cancel')"
        class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
        Cancel
      </button>
      <!-- Primary Button Style -->
      <button @click="onSave"
        class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">
        Save Changes
      </button>
    </div>
  </div>
</template>
