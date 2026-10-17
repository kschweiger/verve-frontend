<script setup lang="ts">
import { useSubTypes } from '@/composables/useSubTypes';
import { ref, onMounted } from 'vue';
import { useGoalCreation, type GoalDraft } from '@/composables/useGoalCreation';
import GoalTimeframeFields from './GoalTimeframeFields.vue';
import { useTypeStore } from '@/stores/types';
import { useEquipmentStore } from '@/stores/equipment';

const props = defineProps<{
  location: { id: string; name: string };
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'saved'): void;
}>();

const typeStore = useTypeStore();
const equipmentStore = useEquipmentStore();

type FormState = GoalDraft;

// --- Form State ---
const form = ref<FormState>({
  name: `Visit ${props.location.name}`,
  description: '',
  target: 1,
  temporal_type: 'monthly',
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1,
  week: 1,
  is_all_months: false,
  weekly_scope: 'specific_week',
});

const { errors, error, isSaving, submit } = useGoalCreation(form);

// --- Constraints State ---
const useActivityConstraint = ref(false);
const selectedTypeId = ref<number | null>(null);
const selectedSubTypeId = ref<number | null>(null);
const useEquipmentConstraint = ref(false);
const selectedEquipmentIds = ref<string[]>([]);

// --- Computed ---
const availableSubTypes = useSubTypes(
  () => typeStore.activityTypes,
  selectedTypeId,
  selectedSubTypeId
);

onMounted(() => {
  typeStore.fetchActivityTypes();
  equipmentStore.fetchAllEquipment();
});

// --- Validation ---
async function handleSubmit() {
  if (isSaving.value) return;

  const constraints: Record<string, unknown> = {
    location_id: props.location.id,
  };

  if (useActivityConstraint.value && selectedTypeId.value) {
    constraints['type_id'] = selectedTypeId.value;
    if (selectedSubTypeId.value) constraints['sub_type_id'] = selectedSubTypeId.value;
  }

  if (useEquipmentConstraint.value && selectedEquipmentIds.value.length > 0) {
    constraints['equipment_ids'] = selectedEquipmentIds.value;
  }

  const success = await submit({ type: 'location', aggregation: 'count', constraints });
  if (success) {
    emit('saved');
    emit('close');
  }
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex justify-between items-start border-b border-verve-medium/30 pb-3">
      <div>
        <h3 class="text-xl font-bold text-verve-brown">Set Location Goal</h3>
        <p class="text-sm text-verve-orange font-bold mt-1">{{ location.name }}</p>
      </div>
      <button
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
      <!-- Name -->
      <div>
        <label class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">
          Goal Name <span class="text-red-500">*</span>
        </label>
        <input
          v-model="form.name"
          type="text"
          class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white"
          :class="errors.name ? 'border-red-500' : ''"
        />
        <p v-if="errors.name" class="text-red-500 text-xs mt-1">{{ errors.name }}</p>
      </div>

      <GoalTimeframeFields v-model="form" :week-error="errors.week" />

      <!-- Target -->
      <div>
        <label class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">
          Target Visits <span class="text-red-500">*</span>
        </label>
        <input
          v-model="form.target"
          type="number"
          min="1"
          class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white"
          :class="errors.target ? 'border-red-500' : ''"
        />
        <p v-if="errors.target" class="text-red-500 text-xs mt-1">{{ errors.target }}</p>
      </div>

      <!-- Optional Filters -->
      <div class="border-t border-verve-medium/30 pt-3">
        <h4 class="text-xs font-bold text-verve-brown/50 uppercase tracking-wide mb-3">
          Conditions (Optional)
        </h4>

        <!-- Type Filter -->
        <div class="mb-3">
          <label class="flex items-center">
            <input
              v-model="useActivityConstraint"
              type="checkbox"
              class="size-4 rounded border-verve-medium"
            />
            <span class="ml-2 text-sm text-verve-brown font-medium">Specific Activity Type</span>
          </label>
          <div v-if="useActivityConstraint" class="pl-6 mt-2 flex gap-2">
            <select
              v-model="selectedTypeId"
              class="w-1/2 border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark bg-white"
            >
              <option :value="null">Type...</option>
              <option v-for="t in typeStore.activityTypes" :key="t.id" :value="t.id">
                {{ t.name }}
              </option>
            </select>
            <select
              v-model="selectedSubTypeId"
              :disabled="!selectedTypeId"
              class="w-1/2 border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark bg-white disabled:bg-gray-100 disabled:text-gray-400"
            >
              <option :value="null">Any Sub-Type</option>
              <option v-for="st in availableSubTypes" :key="st.id" :value="st.id">
                {{ st.name }}
              </option>
            </select>
          </div>
        </div>

        <!-- Equipment Filter -->
        <div>
          <label class="flex items-center">
            <input
              v-model="useEquipmentConstraint"
              type="checkbox"
              class="size-4 rounded border-verve-medium"
            />
            <span class="ml-2 text-sm text-verve-brown font-medium">Specific Equipment</span>
          </label>
          <div v-if="useEquipmentConstraint" class="pl-6 mt-2">
            <select
              v-model="selectedEquipmentIds"
              multiple
              class="w-full border-verve-medium rounded-xl text-sm h-20 p-2 text-verve-brown focus:ring-verve-dark bg-white"
            >
              <option v-for="eq in equipmentStore.allEquipment" :key="eq.id" :value="eq.id">
                {{ eq.name }}
              </option>
            </select>
          </div>
        </div>
      </div>
    </fieldset>
    <p v-if="error" role="alert" class="rounded-xl bg-red-50 p-3 text-sm text-red-700">
      {{ error }}
    </p>
    <!-- Actions -->
    <div class="flex justify-end gap-3 pt-3 border-t border-verve-medium/30">
      <button
        @click="$emit('close')"
        class="px-5 py-2.5 border border-verve-medium/50 rounded-xl text-verve-brown font-semibold hover:bg-verve-light transition-colors"
      >
        Cancel
      </button>
      <button
        @click="handleSubmit"
        :disabled="isSaving"
        class="px-6 py-2.5 bg-verve-neon text-verve-brown font-bold rounded-xl shadow-sm hover:brightness-105 border border-verve-dark/5 transition-all disabled:opacity-50"
      >
        {{ isSaving ? 'Saving...' : 'Create Goal' }}
      </button>
    </div>
  </div>
</template>
