<script setup lang="ts">
import { ref } from 'vue';
import { supportedTimezones } from '@/services/timezones';

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
      <label for="user-timezone" class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">
        Timezone
      </label>
      <select id="user-timezone" v-model="selectedTimezone" :disabled="isSaving"
        aria-describedby="timezone-help timezone-error"
        class="w-full rounded-xl border border-verve-medium bg-white px-3 py-2 text-sm text-verve-brown focus-visible:outline-2 focus-visible:outline-verve-dark disabled:opacity-50">
        <option v-for="timezone in supportedTimezones" :key="timezone" :value="timezone">
          {{ timezone }}
        </option>
      </select>
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
