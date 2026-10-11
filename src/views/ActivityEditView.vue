<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useActivityStore, type ActivityUpdatePayload } from '@/stores/activity';
import { useTypeStore } from '@/stores/types';
import { fetchActivitySummary } from '@/services/api';
import { buildActivityUpdate, toActivityEditValues, type ActivityEditValues } from '@/utils/activityEdit';
import TimezonePicker from '@/components/forms/TimezonePicker.vue';
import { useSettingsStore } from '@/stores/settings';

const props = defineProps<{
  id: string;
}>();

const router = useRouter();
const activityStore = useActivityStore();
const typeStore = useTypeStore();
const settingsStore = useSettingsStore();

// Original activity state to check for changes
const originalActivity = ref<ActivityEditValues | null>(null);

// Form state
const name = ref('');
const selectedTypeId = ref<number | null>(null);
const selectedSubTypeId = ref<number | null>(null);
const distance = ref<number | null>(null);
const selectedTimezone = ref('');

// Duration components
const durHours = ref<number>(0);
const durMinutes = ref<number>(0);
const durSeconds = ref<number>(0);

// UI state
const isLoading = ref(true);
const error = ref<string | null>(null);
const isSaving = ref(false);

onMounted(async () => {
  void settingsStore.ensureSettings().catch(() => undefined);
  try {
    const [, currentActivity] = await Promise.all([
      typeStore.fetchActivityTypes(),
      fetchActivitySummary(props.id),
    ]);

    // Store original values
    originalActivity.value = toActivityEditValues(currentActivity);

    // Pre-fill the form
    name.value = originalActivity.value.name;
    selectedTimezone.value = originalActivity.value.timezone;
    selectedTypeId.value = originalActivity.value.type_id;
    selectedSubTypeId.value = originalActivity.value.sub_type_id;
    if (originalActivity.value.distance != null) {
      distance.value = Number(originalActivity.value.distance.toFixed(2));
    } else {
      distance.value = null;
    }
    // Convert seconds to H/M/S
    const totalSeconds = originalActivity.value.durationSeconds;
    durHours.value = Math.floor(totalSeconds / 3600);
    durMinutes.value = Math.floor((totalSeconds % 3600) / 60);
    durSeconds.value = Math.floor(totalSeconds % 60);

    await nextTick();

    watch(selectedTypeId, () => {
      selectedSubTypeId.value = null;
    });
  } catch {
    error.value = 'Failed to load activity data.';
  } finally {
    isLoading.value = false;
  }
});

const availableSubTypes = computed(() => {
  if (!selectedTypeId.value) return [];
  const foundType = typeStore.activityTypes.find((t) => t.id === selectedTypeId.value);
  return foundType?.sub_types || [];
});

async function handleSubmit() {
  if (!originalActivity.value || isSaving.value) return;
  isSaving.value = true;
  error.value = null;

  // Calculate total seconds for comparison
  const newTotalSeconds =
    (durHours.value || 0) * 3600 + (durMinutes.value || 0) * 60 + (durSeconds.value || 0);

  let payload: ActivityUpdatePayload;
  try {
    payload = buildActivityUpdate(originalActivity.value, {
      name: name.value, timezone: selectedTimezone.value,
      type_id: selectedTypeId.value, sub_type_id: selectedSubTypeId.value,
      distance: distance.value, durationSeconds: newTotalSeconds,
    });
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Invalid activity settings.';
    isSaving.value = false;
    return;
  }

  if (Object.keys(payload).length === 0) {
    isSaving.value = false;
    router.push({ name: 'activity-detail', params: { id: props.id } });
    return;
  }

  const success = await activityStore.updateActivity(props.id, payload);

  if (success) {
    router.push({ name: 'activity-detail', params: { id: props.id } });
  } else {
    error.value = 'Failed to save changes. Please try again.';
  }
  isSaving.value = false;
}
</script>

