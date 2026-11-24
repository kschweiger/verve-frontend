<script setup lang="ts">
import { useSubTypes } from '@/composables/useSubTypes';
import { ref, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { ApiResponseError } from '@/services/authHeaders';
import type { en as manualEntry } from '@/i18n/manualEntry';
import { useActivityStore, type ActivityCreatePayload } from '@/stores/activity';
import { useTypeStore } from '@/stores/types';
import { quickAddDefinitions } from '@/components/widgets/quick-add/definitions';
import { useSettingsStore } from '@/stores/settings';
import TimezonePicker from './TimezonePicker.vue';
import {
  currentActivityLocalTime,
  localActivityTimeToInstant,
  ManualActivityTimeError,
} from '@/utils/manualActivityTime';

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'saved'): void;
}>();

const { t, n } = useI18n();
const activityStore = useActivityStore();
const typeStore = useTypeStore();
const settingsStore = useSettingsStore();
const selectedTimezone = ref('');
const isTimezoneLoading = ref(true);
const isEnglishCatalogLoading = ref(true);
const englishCatalogError = ref(false);

const isLoading = ref(false);
const error = ref<{
  key: keyof typeof manualEntry.errors;
  detail?: string;
  timezone?: string;
} | null>(null);

// --- Core Form State ---
const name = ref('');
const start = ref('');
const typeId = ref<number | null>(null);
const subTypeId = ref<number | null>(null);
const distanceKm = ref<number | null>(null);
const elevationGain = ref<number | null>(null);
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
const availableSubTypes = useSubTypes(() => typeStore.activityTypes, typeId, subTypeId);

const distanceMode = computed(() => {
  const type = typeStore.englishActivityTypes.find((activityType) => activityType.id === typeId.value);
  const subType = type?.sub_types.find((activitySubType) => activitySubType.id === subTypeId.value);

  return (
    quickAddDefinitions.find(
      (definition) => definition.typeName === type?.name && definition.subTypeName === subType?.name
    )?.distanceMode ?? 'REQUIRED'
  );
});

const isSwimming = computed(() => {
  const t = typeStore.englishActivityTypes.find((x) => x.id === typeId.value);
  return t?.name === 'Swimming';
});

watch(isSwimming, (newVal) => {
  if (newVal && swimmingSegments.value.length === 0) {
    addSwimSegment();
  }
});

onMounted(async () => {
  typeStore.fetchActivityTypes();
  void loadEnglishActivityTypes();
  try {
    const settings = await settingsStore.ensureSettings();
    selectedTimezone.value = settings.timezone;
    start.value = currentActivityLocalTime(settings.timezone);
  } catch (cause: unknown) {
    error.value = describeTimeError(cause, 'timezone');
  } finally {
    isTimezoneLoading.value = false;
  }
});

async function loadEnglishActivityTypes() {
  isEnglishCatalogLoading.value = true;
  englishCatalogError.value = false;
  const catalog = await typeStore.fetchEnglishActivityTypes();
  englishCatalogError.value = catalog === undefined;
  isEnglishCatalogLoading.value = false;
}

// --- Methods ---
function describeTimeError(cause: unknown, fallback: 'timezone' | 'dateTime') {
  if (cause instanceof ManualActivityTimeError) {
    return { key: cause.reason, timezone: cause.timezone };
  }
  return { key: fallback, detail: cause instanceof ApiResponseError ? cause.detail : undefined };
}

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

