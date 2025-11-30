<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useGoalStore, type GoalCreatePayload } from '@/stores/goals';
import { useTypeStore } from '@/stores/types';
import { useEquipmentStore } from '@/stores/equipment';

const emit = defineEmits(['close', 'saved']);

const goalStore = useGoalStore();
const typeStore = useTypeStore();
const equipmentStore = useEquipmentStore();

// --- Form State ---
const form = ref({
  name: '',
  description: '',
  target: 0,
  temporal_type: 'monthly', // 'monthly' | 'yearly'
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1, // 1-12
  is_all_months: false,
  type: 'activity',
  aggregation: 'total_distance',
});

// --- Validation State ---
const errors = ref<Record<string, string>>({});

// --- Constraints State ---
const useActivityConstraint = ref(false);
const selectedTypeId = ref<number | null>(null);
const selectedSubTypeId = ref<number | null>(null);

const useEquipmentConstraint = ref(false);
const selectedEquipmentIds = ref<string[]>([]);

// --- Options ---
const aggregations = [
  { value: 'count', label: 'Count (Number of Activities)' },
  { value: 'total_distance', label: 'Total Distance (km)' },
  { value: 'avg_distance', label: 'Average Distance (km)' },
  { value: 'max_distance', label: 'Max Distance (km)' },
  { value: 'duration', label: 'Duration (Seconds)' },
];

const availableSubTypes = computed(() => {
  if (!selectedTypeId.value) return [];
  const t = typeStore.activityTypes.find(x => x.id === selectedTypeId.value);
  return t ? t.sub_types : [];
});

onMounted(() => {
  typeStore.fetchActivityTypes();
  equipmentStore.fetchAllEquipment();
});

// --- Validation Logic ---
function validate() {
  errors.value = {};
  let isValid = true;

  if (!form.value.name || form.value.name.trim() === '') {
    errors.value.name = 'Goal name is required.';
    isValid = false;
  }

  if (form.value.target <= 0) {
    errors.value.target = 'Target must be greater than 0.';
    isValid = false;
  }

  return isValid;
}

// --- Submission ---
async function handleSubmit() {
  // 1. Run Validation
  if (!validate()) return;

  // 2. Build Constraints Dictionary
  const constraints: Record<string, any> = {};

  if (useActivityConstraint.value && selectedTypeId.value) {
    constraints['type_id'] = selectedTypeId.value;
    if (selectedSubTypeId.value) {
      constraints['sub_type_id'] = selectedSubTypeId.value;
    }
  }

  if (useEquipmentConstraint.value && selectedEquipmentIds.value.length > 0) {
    constraints['equipment_ids'] = selectedEquipmentIds.value;
  }

  const payload: GoalCreatePayload = {
    name: form.value.name,
    description: form.value.description || undefined,
    target: form.value.target,
    type: form.value.type,
    aggregation: form.value.aggregation,
    temporal_type: form.value.temporal_type,
    year: form.value.year,
    month: (form.value.temporal_type === 'monthly' && !form.value.is_all_months)
      ? form.value.month
      : null,
    constraints: Object.keys(constraints).length > 0 ? constraints : undefined
  };

  const success = await goalStore.createGoal(payload);
  if (success) {
    emit('saved');
    emit('close');
  }
}
</script>