<template>
  <div class="p-4 sm:p-6 lg:p-8 bg-verve-light/30 min-h-[calc(100vh-64px)]">
    <div class="max-w-2xl mx-auto">
      <div v-if="isLoading" class="text-center py-12 text-verve-brown/60">
        <span class="animate-pulse">Loading...</span>
      </div>

      <div v-else-if="error && !originalActivity" role="alert" class="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 shadow-sm">
        {{ error }}
      </div>

      <form v-else-if="originalActivity" :aria-busy="isSaving" @submit.prevent="handleSubmit"
        class="bg-white p-8 rounded-xl shadow-sm border border-verve-medium/30 space-y-6">
        <h1 class="text-2xl font-bold text-verve-brown border-b border-verve-medium/30 pb-4">
          Edit Activity
        </h1>

        <div>
          <TimezonePicker id="activity-timezone" v-model="selectedTimezone" label="Timezone" :disabled="isSaving"
            :suggested-timezone="settingsStore.timezone ?? undefined" described-by="activity-timezone-help" />
          <p id="activity-timezone-help" class="mt-2 text-sm text-verve-brown/60">
            Changing the timezone updates the displayed local time without changing when the activity happened.
          </p>
        </div>

        <!-- Name Input -->
        <div>
          <label for="activity-name" class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">Name</label>
          <input v-model="name" type="text" id="activity-name"
            class="w-full border-verve-medium rounded-xl text-sm py-2.5 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white" />
        </div>

        <!-- Type & Sub-Type Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Type Dropdown -->
          <div>
            <label for="type" class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">Activity Type</label>
            <select v-model="selectedTypeId" id="type"
              class="w-full border-verve-medium rounded-xl text-sm py-2.5 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white">
              <option :value="null">None</option>
              <option v-for="t in typeStore.activityTypes" :key="t.id" :value="t.id">
                {{ t.name }}
              </option>
            </select>
          </div>

          <!-- Sub-Type Dropdown -->
          <div>
            <label for="sub-type" class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">Sub-Type</label>
            <select v-model="selectedSubTypeId" id="sub-type"
              :disabled="!selectedTypeId || availableSubTypes.length === 0"
              class="w-full border-verve-medium rounded-xl text-sm py-2.5 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white disabled:bg-gray-50 disabled:text-gray-400">
              <option :value="null">None</option>
              <option v-for="st in availableSubTypes" :key="st.id" :value="st.id">
                {{ st.name }}
              </option>
            </select>
          </div>
        </div>

        <!-- Distance & Duration Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-verve-medium/10">
          <!-- Distance -->
          <div>
            <label for="distance" class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">Distance
              (km)</label>
            <input v-model="distance" type="number" id="distance" step="0.01" min="0" placeholder="0.00"
              class="w-full border-verve-medium rounded-xl text-sm py-2.5 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white placeholder-verve-brown/30" />
          </div>

          <!-- Duration -->
          <div>
            <label class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">Duration</label>
            <div class="flex gap-2">
              <div class="flex-1">
                <input v-model="durHours" type="number" min="0" placeholder="HH"
                  class="w-full border-verve-medium rounded-xl text-sm py-2.5 text-center text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white" />
                <span class="block text-center text-[10px] text-verve-brown/50 font-bold uppercase mt-1">Hrs</span>
              </div>
              <div class="flex-1">
                <input v-model="durMinutes" type="number" min="0" max="59" placeholder="MM"
                  class="w-full border-verve-medium rounded-xl text-sm py-2.5 text-center text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white" />
                <span class="block text-center text-[10px] text-verve-brown/50 font-bold uppercase mt-1">Min</span>
              </div>
              <div class="flex-1">
                <input v-model="durSeconds" type="number" min="0" max="59" placeholder="SS"
                  class="w-full border-verve-medium rounded-xl text-sm py-2.5 text-center text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white" />
                <span class="block text-center text-[10px] text-verve-brown/50 font-bold uppercase mt-1">Sec</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Submission Error -->
        <div v-if="error" role="alert" class="text-red-600 text-sm p-3 bg-red-50 rounded-lg border border-red-100">
          {{ error }}
        </div>

        <!-- Action Buttons -->
        <div class="flex justify-end space-x-4 pt-4 border-t border-verve-medium/30">
          <router-link :to="{ name: 'activity-detail', params: { id: props.id } }"
            class="px-5 py-2.5 border border-verve-medium/50 rounded-xl text-verve-brown font-semibold hover:bg-verve-light transition-colors">
            Cancel
          </router-link>
          <button type="submit" :disabled="isSaving"
            class="px-6 py-2.5 bg-verve-neon text-verve-brown font-bold rounded-xl shadow-sm hover:brightness-105 border border-verve-dark/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {{ isSaving ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
