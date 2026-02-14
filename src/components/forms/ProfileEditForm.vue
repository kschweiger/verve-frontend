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
    emit('cancel');
  }
}
</script>

<template>
  <div class="space-y-4 pt-2">
    <div>
      <label for="profile-name" class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">Username</label>
      <input v-model="name" type="text" id="profile-name"
        class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white" />
    </div>

    <div>
      <label for="profile-fullname" class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">Full Name</label>
      <input v-model="fullName" type="text" id="profile-fullname"
        class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white" />
    </div>

    <div>
      <label for="profile-email" class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">Email</label>
      <input v-model="email" type="email" id="profile-email"
        class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white" />
    </div>

    <div class="flex justify-end gap-3 pt-4 border-t border-verve-medium/30">
      <button @click="$emit('cancel')"
        class="px-5 py-2.5 border border-verve-medium/50 rounded-xl text-verve-brown font-semibold hover:bg-verve-light transition-colors">
        Cancel
      </button>
      <button @click="onSave"
        class="px-6 py-2.5 bg-verve-neon text-verve-brown font-bold rounded-xl shadow-sm hover:brightness-105 border border-verve-dark/5 transition-all">
        Save Changes
      </button>
    </div>
  </div>
</template>
