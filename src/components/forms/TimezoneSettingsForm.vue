<script setup lang="ts">
import { ref } from 'vue';
import TimezonePicker from './TimezonePicker.vue';

const props = defineProps<{
  initialTimezone: string;
  isSaving: boolean;
  error: string | null;
}>();
const emit = defineEmits<{
  save: [timezone: string];
  cancel: [];
}>();
const selectedTimezone = ref(props.initialTimezone);
</script>

<template>
  <form class="space-y-4" @submit.prevent="emit('save', selectedTimezone)">
    <div>
      <TimezonePicker id="user-timezone" v-model="selectedTimezone" label="Timezone" :disabled="isSaving"
        :suggested-timezone="initialTimezone" described-by="timezone-help timezone-error" />
      <p id="timezone-help" class="mt-2 text-sm text-verve-brown/60">
        Your saved timezone will be used as timezone support is added to activity views.
      </p>
      <p id="timezone-error" role="alert" class="mt-2 text-sm text-red-600">{{ error }}</p>
    </div>
    <div class="flex justify-end gap-3">
      <button type="button" :disabled="isSaving" @click="emit('cancel')"
        class="px-5 py-2.5 border border-verve-medium/50 rounded-xl text-verve-brown font-semibold hover:bg-verve-light focus-visible:outline-2 focus-visible:outline-verve-dark disabled:opacity-50">
        Cancel
      </button>
      <button type="submit" :disabled="isSaving"
        class="px-6 py-2.5 bg-verve-neon text-verve-brown font-bold rounded-xl hover:brightness-105 focus-visible:outline-2 focus-visible:outline-verve-dark disabled:opacity-50">
        {{ isSaving ? 'Saving…' : 'Save Timezone' }}
      </button>
    </div>
  </form>
</template>
