<script setup lang="ts">
import { ref } from 'vue';
import { useActivityStore } from '@/stores/activity';

const props = defineProps<{
  typeId: number;
  subTypeId: number | null;
  title: string;
  distanceMode: 'REQUIRED' | 'OPTIONAL' | 'NOT_APPLICABLE';
  defaultName?: string;
}>();

const emit = defineEmits(['success']);
const activityStore = useActivityStore();

const isLoading = ref(false);
const showForm = ref(false);

// Form State
const durHours = ref<number | null>(null);
const durMinutes = ref<number | null>(null);
const durSeconds = ref<number | null>(null);
const distance = ref<number | null>(null);

// Helper: Get today string safely for TS
const getTodayString = () => new Date().toISOString().split('T')[0] ?? '';

// Date State: Initialize with safe string
const date = ref<string>(getTodayString());

function toISODuration(h: number, m: number, s: number): string {
  let iso = 'PT';
  if (h > 0) iso += `${h}H`;
  if (m > 0) iso += `${m}M`;
  if (s > 0 || iso === 'PT') iso += `${s}S`;
  return iso;
}

function getISOStartDateTime(dateStr: string): string {
  const now = new Date();
  // Handle empty string case by defaulting to now
  const selectedDate = dateStr ? new Date(dateStr) : new Date();

  selectedDate.setHours(now.getHours());
  selectedDate.setMinutes(now.getMinutes());
  selectedDate.setSeconds(now.getSeconds());

  return selectedDate.toISOString();
}

async function handleSubmit() {
  const h = durHours.value || 0;
  const m = durMinutes.value || 0;
  const s = durSeconds.value || 0;

  if (h === 0 && m === 0 && s === 0) return;

  isLoading.value = true;

  let finalDistance: number | null = null;
  if (props.distanceMode === 'NOT_APPLICABLE') {
    finalDistance = null;
  } else {
    finalDistance = distance.value ? distance.value : null;
  }

  // Ensure strict string type for the helper
  const dateString = date.value || getTodayString();

  const payload = {
    name: props.defaultName || props.title,
    start: getISOStartDateTime(dateString),
    type_id: props.typeId,
    sub_type_id: props.subTypeId,
    distance: finalDistance,
    duration: toISODuration(h, m, s),
    add_default_equipment: true
  };

  const result = await activityStore.createManualActivity(payload, null);

  isLoading.value = false;

  if (result.success) {
    // Reset Form
    durHours.value = null;
    durMinutes.value = null;
    durSeconds.value = null;
    distance.value = null;
    date.value = getTodayString(); // Reset to safe string
    showForm.value = false;
    emit('success');
  } else {
    alert(result.message);
  }
}
</script>

<template>
  <div class="border border-gray-200 rounded-lg p-3 bg-gray-50 hover:bg-white hover:shadow-sm transition-all">
    <!-- Header / Toggle -->
    <div @click="showForm = !showForm" class="flex justify-between items-center cursor-pointer select-none">
      <div class="flex items-center space-x-2">
        <span class="font-bold text-gray-700 text-sm">{{ title }}</span>
      </div>
      <div class="text-indigo-600">
        <span v-if="!showForm" class="text-xl leading-none">+</span>
        <span v-else class="text-xl leading-none">&minus;</span>
      </div>
    </div>

    <!-- Form (Expanded) -->
    <div v-if="showForm" class="mt-3 space-y-3">

      <!-- Date Picker -->
      <div>
        <label class="block text-xs font-semibold text-gray-500 uppercase mb-1">Date</label>
        <input v-model="date" type="date"
          class="w-full border-gray-300 rounded-md text-sm py-1.5 focus:ring-indigo-500 focus:border-indigo-500" />
      </div>

      <!-- Duration Inputs (HH : MM : SS) -->
      <div>
        <label class="block text-xs font-semibold text-gray-500 uppercase mb-1">Duration</label>
        <div class="flex space-x-2">
          <div class="flex-1">
            <input v-model="durHours" type="number" min="0" placeholder="HH"
              class="w-full border-gray-300 rounded-md text-sm py-1.5 text-center focus:ring-indigo-500 focus:border-indigo-500"
              @keyup.enter="handleSubmit" />
          </div>
          <div class="flex-1">
            <input v-model="durMinutes" type="number" min="0" max="59" placeholder="MM"
              class="w-full border-gray-300 rounded-md text-sm py-1.5 text-center focus:ring-indigo-500 focus:border-indigo-500"
              @keyup.enter="handleSubmit" />
          </div>
          <div class="flex-1">
            <input v-model="durSeconds" type="number" min="0" max="59" placeholder="SS"
              class="w-full border-gray-300 rounded-md text-sm py-1.5 text-center focus:ring-indigo-500 focus:border-indigo-500"
              @keyup.enter="handleSubmit" />
          </div>
        </div>
      </div>

      <!-- Distance Input (Conditional) -->
      <div v-if="distanceMode !== 'NOT_APPLICABLE'">
        <label class="block text-xs font-semibold text-gray-500 uppercase mb-1">
          Distance (km) <span v-if="distanceMode === 'OPTIONAL'" class="text-gray-400 font-normal">(Opt)</span>
        </label>
        <input v-model="distance" type="number" step="0.01" placeholder="0.0"
          class="w-full border-gray-300 rounded-md text-sm py-1.5 focus:ring-indigo-500 focus:border-indigo-500"
          @keyup.enter="handleSubmit" />
      </div>

      <!-- Submit -->
      <button @click="handleSubmit" :disabled="isLoading || (!durHours && !durMinutes && !durSeconds)"
        class="w-full bg-indigo-600 text-white text-sm font-medium py-1.5 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
        {{ isLoading ? 'Saving...' : 'Log Activity' }}
      </button>
    </div>
  </div>
</template>