function nullableNumber(value: number | null): number | null {
  return Number.isFinite(value) ? value : null;
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
  if (isLoading.value || isTimezoneLoading.value) return;
  if (isEnglishCatalogLoading.value || englishCatalogError.value) return;
  if (!typeId.value) {
    error.value = { key: 'type' };
    return;
  }

  let instant: string;
  try {
    instant = localActivityTimeToInstant(start.value, selectedTimezone.value);
  } catch (cause: unknown) {
    error.value = describeTimeError(cause, 'dateTime');
    return;
  }
  isLoading.value = true;
  error.value = null;

  const isoDuration = toISODuration(durHours.value, durMinutes.value, durSeconds.value);

  // 1. Build Base Payload
  const payload: ActivityCreatePayload = {
    name: name.value || t('manualEntry.defaultName'),
    start: instant,
    type_id: typeId.value,
    sub_type_id: subTypeId.value,
    distance: distanceMode.value === 'NOT_APPLICABLE' ? null : nullableNumber(distanceKm.value),
    elevation_change_up:
      distanceMode.value === 'NOT_APPLICABLE' ? null : nullableNumber(elevationGain.value),
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

  const result = await activityStore.createManualActivity(
    payload,
    selectedFile.value,
    selectedTimezone.value
  );

  isLoading.value = false;

  if (result.success) {
    emit('saved');
    emit('close');
  } else {
    error.value = { key: result.reason, detail: result.detail };
  }
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex justify-between items-center border-b border-verve-medium/30 pb-3">
      <h3 class="text-xl font-bold text-verve-brown">{{ t('manualEntry.title') }}</h3>
      <button
        type="button"
        :aria-label="t('manualEntry.close')"
        @click="$emit('close')"
        class="text-verve-brown/40 hover:text-verve-brown transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="size-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>

    <!-- Error Banner -->
    <div
      v-if="error"
      role="alert"
      class="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100"
    >
      {{ error.detail || t(`manualEntry.errors.${error.key}`, { timezone: error.timezone ?? '' }) }}
    </div>

    <form @submit.prevent="handleSubmit" class="space-y-5 max-h-[75vh] overflow-y-auto px-1">
      <!-- Name & Date -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            for="manual-name"
            class="block text-xs font-bold text-verve-brown/60 uppercase mb-1"
            >{{ t('manualEntry.name') }}</label
          >
          <input
            id="manual-name"
            v-model="name"
            type="text"
            :placeholder="t('manualEntry.namePlaceholder')"
            class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white"
          />
        </div>
        <div>
          <label
            for="manual-start"
            class="block text-xs font-bold text-verve-brown/60 uppercase mb-1"
            >{{ t('manualEntry.dateTime') }}</label
          >
          <input
            id="manual-start"
            v-model="start"
            type="datetime-local"
            required
            :disabled="isTimezoneLoading || isLoading"
            aria-describedby="manual-timezone-help"
            class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white"
          />
        </div>
      </div>

      <div>
        <TimezonePicker
          id="manual-timezone"
          v-model="selectedTimezone"
          :label="t('manualEntry.timezone')"
          :disabled="isTimezoneLoading || isLoading"
          :suggested-timezone="settingsStore.timezone ?? undefined"
          described-by="manual-timezone-help"
        />
        <p id="manual-timezone-help" class="mt-1 text-xs text-verve-brown/60">
          {{
            t('manualEntry.zoneHelp', {
              timezone: selectedTimezone || t('manualEntry.selectedZone'),
            })
          }}
        </p>
      </div>

      <!-- Type & SubType -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            for="manual-type"
            class="block text-xs font-bold text-verve-brown/60 uppercase mb-1"
            >{{ t('manualEntry.type') }}</label
          >
          <select
            id="manual-type"
            v-model="typeId"
            required
            class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white"
          >
            <option :value="null">{{ t('manualEntry.select') }}</option>
            <option v-for="t in typeStore.activityTypes" :key="t.id" :value="t.id">
              {{ t.name }}
            </option>
          </select>
        </div>
        <div>
          <label
            for="manual-sub-type"
            class="block text-xs font-bold text-verve-brown/60 uppercase mb-1"
            >{{ t('manualEntry.subType') }}</label
          >
          <select
            id="manual-sub-type"
            v-model="subTypeId"
            :disabled="!typeId"
            class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white disabled:bg-gray-50 disabled:text-gray-400"
          >
            <option :value="null">{{ t('manualEntry.none') }}</option>
            <option v-for="st in availableSubTypes" :key="st.id" :value="st.id">
              {{ st.name }}
            </option>
          </select>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 gap-4">
        <div v-if="distanceMode !== 'NOT_APPLICABLE'">
          <label
            for="manual-distance"
            class="block text-xs font-bold text-verve-brown/60 uppercase mb-1"
          >
            {{ t('manualEntry.distance') }}
            <span v-if="distanceMode === 'OPTIONAL'" class="font-normal opacity-70">{{
              t('manualEntry.optional')
            }}</span>
          </label>
          <input
            id="manual-distance"
            v-model="distanceKm"
            type="number"
            step="0.01"
            min="0"
            :required="distanceMode === 'REQUIRED'"
            class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white"
          />
        </div>
        <div v-if="distanceMode !== 'NOT_APPLICABLE'">
          <label
            for="manual-elevation"
            class="block text-xs font-bold text-verve-brown/60 uppercase mb-1"
            >{{ t('manualEntry.elevation') }}</label
          >
          <input
            id="manual-elevation"
            v-model="elevationGain"
            type="number"
            step="1"
            min="0"
            class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white"
          />
        </div>
      </div>

      <!-- Duration -->
      <div>
        <label class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">{{
          t('manualEntry.duration')
        }}</label>
        <div class="flex space-x-2">
          <div class="flex-1">
            <input
              v-model="durHours"
              :aria-label="t('manualEntry.hourLabel')"
              type="number"
              min="0"
              placeholder="HH"
              class="w-full border-verve-medium rounded-xl text-sm py-2 text-center text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white"
            />
            <span
              class="text-[10px] text-verve-brown/60 block text-center mt-1 uppercase font-bold"
              >{{ t('manualEntry.hours') }}</span
            >
          </div>
          <div class="flex-1">
            <input
              v-model="durMinutes"
              :aria-label="t('manualEntry.minuteLabel')"
              type="number"
              min="0"
              max="59"
              placeholder="MM"
              class="w-full border-verve-medium rounded-xl text-sm py-2 text-center text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white"
            />
            <span
              class="text-[10px] text-verve-brown/60 block text-center mt-1 uppercase font-bold"
              >{{ t('manualEntry.minutes') }}</span
            >
          </div>
          <div class="flex-1">
            <input
              v-model="durSeconds"
              :aria-label="t('manualEntry.secondLabel')"
              type="number"
              min="0"
              max="59"
              placeholder="SS"
              class="w-full border-verve-medium rounded-xl text-sm py-2 text-center text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white"
            />
            <span
              class="text-[10px] text-verve-brown/60 block text-center mt-1 uppercase font-bold"
              >{{ t('manualEntry.seconds') }}</span
            >
          </div>
        </div>
      </div>

      <!-- === SWIMMING SPECIFIC META DATA === -->
      <div v-if="isSwimming" class="border border-verve-medium/30 rounded-xl p-4 bg-verve-light/20">
        <div class="flex justify-between items-center mb-3">
          <h4 class="text-sm font-bold text-verve-brown">{{ t('swimming.lapsTitle') }}</h4>
          <button
            type="button"
            @click="addSwimSegment"
            class="text-xs bg-verve-light hover:bg-verve-medium text-verve-brown font-bold px-3 py-1.5 rounded-lg border border-verve-medium/50 transition-colors"
          >
            + {{ t('swimming.addSet') }}
          </button>
        </div>

        <div class="space-y-3">
          <div
            v-for="(segment, index) in swimmingSegments"
            :key="index"
            class="bg-white p-3 rounded-xl shadow-sm border border-verve-medium/20 relative"
          >
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <div>
                <label class="block text-[10px] font-bold text-verve-brown/50 uppercase mb-1">{{
                  t('swimming.laps')
                }}</label>
                <input
                  v-model="segment.count"
                  :aria-label="t('swimming.laps')"
                  type="number"
                  min="1"
                  class="w-full text-sm border-verve-medium rounded-lg text-verve-brown"
                />
              </div>
              <div>
                <label class="block text-[10px] font-bold text-verve-brown/50 uppercase mb-1">{{
                  t('swimming.lapLength')
                }}</label>
                <input
                  v-model="segment.lap_lengths"
                  :aria-label="t('swimming.lapLength')"
                  type="number"
                  placeholder="25"
                  class="w-full text-sm border-verve-medium rounded-lg text-verve-brown"
                />
              </div>
              <div class="col-span-2">
                <label class="block text-[10px] font-bold text-verve-brown/50 uppercase mb-1">{{
                  t('swimming.style')
                }}</label>
                <select
                  v-model="segment.style"
                  :aria-label="t('swimming.style')"
                  class="w-full text-sm border-verve-medium rounded-lg text-verve-brown"
                >
                  <option :value="null">{{ t('swimming.mixed') }}</option>
                  <option v-for="style in swimStyles" :key="style" :value="style">
                    {{ t(`swimming.styles.${style}`) }}
                  </option>
                </select>
              </div>
            </div>

            <!-- Segment Duration -->
            <div>
              <label class="block text-[10px] font-bold text-verve-brown/50 uppercase mb-1">{{
                t('swimming.setDuration')
              }}</label>
              <div class="flex space-x-1">
                <input
                  v-model="segment.h"
                  :aria-label="t('manualEntry.hourLabel')"
                  type="number"
                  placeholder="H"
                  class="w-1/3 text-sm text-center border-verve-medium rounded-lg text-verve-brown"
                />
                <input
                  v-model="segment.m"
                  :aria-label="t('manualEntry.minuteLabel')"
                  type="number"
                  placeholder="M"
                  class="w-1/3 text-sm text-center border-verve-medium rounded-lg text-verve-brown"
                />
                <input
                  v-model="segment.s"
                  :aria-label="t('manualEntry.secondLabel')"
                  type="number"
                  placeholder="S"
                  class="w-1/3 text-sm text-center border-verve-medium rounded-lg text-verve-brown"
                />
              </div>
            </div>

            <!-- Remove Button -->
            <button
              v-if="swimmingSegments.length > 1"
              type="button"
              :aria-label="t('swimming.removeSet', { number: n(index + 1) })"
              @click="removeSwimSegment(index)"
              class="absolute -top-2 -right-2 bg-white text-red-500 border border-red-200 rounded-full size-6 flex items-center justify-center hover:bg-red-50 hover:border-red-300 shadow-sm transition-colors"
            >
              &times;
            </button>
          </div>
        </div>
      </div>

      <!-- Optional Track -->
      <div class="border-t border-verve-medium/30 pt-4">
        <label
          for="manual-file"
          class="block text-xs font-bold text-verve-brown/60 uppercase mb-2"
          >{{ t('manualEntry.attach') }}</label
        >
        <input
          id="manual-file"
          type="file"
          @change="handleFileChange"
          accept=".gpx,.fit,.tcx"
          class="file-input w-full"
        />
      </div>

      <!-- Settings -->
      <div class="flex items-center">
        <input
          v-model="addDefaultEquipment"
          type="checkbox"
          id="def-equip"
          class="size-4 text-verve-dark border-verve-medium rounded focus:ring-verve-dark"
        />
        <label for="def-equip" class="ml-2 text-sm font-medium text-verve-brown">{{
          t('manualEntry.defaultEquipment')
        }}</label>
      </div>

      <!-- Buttons -->
      <p v-if="englishCatalogError" role="status" class="text-sm text-red-700">
        {{ t('manualEntry.errors.typeCatalog') }}
        <button
          type="button"
          class="underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2"
          @click="loadEnglishActivityTypes"
        >
          {{ t('manualEntry.retryTypeCatalog') }}
        </button>
      </p>
      <p v-else-if="isEnglishCatalogLoading" role="status" class="text-sm text-verve-brown/60">
        {{ t('manualEntry.loadingTypes') }}
      </p>
      <div class="flex justify-end space-x-3 pt-2">
        <button
          type="button"
          @click="$emit('close')"
          class="px-5 py-2.5 border border-verve-medium/50 rounded-xl text-verve-brown font-semibold hover:bg-verve-light transition-colors"
        >
          {{ t('manualEntry.cancel') }}
        </button>
        <button
          type="submit"
          :disabled="isLoading || isTimezoneLoading || isEnglishCatalogLoading || englishCatalogError"
          class="px-6 py-2.5 bg-verve-neon text-verve-brown font-bold rounded-xl shadow-sm hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all border border-verve-dark/5"
        >
          {{ t(isLoading ? 'manualEntry.saving' : 'manualEntry.save') }}
        </button>
      </div>
    </form>
  </div>
</template>
