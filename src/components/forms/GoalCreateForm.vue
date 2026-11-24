<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useSubTypes } from '@/composables/useSubTypes';
import { ref, onMounted, useId } from 'vue';
import type { Goal } from '@/stores/goals';
import { useGoalCreation, type GoalDraft } from '@/composables/useGoalCreation';
import GoalTimeframeFields from './GoalTimeframeFields.vue';
import { useTypeStore } from '@/stores/types';
import { useEquipmentStore } from '@/stores/equipment';

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'saved'): void;
}>();

const { t } = useI18n();
const id = useId();
const typeStore = useTypeStore();
const equipmentStore = useEquipmentStore();

function getCurrentWeekNumber() {
  const date = new Date();
  const startDate = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.valueOf() - startDate.valueOf()) / (24 * 60 * 60 * 1000));
  return Math.ceil((days + 1) / 7);
}

interface FormState extends GoalDraft {
  type: 'activity' | 'manual';
  aggregation: Goal['aggregation'];
}

const form = ref<FormState>({
  name: '',
  description: '',
  target: 0,
  temporal_type: 'monthly',
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1,
  week: getCurrentWeekNumber(),
  is_all_months: false,
  weekly_scope: 'specific_week',
  type: 'activity',
  aggregation: 'total_distance',
});

const { errors, error, isSaving, submit } = useGoalCreation(form);

const useActivityConstraint = ref(false);
const selectedTypeId = ref<number | null>(null);
const selectedSubTypeId = ref<number | null>(null);

const useEquipmentConstraint = ref(false);
const selectedEquipmentIds = ref<string[]>([]);

const aggregations = [
  'active_days',
  'count',
  'total_distance',
  'avg_distance',
  'max_distance',
  'duration',
] as const satisfies readonly Goal['aggregation'][];

const availableSubTypes = useSubTypes(
  () => typeStore.activityTypes,
  selectedTypeId,
  selectedSubTypeId
);

onMounted(() => {
  typeStore.fetchActivityTypes();
  equipmentStore.fetchAllEquipment();
});

async function handleSubmit() {
  if (isSaving.value) return;

  const constraints: Record<string, unknown> = {};
  if (useActivityConstraint.value && selectedTypeId.value) {
    constraints['type_id'] = selectedTypeId.value;
    if (selectedSubTypeId.value) constraints['sub_type_id'] = selectedSubTypeId.value;
  }
  if (useEquipmentConstraint.value && selectedEquipmentIds.value.length > 0) {
    constraints['equipment_ids'] = selectedEquipmentIds.value;
  }

  const success = await submit({
    type: form.value.type,
    aggregation: form.value.aggregation,
    constraints: Object.keys(constraints).length ? constraints : undefined,
  });
  if (success) {
    emit('saved');
    emit('close');
  }
}
</script>

