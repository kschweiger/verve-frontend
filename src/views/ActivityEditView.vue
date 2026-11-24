<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useActivityStore, type ActivityUpdatePayload } from '@/stores/activity';
import { useTypeStore } from '@/stores/types';
import { fetchActivitySummary } from '@/services/api';
import { ApiResponseError } from '@/services/authHeaders';
import {
  ActivityEditValidationError,
  buildActivityUpdate,
  toActivityEditValues,
  type ActivityEditValues,
} from '@/utils/activityEdit';
import TimezonePicker from '@/components/forms/TimezonePicker.vue';
import { useSettingsStore } from '@/stores/settings';

const props = defineProps<{
  id: string;
}>();

const router = useRouter();
const { t, n } = useI18n();
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
type EditError = 'load' | 'invalidSettings' | 'save' | ActivityEditValidationError['reason'];
const error = ref<EditError | null>(null);
const loadErrorDetail = ref<string>();
const errorMessage = computed(() => {
  if (!error.value) return '';
  if (error.value === 'load' && loadErrorDetail.value) {
    return t('activityActions.edit.errors.loadDetail', { detail: loadErrorDetail.value });
  }
  return t(`activityActions.edit.errors.${error.value}`);
});
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
  } catch (cause: unknown) {
    error.value = 'load';
    loadErrorDetail.value = cause instanceof ApiResponseError ? cause.detail : undefined;
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
  } catch (cause: unknown) {
    error.value = cause instanceof ActivityEditValidationError ? cause.reason : 'invalidSettings';
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
    error.value = 'save';
  }
  isSaving.value = false;
}
</script>

<template>
  <div class="p-4 sm:p-6 lg:p-8 bg-verve-light/30 min-h-[calc(100vh-64px)]">
    <div class="max-w-2xl mx-auto">
      <div v-if="isLoading" class="text-center py-12 text-verve-brown/60">
        <span class="animate-pulse">{{ t('activityActions.edit.loading') }}</span>
      </div>

      <div v-else-if="error && !originalActivity" role="alert" class="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 shadow-sm">
        {{ errorMessage }}
      </div>

      <form v-else-if="originalActivity" :aria-busy="isSaving" @submit.prevent="handleSubmit"
        class="bg-white p-8 rounded-xl shadow-sm border border-verve-medium/30 space-y-6">
        <h1 class="text-2xl font-bold text-verve-brown border-b border-verve-medium/30 pb-4">
          {{ t('activityActions.edit.title') }}
        </h1>

        <div>
          <TimezonePicker id="activity-timezone" v-model="selectedTimezone" :label="t('activityActions.edit.timezone')" :disabled="isSaving"
            :suggested-timezone="settingsStore.timezone ?? undefined" described-by="activity-timezone-help" />
          <p id="activity-timezone-help" class="mt-2 text-sm text-verve-brown/60">
            {{ t('activityActions.edit.timezoneHelp') }}
          </p>
        </div>

        <!-- Name Input -->
        <div>
          <label for="activity-name" class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">
            {{ t('activityActions.edit.name') }}
          </label>
          <input v-model="name" type="text" id="activity-name"
            class="w-full border-verve-medium rounded-xl text-sm py-2.5 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white" />
        </div>

        <!-- Type & Sub-Type Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Type Dropdown -->
          <div>
            <label for="type" class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">
              {{ t('activityActions.edit.type') }}
            </label>
            <select v-model="selectedTypeId" id="type"
              class="w-full border-verve-medium rounded-xl text-sm py-2.5 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white">
              <option :value="null">{{ t('activityActions.edit.none') }}</option>
              <option v-for="type in typeStore.activityTypes" :key="type.id" :value="type.id">
                {{ type.name }}
              </option>
            </select>
          </div>

          <!-- Sub-Type Dropdown -->
          <div>
            <label for="sub-type" class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">
              {{ t('activityActions.edit.subType') }}
            </label>
            <select v-model="selectedSubTypeId" id="sub-type"
              :disabled="!selectedTypeId || availableSubTypes.length === 0"
              class="w-full border-verve-medium rounded-xl text-sm py-2.5 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white disabled:bg-gray-50 disabled:text-gray-400">
              <option :value="null">{{ t('activityActions.edit.none') }}</option>
              <option v-for="subType in availableSubTypes" :key="subType.id" :value="subType.id">
                {{ subType.name }}
              </option>
            </select>
          </div>
        </div>

        <!-- Distance & Duration Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-verve-medium/10">
          <!-- Distance -->
          <div>
            <label for="distance" class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">
              {{ t('activityActions.edit.distance') }}
            </label>
            <input v-model="distance" type="number" id="distance" step="0.01" min="0"
              :placeholder="n(0, { minimumFractionDigits: 2 })"
              class="w-full border-verve-medium rounded-xl text-sm py-2.5 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white placeholder-verve-brown/30" />
          </div>

          <!-- Duration -->
          <fieldset>
            <legend class="text-xs font-bold text-verve-brown/60 uppercase mb-1">
              {{ t('activityActions.edit.duration') }}
            </legend>
            <div class="flex gap-2">
              <div class="flex-1">
                <input v-model="durHours" id="duration-hours" type="number" min="0" placeholder="HH"
                  class="w-full border-verve-medium rounded-xl text-sm py-2.5 text-center text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white" />
                <label for="duration-hours" class="block text-center text-[10px] text-verve-brown/50 font-bold uppercase mt-1">
                  {{ t('activityActions.edit.hours') }}
                </label>
              </div>
              <div class="flex-1">
                <input v-model="durMinutes" id="duration-minutes" type="number" min="0" max="59" placeholder="MM"
                  class="w-full border-verve-medium rounded-xl text-sm py-2.5 text-center text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white" />
                <label for="duration-minutes" class="block text-center text-[10px] text-verve-brown/50 font-bold uppercase mt-1">
                  {{ t('activityActions.edit.minutes') }}
                </label>
              </div>
              <div class="flex-1">
                <input v-model="durSeconds" id="duration-seconds" type="number" min="0" max="59" placeholder="SS"
                  class="w-full border-verve-medium rounded-xl text-sm py-2.5 text-center text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white" />
                <label for="duration-seconds" class="block text-center text-[10px] text-verve-brown/50 font-bold uppercase mt-1">
                  {{ t('activityActions.edit.seconds') }}
                </label>
              </div>
            </div>
          </fieldset>
        </div>

        <!-- Submission Error -->
        <div v-if="error" role="alert" class="text-red-600 text-sm p-3 bg-red-50 rounded-lg border border-red-100">
          {{ errorMessage }}
        </div>

        <!-- Action Buttons -->
        <div class="flex justify-end space-x-4 pt-4 border-t border-verve-medium/30">
          <router-link :to="{ name: 'activity-detail', params: { id: props.id } }"
            class="px-5 py-2.5 border border-verve-medium/50 rounded-xl text-verve-brown font-semibold hover:bg-verve-light transition-colors">
            {{ t('activityActions.edit.cancel') }}
          </router-link>
          <button type="submit" :disabled="isSaving"
            class="px-6 py-2.5 bg-verve-neon text-verve-brown font-bold rounded-xl shadow-sm hover:brightness-105 border border-verve-dark/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {{ t(isSaving ? 'activityActions.edit.saving' : 'activityActions.edit.save') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
