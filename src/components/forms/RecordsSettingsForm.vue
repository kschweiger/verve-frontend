<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { computed, ref, watch } from 'vue';
import type { RecordsSettings } from '@/stores/settings';
import type { ActivityType } from '@/stores/types';

const { t } = useI18n();

const props = defineProps<{
  initialSettings: RecordsSettings | null;
  activityTypes: ActivityType[];
}>();

const emit = defineEmits<{
  (e: 'save', defaultActivityType: number): void;
  (e: 'cancel'): void;
}>();

const fallbackTypeId = computed(() => props.activityTypes[0]?.id ?? null);
const selectedTypeId = ref<number | null>(
  props.initialSettings?.default_activity_type ?? fallbackTypeId.value
);

const canSave = computed(() => selectedTypeId.value !== null);

watch(fallbackTypeId, (nextFallbackTypeId) => {
  if (selectedTypeId.value === null) {
    selectedTypeId.value = nextFallbackTypeId;
  }
});

function onSave() {
  if (selectedTypeId.value === null) return;
  emit('save', selectedTypeId.value);
}
</script>

<template>
  <div class="space-y-4 pt-2">
    <p class="text-sm text-verve-brown/60">{{ t('settings.recordsInstructions') }}</p>

    <div v-if="activityTypes.length === 0" class="text-verve-brown/40 text-sm">
      {{ t('settings.loadingTypes') }}
    </div>

    <label v-else class="block">
      <span class="block text-xs font-bold text-verve-brown/60 uppercase mb-2">
        {{ t('settings.recordsType') }}
      </span>
      <select
        v-model.number="selectedTypeId"
        class="w-full"
        :aria-label="t('settings.recordsType')"
      >
        <option
          v-for="activityType in activityTypes"
          :key="activityType.id"
          :value="activityType.id"
        >
          {{ activityType.name }}
        </option>
      </select>
    </label>

    <div class="flex justify-end gap-3 pt-4 border-t border-verve-medium/30">
      <button
        type="button"
        class="px-5 py-2.5 border border-verve-medium/50 rounded-xl text-verve-brown font-semibold hover:bg-verve-light transition-colors"
        @click="$emit('cancel')"
      >
        {{ t('settings.cancel') }}
      </button>
      <button
        type="button"
        class="px-6 py-2.5 bg-verve-neon text-verve-brown font-bold rounded-xl shadow-sm hover:brightness-105 border border-verve-dark/5 transition-all disabled:opacity-50"
        :disabled="!canSave"
        @click="onSave"
      >
        {{ t('settings.saveChanges') }}
      </button>
    </div>
  </div>
</template>
