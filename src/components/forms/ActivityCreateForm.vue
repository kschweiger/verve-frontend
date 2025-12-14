<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useActivityStore } from '@/stores/activity';
import { useTypeStore } from '@/stores/types';

const emit = defineEmits(['close', 'saved']);
const activityStore = useActivityStore();
const typeStore = useTypeStore();

const isLoading = ref(false);
const error = ref<string | null>(null);

// --- Core Form State ---
const name = ref('');
const start = ref(new Date().toISOString().slice(0, 16));
const typeId = ref<number | null>(null);
const subTypeId = ref<number | null>(null);
const distanceKm = ref<number>(0);
const elevationGain = ref<number>(0);
const addDefaultEquipment = ref(true);

// Total Duration
const durHours = ref(0);
const durMinutes = ref(0);
const durSeconds = ref(0);

const selectedFile = ref<File | null>(null);

// --- Swimming Metadata State ---
const swimStyles = ['freestyle', 'backstroke', 'breaststroke', 'butterfly'];

interface LapDataUI {
  count: number;
  lap_lengths: number | null; // Note: UI uses "lengths", payload maps to "lenths"
  style: string | null;
  // Duration split
  h: number;
  m: number;
  s: number;
}

const swimmingSegments = ref<LapDataUI[]>([]);

// --- Computed & Watchers ---

const availableSubTypes = computed(() => {
  if (!typeId.value) return [];
  const t = typeStore.activityTypes.find(x => x.id === typeId.value);
  return t ? t.sub_types : [];
});

const isSwimming = computed(() => {
  const t = typeStore.activityTypes.find(x => x.id === typeId.value);
  return t?.name === 'Swimming';
});

// Ensure at least one lap row exists if Swimming is selected
watch(isSwimming, (newVal) => {
  if (newVal && swimmingSegments.value.length === 0) {
    addSwimSegment();
  }
});

onMounted(() => {
  typeStore.fetchActivityTypes();
});

// --- Methods ---

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) selectedFile.value = target.files[0];
}

function toISODuration(h: number, m: number, s: number): string {
  let iso = 'PT';
  if (h > 0) iso += `${h}H`;
  if (m > 0) iso += `${m}M`;
  iso += `${s}S`;
  return iso;
}

// --- Swimming Logic ---
function addSwimSegment() {
  swimmingSegments.value.push({
    count: 1,
    lap_lengths: 25, // Default pool size estimate
    style: 'freestyle',
    h: 0, m: 0, s: 0
  });
}

function removeSwimSegment(index: number) {
  swimmingSegments.value.splice(index, 1);
}

