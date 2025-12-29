<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useGoalStore, type GoalCreatePayload } from '@/stores/goals';
import { useTypeStore } from '@/stores/types';
import { useEquipmentStore } from '@/stores/equipment';

const emit = defineEmits(['close', 'saved']);

const goalStore = useGoalStore();
const typeStore = useTypeStore();
const equipmentStore = useEquipmentStore();

// --- Helper for current week ---
function getCurrentWeekNumber() {
  const date = new Date();
  const startDate = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.valueOf() - startDate.valueOf()) / (24 * 60 * 60 * 1000));
  return Math.ceil((days + 1) / 7);
}

// --- Form State ---
const form = ref({
  name: '',
  description: '',
  target: 0,
  temporal_type: 'monthly', // 'weekly' | 'monthly' | 'yearly'

  // Timeframe vars
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1,
  week: getCurrentWeekNumber(),

  // Scope toggles
  is_all_months: false, // For Monthly type
  weekly_scope: 'specific_week', // 'specific_week' | 'all_in_month' | 'all_in_year'

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

  // Week validation
  if (form.value.temporal_type === 'weekly' && form.value.weekly_scope === 'specific_week') {
    if (form.value.week < 1 || form.value.week > 53) {
      errors.value.week = 'Week must be between 1 and 53';
      isValid = false;
    }
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

  // 3. Determine Date Params based on Temporal Type & Scope
  let finalMonth: number | null | undefined = null;
  let finalWeek: number | null | undefined = null;

  if (form.value.temporal_type === 'monthly') {
    // Logic: Month is number, or null if "All Months"
    finalMonth = form.value.is_all_months ? null : form.value.month;
    finalWeek = null;
  }
  else if (form.value.temporal_type === 'weekly') {
    switch (form.value.weekly_scope) {
      case 'specific_week':
        // Year + Week. (Month ignored/optional, but backend infers from week usually, so send null)
        finalWeek = form.value.week;
        finalMonth = null;
        break;
      case 'all_in_month':
        // Year + Month. Week must be null to trigger "All weeks in month" logic
        finalWeek = null;
        finalMonth = form.value.month;
        break;
      case 'all_in_year':
        // Year only. Week and Month null to trigger "All weeks in year" logic
        finalWeek = null;
        finalMonth = null;
        break;
    }
  }
  else if (form.value.temporal_type === 'yearly') {
    finalMonth = null;
    finalWeek = null;
  }

  const payload: GoalCreatePayload & { week?: number | null } = {
    name: form.value.name,
    description: form.value.description || undefined,
    target: form.value.target,
    type: form.value.type,
    aggregation: form.value.aggregation,
    temporal_type: form.value.temporal_type,
    year: form.value.year,
    month: finalMonth,
    week: finalWeek, // Pass to backend
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

    <!-- Timeframe Section -->
    <div class="bg-gray-50 p-3 rounded-md border border-gray-200">
      <h4 class="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Timeframe</h4>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

        <!-- 1. Frequency -->
        <div>
          <label class="block text-sm font-medium text-gray-700">Frequency</label>
          <select v-model="form.temporal_type" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>

        <!-- 2. Year -->
        <div>
          <label class="block text-sm font-medium text-gray-700">Year</label>
          <input v-model="form.year" type="number" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
        </div>

        <!-- === WEEKLY SPECIFIC UI === -->
        <template v-if="form.temporal_type === 'weekly'">
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-gray-700">Creation Scope</label>
            <select v-model="form.weekly_scope" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
              <option value="specific_week">Single Specific Week</option>
              <option value="all_in_month">All Weeks in a specific Month</option>
              <option value="all_in_year">All Weeks in the Year</option>
            </select>
          </div>

          <!-- Specific Week Input -->
          <div v-if="form.weekly_scope === 'specific_week'">
            <label class="block text-sm font-medium text-gray-700">Week Number (1-53)</label>
            <input v-model="form.week" type="number" min="1" max="53"
              class="mt-1 block w-full border rounded-md shadow-sm"
              :class="errors.week ? 'border-red-500' : 'border-gray-300'" />
            <p v-if="errors.week" class="text-red-500 text-xs mt-1">{{ errors.week }}</p>
          </div>

          <!-- Month Selector (For "Specific Week" context if helpful, or "All in Month") -->
          <div v-if="form.weekly_scope === 'all_in_month'">
            <label class="block text-sm font-medium text-gray-700">Select Month</label>
            <select v-model="form.month" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
              <option v-for="m in 12" :key="m" :value="m">{{ new Date(0, m - 1).toLocaleString('default', {
                month:
                  'long'
              }) }}</option>
            </select>
          </div>
        </template>

        <!-- === MONTHLY SPECIFIC UI === -->
        <template v-if="form.temporal_type === 'monthly'">
          <div class="md:col-span-2 flex items-center space-x-4">
            <div class="flex-grow">
              <label class="block text-sm font-medium text-gray-700">Month</label>
              <select v-model="form.month" :disabled="form.is_all_months"
                class="mt-1 block w-full border-gray-300 rounded-md shadow-sm disabled:bg-gray-100">
                <option v-for="m in 12" :key="m" :value="m">{{ new Date(0, m - 1).toLocaleString('default', {
                  month:
                    'long'
                }) }}</option>
              </select>
            </div>
            <div class="flex items-center pt-6">
              <input v-model="form.is_all_months" type="checkbox" id="all-months"
                class="h-4 w-4 text-indigo-600 rounded" />
              <label for="all-months" class="ml-2 text-sm text-gray-700">Create for every month</label>
            </div>
          </div>
        </template>

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
</template>
