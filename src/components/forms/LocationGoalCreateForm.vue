<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useGoalStore, type GoalCreatePayload } from '@/stores/goals';
import { useTypeStore } from '@/stores/types';
import { useEquipmentStore } from '@/stores/equipment';

const props = defineProps<{
  location: { id: string; name: string };
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'saved'): void;
}>();

const goalStore = useGoalStore();
const typeStore = useTypeStore();
const equipmentStore = useEquipmentStore();

interface FormState {
  name: string;
  description: string;
  target: number;
  temporal_type: 'weekly' | 'monthly' | 'yearly';
  year: number;
  month: number;
  week: number;
  is_all_months: boolean;
  weekly_scope: 'specific_week' | 'all_in_month' | 'all_in_year';
}

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

const errors = ref<Record<string, string>>({});
const isSaving = ref(false);

// --- Constraints State ---
const useActivityConstraint = ref(false);
const selectedTypeId = ref<number | null>(null);
const selectedSubTypeId = ref<number | null>(null);
const useEquipmentConstraint = ref(false);
const selectedEquipmentIds = ref<string[]>([]);

// --- Computed ---
const availableSubTypes = computed(() => {
  if (!selectedTypeId.value) return [];
  const t = typeStore.activityTypes.find((x) => x.id === selectedTypeId.value);
  return t ? t.sub_types : [];
});

onMounted(() => {
  typeStore.fetchActivityTypes();
  equipmentStore.fetchAllEquipment();
});

// --- Validation ---
function validate() {
  errors.value = {};
  let isValid = true;
  if (!form.value.name.trim()) {
    errors.value.name = 'Name is required.';
    isValid = false;
  }
  if (form.value.target <= 0) {
    errors.value.target = 'Target must be > 0.';
    isValid = false;
  }
  return isValid;
}