<template>
  <div role="dialog" aria-modal="true" :aria-labelledby="`${id}-title`" class="space-y-5">
    <div class="flex justify-between items-center border-b border-verve-medium/30 pb-3">
      <h3 :id="`${id}-title`" class="text-xl font-bold text-verve-brown">{{ t('goals.setNewGoal') }}</h3>
      <button
        type="button"
        :aria-label="t('goals.closeCreation')"
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

    <fieldset :disabled="isSaving" class="space-y-5 disabled:opacity-60">
      <!-- Name & Description -->
      <div class="grid grid-cols-1 gap-4">
        <div>
          <label :for="`${id}-name`" class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">
            {{ t('goals.goalName') }} <span class="text-red-500">*</span>
          </label>
          <input
            :id="`${id}-name`"
            v-model="form.name"
            :aria-invalid="!!errors.name"
            :aria-describedby="errors.name ? `${id}-name-error` : undefined"
            type="text"
            :placeholder="t('goals.nameExample')"
            class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white placeholder-verve-brown/30"
            :class="errors.name ? 'border-red-500' : ''"
          />
          <p v-if="errors.name" :id="`${id}-name-error`" class="text-red-500 text-xs mt-1">{{ t(`goals.errors.${errors.name}`) }}</p>
        </div>
        <div>
          <label :for="`${id}-description`" class="block text-xs font-bold text-verve-brown/60 uppercase mb-1"
            >{{ t('goals.description') }}</label
          >
          <input
            :id="`${id}-description`"
            v-model="form.description"
            type="text"
            :placeholder="t('goals.optionalDetails')"
            class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white placeholder-verve-brown/30"
          />
        </div>
      </div>

      <GoalTimeframeFields v-model="form" :week-error="errors.week ? t(`goals.errors.${errors.week}`) : undefined" />

      <!-- Goal Logic -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label :for="`${id}-type`" class="block text-xs font-bold text-verve-brown/60 uppercase mb-1"
            >{{ t('goals.goalType') }}</label
          >
          <select
            :id="`${id}-type`"
            v-model="form.type"
            class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark bg-white"
          >
            <option value="activity">{{ t('goals.activityBased') }}</option>
            <option value="manual">{{ t('goals.manual') }}</option>
          </select>
        </div>
        <div>
          <label :for="`${id}-aggregation`" class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">{{ t('goals.metric') }}</label>
          <select
            :id="`${id}-aggregation`"
            v-model="form.aggregation"
            class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark bg-white"
          >
            <option v-for="agg in aggregations" :key="agg" :value="agg">
              {{ t(`goals.metrics.${agg}`) }}
            </option>
          </select>
        </div>
      </div>

      <div>
        <label :for="`${id}-target`" class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">
          {{ t('goals.targetValue') }} <span class="text-red-500">*</span>
        </label>
        <input
          :id="`${id}-target`"
            v-model="form.target"
            :aria-invalid="!!errors.target"
            :aria-describedby="errors.target ? `${id}-target-error` : undefined"
          type="number"
          step="any"
          class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark bg-white"
          :class="errors.target ? 'border-red-500' : ''"
        />
        <p v-if="errors.target" :id="`${id}-target-error`" class="text-red-500 text-xs mt-1">{{ t(`goals.errors.${errors.target}`) }}</p>
        <p class="text-xs text-verve-brown/50 mt-1 italic">
          {{ t('goals.durationHelp') }}
        </p>
      </div>

      <!-- Constraints Section -->
      <div class="border-t border-verve-medium/30 pt-4">
        <h4 class="text-xs font-bold text-verve-brown/50 uppercase tracking-wide mb-3">
          {{ t('goals.optionalFilters') }}
        </h4>

        <!-- Activity Type Constraint -->
        <div class="mb-4">
          <div class="flex items-center mb-2">
            <input
              v-model="useActivityConstraint"
              type="checkbox"
              :id="`${id}-use-type`"
              class="size-4 rounded border-verve-medium"
            />
            <label :for="`${id}-use-type`" class="ml-2 text-sm font-medium text-verve-brown"
              >{{ t('goals.limitActivityType') }}</label
            >
          </div>
          <div v-if="useActivityConstraint" class="pl-6 grid grid-cols-2 gap-3">
            <select
              v-model="selectedTypeId"
              :aria-label="t('goals.activityType')"
              class="border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown bg-white"
            >
              <option :value="null">{{ t('goals.selectType') }}</option>
              <option v-for="t in typeStore.activityTypes" :key="t.id" :value="t.id">
                {{ t.name }}
              </option>
            </select>
            <select
              v-model="selectedSubTypeId"
              :aria-label="t('goals.activitySubtype')"
              :disabled="!selectedTypeId"
              class="border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown bg-white disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option :value="null">{{ t('goals.anySubtype') }}</option>
              <option v-for="st in availableSubTypes" :key="st.id" :value="st.id">
                {{ st.name }}
              </option>
            </select>
          </div>
        </div>

        <!-- Equipment Constraint -->
        <div>
          <div class="flex items-center mb-2">
            <input
              v-model="useEquipmentConstraint"
              type="checkbox"
              :id="`${id}-use-equip`"
              class="size-4 rounded border-verve-medium"
            />
            <label :for="`${id}-use-equip`" class="ml-2 text-sm font-medium text-verve-brown"
              >{{ t('goals.limitEquipment') }}</label
            >
          </div>
          <div v-if="useEquipmentConstraint" class="pl-6">
            <select
              v-model="selectedEquipmentIds"
              :aria-label="t('goals.equipment')"
              multiple
              class="w-full border-verve-medium rounded-xl text-sm h-24 p-2 text-verve-brown bg-white"
            >
              <option v-for="eq in equipmentStore.allEquipment" :key="eq.id" :value="eq.id">
                {{ eq.name }} ({{ t(`equipment.types.${eq.equipment_type}`) }})
              </option>
            </select>
            <p class="text-xs text-verve-brown/50 mt-1">{{ t('goals.selectMultiple') }}</p>
          </div>
        </div>
      </div>
    </fieldset>
    <p v-if="error" role="alert" class="rounded-xl bg-red-50 p-3 text-sm text-red-700">
      {{ error.detail ?? t(`goals.errors.${error.reason}`) }}
    </p>
    <!-- Footer Actions -->
    <div class="flex justify-end gap-3 pt-4 border-t border-verve-medium/30">
      <button
        type="button"
        @click="$emit('close')"
        class="px-5 py-2.5 border border-verve-medium/50 rounded-xl text-verve-brown font-semibold hover:bg-verve-light transition-colors"
      >
        {{ t('goals.cancel') }}
      </button>
      <button
        type="button"
        @click="handleSubmit"
        :disabled="isSaving"
        class="px-6 py-2.5 bg-verve-neon text-verve-brown font-bold rounded-xl shadow-sm hover:brightness-105 border border-verve-dark/5 transition-all"
      >
        {{ isSaving ? t('goals.saving') : t('goals.saveGoal') }}
      </button>
    </div>
  </div>
</template>