<template>
  <div class="space-y-4">
    <h3 class="text-lg font-bold text-gray-800 border-b pb-2">Set New Goal</h3>

    <!-- Name & Description -->
    <div class="grid grid-cols-1 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700">Goal Name <span class="text-red-500">*</span></label>
        <input v-model="form.name" type="text" placeholder="e.g. Run 100km"
          class="mt-1 block w-full border rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 placeholder-gray-400"
          :class="errors.name ? 'border-red-500' : 'border-gray-300'" />
        <p v-if="errors.name" class="text-red-500 text-xs mt-1">{{ errors.name }}</p>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700">Description (Optional)</label>
        <input v-model="form.description" type="text" placeholder="Optional details..."
          class="mt-1 block w-full border-gray-300 rounded-md shadow-sm placeholder-gray-400" />
      </div>
    </div>

    <!-- Timeframe -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700">Timeframe</label>
        <select v-model="form.temporal_type" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700">Year</label>
        <input v-model="form.year" type="number" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
      </div>

      <div v-if="form.temporal_type === 'monthly'" class="md:col-span-2 flex items-center space-x-4">
        <div class="flex-grow">
          <label class="block text-sm font-medium text-gray-700">Month</label>
          <select v-model="form.month" :disabled="form.is_all_months"
            class="mt-1 block w-full border-gray-300 rounded-md shadow-sm disabled:bg-gray-100">
            <option v-for="m in 12" :key="m" :value="m">{{ new Date(0, m - 1).toLocaleString('default', {
              month: 'long'
              }) }}</option>
          </select>
        </div>
        <div class="flex items-center pt-6">
          <input v-model="form.is_all_months" type="checkbox" id="all-months" class="h-4 w-4 text-indigo-600 rounded" />
          <label for="all-months" class="ml-2 text-sm text-gray-700">Create for every month</label>
        </div>
      </div>
    </div>

    <!-- Goal Logic -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700">Goal Type</label>
        <select v-model="form.type" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
          <option value="activity">Based on Activities</option>
          <option value="manual">Manual Entry</option>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700">Metric</label>
        <select v-model="form.aggregation" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
          <option v-for="agg in aggregations" :key="agg.value" :value="agg.value">{{ agg.label }}</option>
        </select>
      </div>
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700">Target Value <span class="text-red-500">*</span></label>
      <input v-model="form.target" type="number" step="any"
        class="mt-1 block w-full border rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
        :class="errors.target ? 'border-red-500' : 'border-gray-300'" />
      <p v-if="errors.target" class="text-red-500 text-xs mt-1">{{ errors.target }}</p>
      <p class="text-xs text-gray-500 mt-1">If using Duration, enter seconds (e.g., 3600 = 1 hour).</p>
    </div>

    <!-- Constraints Section -->
    <div class="border-t pt-4">
      <h4 class="text-sm font-bold text-gray-700 mb-2">Filters (Optional)</h4>

      <!-- Activity Type Constraint -->
      <div class="mb-3">
        <div class="flex items-center mb-2">
          <input v-model="useActivityConstraint" type="checkbox" id="use-type"
            class="h-4 w-4 text-indigo-600 rounded" />
          <label for="use-type" class="ml-2 text-sm text-gray-700">Limit by Activity Type</label>
        </div>
        <div v-if="useActivityConstraint" class="pl-6 grid grid-cols-2 gap-2">
          <select v-model="selectedTypeId" class="border-gray-300 rounded-md text-sm">
            <option :value="null">Select Type...</option>
            <option v-for="t in typeStore.activityTypes" :key="t.id" :value="t.id">{{ t.name }}</option>
          </select>
          <select v-model="selectedSubTypeId" :disabled="!selectedTypeId"
            class="border-gray-300 rounded-md text-sm disabled:bg-gray-100">
            <option :value="null">Any Sub-Type</option>
            <option v-for="st in availableSubTypes" :key="st.id" :value="st.id">{{ st.name }}</option>
          </select>
        </div>
      </div>

      <!-- Equipment Constraint -->
      <div>
        <div class="flex items-center mb-2">
          <input v-model="useEquipmentConstraint" type="checkbox" id="use-equip"
            class="h-4 w-4 text-indigo-600 rounded" />
          <label for="use-equip" class="ml-2 text-sm text-gray-700">Limit by Equipment</label>
        </div>
        <div v-if="useEquipmentConstraint" class="pl-6">
          <select v-model="selectedEquipmentIds" multiple class="w-full border-gray-300 rounded-md text-sm h-24">
            <option v-for="eq in equipmentStore.allEquipment" :key="eq.id" :value="eq.id">
              {{ eq.name }} ({{ eq.equipment_type }})
            </option>
          </select>
          <p class="text-xs text-gray-500">Hold Ctrl/Cmd to select multiple.</p>
        </div>
      </div>
    </div>

    <!-- Footer Actions -->
    <div class="flex justify-end space-x-3 pt-4 border-t">
      <button type="button" @click="$emit('close')"
        class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
      <button type="button" @click="handleSubmit"
        class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Save Goal</button>
    </div>
  </div>
</template>/template>