// --- Submission ---
async function handleSubmit() {
  if (!typeId.value) {
    error.value = "Activity Type is required.";
    return;
  }

  isLoading.value = true;
  error.value = null;

  const isoDuration = toISODuration(durHours.value, durMinutes.value, durSeconds.value);

  // 1. Build Base Payload
  const payload: any = {
    name: name.value || 'Manual Activity',
    start: new Date(start.value).toISOString(),
    type_id: typeId.value,
    sub_type_id: subTypeId.value,
    distance: distanceKm.value,
    duration: isoDuration,
    elevation_change_up: elevationGain.value,
    add_default_equipment: addDefaultEquipment.value,
    meta_data: {} // Default empty
  };

  // 2. Build Metadata if Swimming
  if (isSwimming.value) {
    const segments = swimmingSegments.value.map(seg => {
      // Check if duration is set
      const hasDuration = seg.h > 0 || seg.m > 0 || seg.s > 0;

      return {
        count: seg.count,
        lap_lengths: seg.lap_lengths, // <-- Mapping to backend typo 'lenths'
        style: seg.style,
        duration: hasDuration ? toISODuration(seg.h, seg.m, seg.s) : null
      };
    });

    payload.meta_data = {
      target: "SwimmingMetaData",
      segments: segments
    };
  }

  // 3. Send
  const result = await activityStore.createManualActivity(payload, selectedFile.value);

  isLoading.value = false;

  if (result.success) {
    emit('saved');
    emit('close');
  } else {
    error.value = result.message;
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex justify-between items-center border-b pb-2">
      <h3 class="text-lg font-bold text-gray-800">Log Activity</h3>
      <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600">&times;</button>
    </div>

    <!-- Error Banner -->
    <div v-if="error" class="p-3 bg-red-100 text-red-700 text-sm rounded">{{ error }}</div>

    <form @submit.prevent="handleSubmit" class="space-y-4 max-h-[75vh] overflow-y-auto px-1">

      <!-- Name & Date -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">Name</label>
          <input v-model="name" type="text" placeholder="e.g. Morning Jog"
            class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Date & Time</label>
          <input v-model="start" type="datetime-local" required
            class="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
        </div>
      </div>

      <!-- Type & SubType -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">Type *</label>
          <select v-model="typeId" required class="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
            <option :value="null">Select...</option>
            <option v-for="t in typeStore.activityTypes" :key="t.id" :value="t.id">{{ t.name }}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Sub-Type</label>
          <select v-model="subTypeId" :disabled="!typeId"
            class="mt-1 block w-full border-gray-300 rounded-md shadow-sm disabled:bg-gray-100">
            <option :value="null">None</option>
            <option v-for="st in availableSubTypes" :key="st.id" :value="st.id">{{ st.name }}</option>
          </select>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">Distance (km)</label>
          <input v-model="distanceKm" type="number" step="0.01" min="0" required
            class="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Elevation Gain (m)</label>
          <input v-model="elevationGain" type="number" step="1" min="0"
            class="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
        </div>
      </div>

      <!-- Duration -->
      <div>
        <label class="block text-sm font-medium text-gray-700">Duration</label>
        <div class="flex space-x-2 mt-1">
          <div class="flex-1">
            <input v-model="durHours" type="number" min="0" placeholder="HH"
              class="w-full border-gray-300 rounded-md text-center" />
            <span class="text-xs text-gray-500 block text-center">Hrs</span>
          </div>
          <div class="flex-1">
            <input v-model="durMinutes" type="number" min="0" max="59" placeholder="MM"
              class="w-full border-gray-300 rounded-md text-center" />
            <span class="text-xs text-gray-500 block text-center">Min</span>
          </div>
          <div class="flex-1">
            <input v-model="durSeconds" type="number" min="0" max="59" placeholder="SS"
              class="w-full border-gray-300 rounded-md text-center" />
            <span class="text-xs text-gray-500 block text-center">Sec</span>
          </div>
        </div>
      </div>

      <!-- === SWIMMING SPECIFIC META DATA === -->
      <div v-if="isSwimming" class="border rounded-md p-3 bg-blue-50 border-blue-200">
        <div class="flex justify-between items-center mb-2">
          <h4 class="text-sm font-bold text-blue-800">Swimming Laps</h4>
          <button type="button" @click="addSwimSegment"
            class="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700">+ Add Set</button>
        </div>

        <div class="space-y-3">
          <div v-for="(segment, index) in swimmingSegments" :key="index"
            class="bg-white p-2 rounded shadow-sm relative">

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
              <div>
                <label class="block text-xs text-gray-500">Laps</label>
                <input v-model="segment.count" type="number" min="1" class="w-full text-sm border-gray-300 rounded" />
              </div>
              <div>
                <label class="block text-xs text-gray-500">Length (m)</label>
                <input v-model="segment.lap_lengths" type="number" class="w-full text-sm border-gray-300 rounded"
                  placeholder="25" />
              </div>
              <div class="col-span-2">
                <label class="block text-xs text-gray-500">Style</label>
                <select v-model="segment.style" class="w-full text-sm border-gray-300 rounded">
                  <option :value="null">Mixed/Other</option>
                  <option v-for="style in swimStyles" :key="style" :value="style">{{ style.charAt(0).toUpperCase() +
                    style.slice(1) }}</option>
                </select>
              </div>
            </div>

            <!-- Segment Duration -->
            <div>
              <label class="block text-xs text-gray-500">Set Duration (Optional)</label>
              <div class="flex space-x-1">
                <input v-model="segment.h" type="number" placeholder="H"
                  class="w-1/3 text-sm text-center border-gray-300 rounded" />
                <input v-model="segment.m" type="number" placeholder="M"
                  class="w-1/3 text-sm text-center border-gray-300 rounded" />
                <input v-model="segment.s" type="number" placeholder="S"
                  class="w-1/3 text-sm text-center border-gray-300 rounded" />
              </div>
            </div>

            <!-- Remove Button -->
            <button v-if="swimmingSegments.length > 1" type="button" @click="removeSwimSegment(index)"
              class="absolute -top-1 -right-1 bg-red-100 text-red-600 rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-200">
              &times;
            </button>
          </div>
        </div>
      </div>
      <!-- ================================== -->

      <!-- Optional Track -->
      <div class="border-t pt-4">
        <label class="block text-sm font-medium text-gray-700">Attach Track File (Optional)</label>
        <input type="file" @change="handleFileChange" accept=".gpx,.fit,.tcx"
          class="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
      </div>

      <!-- Settings -->
      <div class="flex items-center">
        <input v-model="addDefaultEquipment" type="checkbox" id="def-equip" class="h-4 w-4 text-indigo-600 rounded" />
        <label for="def-equip" class="ml-2 text-sm text-gray-700">Add default equipment for this activity type</label>
      </div>

      <!-- Buttons -->
      <div class="flex justify-end space-x-3 pt-2">
        <button type="button" @click="$emit('close')"
          class="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50">Cancel</button>
        <button type="submit" :disabled="isLoading"
          class="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-indigo-300">
          {{ isLoading ? 'Saving...' : 'Save Activity' }}
        </button>
      </div>

    </form>
  </div>
</template>