// --- Submit ---
async function handleSubmit() {
  if (!validate()) return;
  isSaving.value = true;

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

  let finalMonth: number | null = null;
  let finalWeek: number | null = null;

  if (form.value.temporal_type === 'monthly') {
    finalMonth = form.value.is_all_months ? null : form.value.month;
  } else if (form.value.temporal_type === 'weekly') {
    switch (form.value.weekly_scope) {
      case 'specific_week':
        finalWeek = form.value.week;
        break;
      case 'all_in_month':
        finalMonth = form.value.month;
        break;
      case 'all_in_year':
        break;
    }
  }

  const payload: GoalCreatePayload = {
    name: form.value.name,
    description: form.value.description || undefined,
    target: form.value.target,
    type: 'location',
    aggregation: 'count',
    temporal_type: form.value.temporal_type,
    year: form.value.year,
    month: finalMonth,
    week: finalWeek,
    constraints: constraints,
  };

  const success = await goalStore.createGoal(payload);
  isSaving.value = false;

  if (success) {
    emit('saved');
    emit('close');
  } else {
    alert('Failed to create goal. ' + (goalStore.error || ''));
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
      <button @click="$emit('close')" class="text-verve-brown/40 hover:text-verve-brown transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" class="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Name -->
    <div>
      <label class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">
        Goal Name <span class="text-red-500">*</span>
      </label>
      <input v-model="form.name" type="text"
        class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white"
        :class="errors.name ? 'border-red-500' : ''" />
      <p v-if="errors.name" class="text-red-500 text-xs mt-1">{{ errors.name }}</p>
    </div>

    <!-- Timeframe -->
    <div class="bg-verve-light/20 p-4 rounded-xl border border-verve-medium/30">
      <div class="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">Frequency</label>
          <select v-model="form.temporal_type"
            class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark bg-white">
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">Year</label>
          <input v-model="form.year" type="number"
            class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark bg-white" />
        </div>
      </div>

      <!-- Conditional Date Inputs -->
      <template v-if="form.temporal_type === 'monthly'">
        <div class="flex items-center gap-4">
          <div class="grow">
            <label class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">Month</label>
            <select v-model="form.month" :disabled="form.is_all_months"
              class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark bg-white disabled:bg-gray-100 disabled:text-gray-400">
              <option v-for="m in 12" :key="m" :value="m">
                {{ new Date(0, m - 1).toLocaleString('default', { month: 'long' }) }}
              </option>
            </select>
          </div>
          <div class="pt-5">
            <label class="flex items-center">
              <input v-model="form.is_all_months" type="checkbox" class="size-4 rounded border-verve-medium" />
              <span class="ml-2 text-sm text-verve-brown font-medium">All Months</span>
            </label>
          </div>
        </div>
      </template>

      <template v-if="form.temporal_type === 'weekly'">
        <div class="mb-3">
          <label class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">Scope</label>
          <select v-model="form.weekly_scope"
            class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark bg-white">
            <option value="specific_week">Specific Week</option>
            <option value="all_in_month">All weeks in Month</option>
            <option value="all_in_year">All weeks in Year</option>
          </select>
        </div>
        <div v-if="form.weekly_scope === 'specific_week'">
          <label class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">Week Number</label>
          <input v-model="form.week" type="number" min="1" max="53"
            class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark bg-white" />
        </div>
        <div v-if="form.weekly_scope === 'all_in_month'">
          <label class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">Month</label>
          <select v-model="form.month"
            class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark bg-white">
            <option v-for="m in 12" :key="m" :value="m">
              {{ new Date(0, m - 1).toLocaleString('default', { month: 'long' }) }}
            </option>
          </select>
        </div>
      </template>
    </div>

    <!-- Target -->
    <div>
      <label class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">
        Target Visits <span class="text-red-500">*</span>
      </label>
      <input v-model="form.target" type="number" min="1"
        class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white"
        :class="errors.target ? 'border-red-500' : ''" />
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
          <input v-model="useActivityConstraint" type="checkbox" class="size-4 rounded border-verve-medium" />
          <span class="ml-2 text-sm text-verve-brown font-medium">Specific Activity Type</span>
        </label>
        <div v-if="useActivityConstraint" class="pl-6 mt-2 flex gap-2">
          <select v-model="selectedTypeId"
            class="w-1/2 border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark bg-white">
            <option :value="null">Type...</option>
            <option v-for="t in typeStore.activityTypes" :key="t.id" :value="t.id">
              {{ t.name }}
            </option>
          </select>
          <select v-model="selectedSubTypeId" :disabled="!selectedTypeId"
            class="w-1/2 border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark bg-white disabled:bg-gray-100 disabled:text-gray-400">
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
          <input v-model="useEquipmentConstraint" type="checkbox" class="size-4 rounded border-verve-medium" />
          <span class="ml-2 text-sm text-verve-brown font-medium">Specific Equipment</span>
        </label>
        <div v-if="useEquipmentConstraint" class="pl-6 mt-2">
          <select v-model="selectedEquipmentIds" multiple
            class="w-full border-verve-medium rounded-xl text-sm h-20 p-2 text-verve-brown focus:ring-verve-dark bg-white">
            <option v-for="eq in equipmentStore.allEquipment" :key="eq.id" :value="eq.id">
              {{ eq.name }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex justify-end gap-3 pt-3 border-t border-verve-medium/30">
      <button @click="$emit('close')"
        class="px-5 py-2.5 border border-verve-medium/50 rounded-xl text-verve-brown font-semibold hover:bg-verve-light transition-colors">
        Cancel
      </button>
      <button @click="handleSubmit" :disabled="isSaving"
        class="px-6 py-2.5 bg-verve-neon text-verve-brown font-bold rounded-xl shadow-sm hover:brightness-105 border border-verve-dark/5 transition-all disabled:opacity-50">
        {{ isSaving ? 'Saving...' : 'Create Goal' }}
      </button>
    </div>
  </div>
</template>
