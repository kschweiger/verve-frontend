<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useGoalStore, type GoalCreatePayload } from '@/stores/goals';
import { useTypeStore } from '@/stores/types';
import { useEquipmentStore } from '@/stores/equipment';

const props = defineProps<{
  location: { id: string; name: string };
}>();

const emit = defineEmits(['close', 'saved']);

const goalStore = useGoalStore();
const typeStore = useTypeStore();
const equipmentStore = useEquipmentStore();

// --- Form State ---
const form = ref({
  name: `Visit ${props.location.name}`,
  description: '',
  target: 1, // Default to 1 visit
  temporal_type: 'monthly',

  // Timeframe vars
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1,
  week: 1, // Default, will be updated by helper if needed

  // Scope toggles
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
  const t = typeStore.activityTypes.find(x => x.id === selectedTypeId.value);
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
  if (!form.value.name.trim()) { errors.value.name = 'Name is required.'; isValid = false; }
  if (form.value.target <= 0) { errors.value.target = 'Target must be > 0.'; isValid = false; }
  return isValid;
}

// --- Submit ---
async function handleSubmit() {
  if (!validate()) return;
  isSaving.value = true;

  // 1. Build Constraints
  const constraints: Record<string, any> = {
    location_id: props.location.id // <--- The core constraint
  };

  if (useActivityConstraint.value && selectedTypeId.value) {
    constraints['type_id'] = selectedTypeId.value;
    if (selectedSubTypeId.value) constraints['sub_type_id'] = selectedSubTypeId.value;
  }

  if (useEquipmentConstraint.value && selectedEquipmentIds.value.length > 0) {
    constraints['equipment_ids'] = selectedEquipmentIds.value;
  }

  // 2. Determine Date Params
  let finalMonth: number | null | undefined = null;
  let finalWeek: number | null | undefined = null;

  if (form.value.temporal_type === 'monthly') {
    finalMonth = form.value.is_all_months ? null : form.value.month;
  } else if (form.value.temporal_type === 'weekly') {
    switch (form.value.weekly_scope) {
      case 'specific_week': finalWeek = form.value.week; break;
      case 'all_in_month': finalMonth = form.value.month; break;
      case 'all_in_year': break;
    }
  }

  // 3. Payload
  const payload: GoalCreatePayload & { week?: number | null } = {
    name: form.value.name,
    description: form.value.description || undefined,
    target: form.value.target,
    type: 'location', // Locked to 'location'
    aggregation: 'count', // Locked to 'count' (Visits)
    temporal_type: form.value.temporal_type,
    year: form.value.year,
    month: finalMonth,
    week: finalWeek,
    constraints: constraints
  };

  const success = await goalStore.createGoal(payload);
  isSaving.value = false;

  if (success) {
    emit('saved');
    emit('close');
  } else {
    alert("Failed to create goal. " + (goalStore.error || ""));
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex justify-between items-start border-b pb-3">
      <div>
        <h3 class="text-lg font-bold text-gray-800">Set Location Goal</h3>
        <p class="text-sm text-indigo-600 font-medium">{{ location.name }}</p>
      </div>
      <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600">&times;</button>
    </div>

    <!-- Name -->
    <div>
      <label class="block text-sm font-medium text-gray-700">Goal Name</label>
      <input v-model="form.name" type="text"
        class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
      <p v-if="errors.name" class="text-red-500 text-xs mt-1">{{ errors.name }}</p>
    </div>

    <!-- Timeframe (Simplified Layout) -->
    <div class="bg-gray-50 p-3 rounded-md border border-gray-200 text-sm">
      <div class="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label class="block font-medium text-gray-700">Frequency</label>
          <select v-model="form.temporal_type" class="mt-1 w-full border-gray-300 rounded-md">
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
        <div>
          <label class="block font-medium text-gray-700">Year</label>
          <input v-model="form.year" type="number" class="mt-1 w-full border-gray-300 rounded-md" />
        </div>
      </div>

      <!-- Conditional Date Inputs -->
      <template v-if="form.temporal_type === 'monthly'">
        <div class="flex items-center space-x-3">
          <div class="flex-grow">
            <label class="block font-medium text-gray-700">Month</label>
            <select v-model="form.month" :disabled="form.is_all_months"
              class="mt-1 w-full border-gray-300 rounded-md disabled:bg-gray-200">
              <option v-for="m in 12" :key="m" :value="m">{{ new Date(0, m - 1).toLocaleString('default', {
                month:
                'long' }) }}</option>
            </select>
          </div>
          <div class="pt-6">
            <label class="flex items-center">
              <input v-model="form.is_all_months" type="checkbox" class="h-4 w-4 text-indigo-600 rounded" />
              <span class="ml-2 text-gray-600">All Months</span>
            </label>
          </div>
        </div>
      </template>

      <template v-if="form.temporal_type === 'weekly'">
        <div class="mb-2">
          <label class="block font-medium text-gray-700">Scope</label>
          <select v-model="form.weekly_scope" class="mt-1 w-full border-gray-300 rounded-md">
            <option value="specific_week">Specific Week</option>
            <option value="all_in_month">All weeks in Month</option>
            <option value="all_in_year">All weeks in Year</option>
          </select>
        </div>
        <div v-if="form.weekly_scope === 'specific_week'">
          <label class="block font-medium text-gray-700">Week Number</label>
          <input v-model="form.week" type="number" min="1" max="53" class="mt-1 w-full border-gray-300 rounded-md" />
        </div>
        <div v-if="form.weekly_scope === 'all_in_month'">
          <label class="block font-medium text-gray-700">Month</label>
          <select v-model="form.month" class="mt-1 w-full border-gray-300 rounded-md">
            <option v-for="m in 12" :key="m" :value="m">{{ new Date(0, m - 1).toLocaleString('default', {
              month: 'long'
              }) }}</option>
          </select>
        </div>
      </template>
    </div>

    <!-- Target -->
    <div>
      <label class="block text-sm font-medium text-gray-700">Target Visits</label>
      <input v-model="form.target" type="number" min="1"
        class="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
    </div>

    <!-- Optional Filters -->
    <div class="border-t pt-3">
      <h4 class="text-xs font-bold text-gray-500 uppercase mb-2">Conditions (Optional)</h4>

      <!-- Type Filter -->
      <div class="mb-2">
        <label class="flex items-center">
          <input v-model="useActivityConstraint" type="checkbox" class="h-4 w-4 text-indigo-600 rounded" />
          <span class="ml-2 text-sm text-gray-700">Specific Activity Type</span>
        </label>
        <div v-if="useActivityConstraint" class="pl-6 mt-1 flex gap-2">
          <select v-model="selectedTypeId" class="w-1/2 border-gray-300 rounded-md text-sm">
            <option :value="null">Type...</option>
            <option v-for="t in typeStore.activityTypes" :key="t.id" :value="t.id">{{ t.name }}</option>
          </select>
          <select v-model="selectedSubTypeId" :disabled="!selectedTypeId"
            class="w-1/2 border-gray-300 rounded-md text-sm disabled:bg-gray-100">
            <option :value="null">Any Sub-Type</option>
            <option v-for="st in availableSubTypes" :key="st.id" :value="st.id">{{ st.name }}</option>
          </select>
        </div>
      </div>

      <!-- Equipment Filter -->
      <div>
        <label class="flex items-center">
          <input v-model="useEquipmentConstraint" type="checkbox" class="h-4 w-4 text-indigo-600 rounded" />
          <span class="ml-2 text-sm text-gray-700">Specific Equipment</span>
        </label>
        <div v-if="useEquipmentConstraint" class="pl-6 mt-1">
          <select v-model="selectedEquipmentIds" multiple class="w-full border-gray-300 rounded-md text-sm h-16">
            <option v-for="eq in equipmentStore.allEquipment" :key="eq.id" :value="eq.id">
              {{ eq.name }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex justify-end space-x-3 pt-2">
      <button @click="$emit('close')" class="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
      <button @click="handleSubmit" :disabled="isSaving"
        class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50">
        {{ isSaving ? 'Saving...' : 'Create Goal' }}
      </button>
    </div>
  </div>
</template>
