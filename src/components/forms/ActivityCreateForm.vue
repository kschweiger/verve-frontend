<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useActivityStore, type ActivityCreatePayload } from '@/stores/activity';
import { useTypeStore } from '@/stores/types';

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'saved'): void;
}>();

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
  lap_lengths: number | null;
  style: string | null;
  h: number;
  m: number;
  s: number;
}

const swimmingSegments = ref<LapDataUI[]>([]);

// --- Computed & Watchers ---
const availableSubTypes = computed(() => {
  if (!typeId.value) return [];
  const t = typeStore.activityTypes.find((x) => x.id === typeId.value);
  return t ? t.sub_types : [];
});

const isSwimming = computed(() => {
  const t = typeStore.activityTypes.find((x) => x.id === typeId.value);
  return t?.name === 'Swimming';
});

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

function addSwimSegment() {
  swimmingSegments.value.push({
    count: 1,
    lap_lengths: 25,
    style: 'freestyle',
    h: 0,
    m: 0,
    s: 0,
  });
}

function removeSwimSegment(index: number) {
  swimmingSegments.value.splice(index, 1);
}

async function handleSubmit() {
  if (!typeId.value) {
    error.value = 'Activity Type is required.';
    return;
  }

  isLoading.value = true;
  error.value = null;

  const isoDuration = toISODuration(durHours.value, durMinutes.value, durSeconds.value);

  // 1. Build Base Payload
  const payload: ActivityCreatePayload = {
    name: name.value || 'Manual Activity',
    start: new Date(start.value).toISOString(),
    type_id: typeId.value,
    sub_type_id: subTypeId.value,
    distance: distanceKm.value,
    duration: isoDuration,
    add_default_equipment: addDefaultEquipment.value,
    meta_data: {},
  };

  // 2. Build Metadata if Swimming
  if (isSwimming.value) {
    const segments = swimmingSegments.value.map((seg) => {
      const hasDuration = seg.h > 0 || seg.m > 0 || seg.s > 0;
      return {
        count: seg.count,
        lap_lengths: seg.lap_lengths,
        style: seg.style,
        duration: hasDuration ? toISODuration(seg.h, seg.m, seg.s) : null,
      };
    });

    payload.meta_data = {
      target: 'SwimmingMetaData',
      segments: segments,
    };
  }

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
  <div class="space-y-5">
    <div class="flex justify-between items-center border-b border-verve-medium/30 pb-3">
      <h3 class="text-xl font-bold text-verve-brown">Log Activity</h3>
      <button @click="$emit('close')" class="text-verve-brown/40 hover:text-verve-brown transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" class="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Error Banner -->
    <div v-if="error" class="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">
      {{ error }}
    </div>

    <form @submit.prevent="handleSubmit" class="space-y-5 max-h-[75vh] overflow-y-auto px-1">
      <!-- Name & Date -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">Name</label>
          <input v-model="name" type="text" placeholder="e.g. Morning Jog"
            class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white" />
        </div>
        <div>
          <label class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">Date & Time</label>
          <input v-model="start" type="datetime-local" required
            class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white" />
        </div>
      </div>

      <!-- Type & SubType -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">Type *</label>
          <select v-model="typeId" required
            class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white">
            <option :value="null">Select...</option>
            <option v-for="t in typeStore.activityTypes" :key="t.id" :value="t.id">
              {{ t.name }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">Sub-Type</label>
          <select v-model="subTypeId" :disabled="!typeId"
            class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white disabled:bg-gray-50 disabled:text-gray-400">
            <option :value="null">None</option>
            <option v-for="st in availableSubTypes" :key="st.id" :value="st.id">
              {{ st.name }}
            </option>
          </select>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">Distance (km)</label>
          <input v-model="distanceKm" type="number" step="0.01" min="0" required
            class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white" />
        </div>
        <div>
          <label class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">Elevation (m)</label>
          <input v-model="elevationGain" type="number" step="1" min="0"
            class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white" />
        </div>
      </div>

      <!-- Duration -->
      <div>
        <label class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">Duration</label>
        <div class="flex space-x-2">
          <div class="flex-1">
            <input v-model="durHours" type="number" min="0" placeholder="HH"
              class="w-full border-verve-medium rounded-xl text-sm py-2 text-center text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white" />
            <span class="text-[10px] text-verve-brown/60 block text-center mt-1 uppercase font-bold">Hrs</span>
          </div>
          <div class="flex-1">
            <input v-model="durMinutes" type="number" min="0" max="59" placeholder="MM"
              class="w-full border-verve-medium rounded-xl text-sm py-2 text-center text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white" />
            <span class="text-[10px] text-verve-brown/60 block text-center mt-1 uppercase font-bold">Min</span>
          </div>
          <div class="flex-1">
            <input v-model="durSeconds" type="number" min="0" max="59" placeholder="SS"
              class="w-full border-verve-medium rounded-xl text-sm py-2 text-center text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white" />
            <span class="text-[10px] text-verve-brown/60 block text-center mt-1 uppercase font-bold">Sec</span>
          </div>
        </div>
      </div>

      <!-- === SWIMMING SPECIFIC META DATA === -->
      <div v-if="isSwimming" class="border border-verve-medium/30 rounded-xl p-4 bg-verve-light/20">
        <div class="flex justify-between items-center mb-3">
          <h4 class="text-sm font-bold text-verve-brown">Swimming Laps</h4>
          <button type="button" @click="addSwimSegment"
            class="text-xs bg-verve-light hover:bg-verve-medium text-verve-brown font-bold px-3 py-1.5 rounded-lg border border-verve-medium/50 transition-colors">
            + Add Set
          </button>
        </div>

        <div class="space-y-3">
          <div v-for="(segment, index) in swimmingSegments" :key="index"
            class="bg-white p-3 rounded-xl shadow-sm border border-verve-medium/20 relative">
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <div>
                <label class="block text-[10px] font-bold text-verve-brown/50 uppercase mb-1">Laps</label>
                <input v-model="segment.count" type="number" min="1"
                  class="w-full text-sm border-verve-medium rounded-lg text-verve-brown" />
              </div>
              <div>
                <label class="block text-[10px] font-bold text-verve-brown/50 uppercase mb-1">Length (m)</label>
                <input v-model="segment.lap_lengths" type="number" placeholder="25"
                  class="w-full text-sm border-verve-medium rounded-lg text-verve-brown" />
              </div>
              <div class="col-span-2">
                <label class="block text-[10px] font-bold text-verve-brown/50 uppercase mb-1">Style</label>
                <select v-model="segment.style" class="w-full text-sm border-verve-medium rounded-lg text-verve-brown">
                  <option :value="null">Mixed/Other</option>
                  <option v-for="style in swimStyles" :key="style" :value="style">
                    {{ style.charAt(0).toUpperCase() + style.slice(1) }}
                  </option>
                </select>
              </div>
            </div>

            <!-- Segment Duration -->
            <div>
              <label class="block text-[10px] font-bold text-verve-brown/50 uppercase mb-1">Set Duration
                (Optional)</label>
              <div class="flex space-x-1">
                <input v-model="segment.h" type="number" placeholder="H"
                  class="w-1/3 text-sm text-center border-verve-medium rounded-lg text-verve-brown" />
                <input v-model="segment.m" type="number" placeholder="M"
                  class="w-1/3 text-sm text-center border-verve-medium rounded-lg text-verve-brown" />
                <input v-model="segment.s" type="number" placeholder="S"
                  class="w-1/3 text-sm text-center border-verve-medium rounded-lg text-verve-brown" />
              </div>
            </div>

            <!-- Remove Button -->
            <button v-if="swimmingSegments.length > 1" type="button" @click="removeSwimSegment(index)"
              class="absolute -top-2 -right-2 bg-white text-red-500 border border-red-200 rounded-full size-6 flex items-center justify-center hover:bg-red-50 hover:border-red-300 shadow-sm transition-colors">
              &times;
            </button>
          </div>
        </div>
      </div>

      <!-- Optional Track -->
      <div class="border-t border-verve-medium/30 pt-4">
        <label class="block text-xs font-bold text-verve-brown/60 uppercase mb-2">Attach Track File (Optional)</label>
        <input type="file" @change="handleFileChange" accept=".gpx,.fit,.tcx" class="file-input w-full" />
      </div>

      <!-- Settings -->
      <div class="flex items-center">
        <input v-model="addDefaultEquipment" type="checkbox" id="def-equip"
          class="size-4 text-verve-dark border-verve-medium rounded focus:ring-verve-dark" />
        <label for="def-equip" class="ml-2 text-sm font-medium text-verve-brown">Add default equipment for this activity
          type</label>
      </div>

      <!-- Buttons -->
      <div class="flex justify-end space-x-3 pt-2">
        <button type="button" @click="$emit('close')"
          class="px-5 py-2.5 border border-verve-medium/50 rounded-xl text-verve-brown font-semibold hover:bg-verve-light transition-colors">
          Cancel
        </button>
        <button type="submit" :disabled="isLoading"
          class="px-6 py-2.5 bg-verve-neon text-verve-brown font-bold rounded-xl shadow-sm hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all border border-verve-dark/5">
          {{ isLoading ? 'Saving...' : 'Save Activity' }}
        </button>
      </div>
    </form>
  </div>
</template>
