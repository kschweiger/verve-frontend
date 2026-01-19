<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useGoalStore, type GoalCreatePayload } from '@/stores/goals';
import { useTypeStore } from '@/stores/types';
import { useEquipmentStore } from '@/stores/equipment';

const emit = defineEmits(['close', 'saved']);

const goalStore = useGoalStore();
const typeStore = useTypeStore();
const equipmentStore = useEquipmentStore();

function getCurrentWeekNumber() {
  const date = new Date();
  const startDate = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.valueOf() - startDate.valueOf()) / (24 * 60 * 60 * 1000));
  return Math.ceil((days + 1) / 7);
}

const form = ref({
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

const errors = ref<Record<string, string>>({});

const useActivityConstraint = ref(false);
const selectedTypeId = ref<number | null>(null);
const selectedSubTypeId = ref<number | null>(null);

const useEquipmentConstraint = ref(false);
const selectedEquipmentIds = ref<string[]>([]);

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
  if (form.value.temporal_type === 'weekly' && form.value.weekly_scope === 'specific_week') {
    if (form.value.week < 1 || form.value.week > 53) {
      errors.value.week = 'Week must be between 1 and 53';
      isValid = false;
    }
  }
  return isValid;
}

async function handleSubmit() {
  if (!validate()) return;

  const constraints: Record<string, any> = {};
  if (useActivityConstraint.value && selectedTypeId.value) {
    constraints['type_id'] = selectedTypeId.value;
    if (selectedSubTypeId.value) constraints['sub_type_id'] = selectedSubTypeId.value;
  }
  if (useEquipmentConstraint.value && selectedEquipmentIds.value.length > 0) {
    constraints['equipment_ids'] = selectedEquipmentIds.value;
  }

  let finalMonth: number | null | undefined = null;
  let finalWeek: number | null | undefined = null;

  if (form.value.temporal_type === 'monthly') {
    finalMonth = form.value.is_all_months ? null : form.value.month;
    finalWeek = null;
  } else if (form.value.temporal_type === 'weekly') {
    switch (form.value.weekly_scope) {
      case 'specific_week': finalWeek = form.value.week; finalMonth = null; break;
      case 'all_in_month': finalWeek = null; finalMonth = form.value.month; break;
      case 'all_in_year': finalWeek = null; finalMonth = null; break;
    }
  } else if (form.value.temporal_type === 'yearly') {
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
    week: finalWeek,
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
  <div class="space-y-5">
    <div class="flex justify-between items-center border-b border-verve-medium/30 pb-3">
      <h3 class="text-xl font-bold text-verve-brown">Set New Goal</h3>
      <button @click="$emit('close')" class="text-verve-brown/40 hover:text-verve-brown transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Name & Description -->
    <div class="grid grid-cols-1 gap-4">
      <div>
        <label class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">Goal Name <span
            class="text-red-500">*</span></label>
        <input v-model="form.name" type="text" placeholder="e.g. Run 100km"
          class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white placeholder-verve-brown/30"
          :class="errors.name ? 'border-red-500' : ''" />
        <p v-if="errors.name" class="text-red-500 text-xs mt-1">{{ errors.name }}</p>
      </div>
      <div>
        <label class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">Description</label>
        <input v-model="form.description" type="text" placeholder="Optional details..."
          class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white placeholder-verve-brown/30" />
      </div>
    </div>

    <!-- Timeframe Section -->
    <div class="bg-verve-light/20 p-4 rounded-xl border border-verve-medium/30">
      <h4 class="text-xs font-bold text-verve-brown/50 uppercase tracking-wide mb-3">Timeframe</h4>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        <!-- WEEKLY UI -->
        <template v-if="form.temporal_type === 'weekly'">
          <div class="md:col-span-2">
            <label class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">Creation Scope</label>
            <select v-model="form.weekly_scope"
              class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark bg-white">
              <option value="specific_week">Single Specific Week</option>
              <option value="all_in_month">All Weeks in a specific Month</option>
              <option value="all_in_year">All Weeks in the Year</option>
            </select>
          </div>

          <div v-if="form.weekly_scope === 'specific_week'">
            <label class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">Week Number (1-53)</label>
            <input v-model="form.week" type="number" min="1" max="53"
              class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark bg-white"
              :class="errors.week ? 'border-red-500' : ''" />
            <p v-if="errors.week" class="text-red-500 text-xs mt-1">{{ errors.week }}</p>
          </div>

          <div v-if="form.weekly_scope === 'all_in_month'">
            <label class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">Select Month</label>
            <select v-model="form.month"
              class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark bg-white">
              <option v-for="m in 12" :key="m" :value="m">{{ new Date(0, m - 1).toLocaleString('default', {
                month:
                'long' }) }}</option>
            </select>
          </div>
        </template>

        <!-- MONTHLY UI -->
        <template v-if="form.temporal_type === 'monthly'">
          <div class="md:col-span-2 flex items-center space-x-4">
            <div class="flex-grow">
              <label class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">Month</label>
              <select v-model="form.month" :disabled="form.is_all_months"
                class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark bg-white disabled:bg-gray-100 disabled:text-gray-400">
                <option v-for="m in 12" :key="m" :value="m">{{ new Date(0, m - 1).toLocaleString('default', {
                  month:
                  'long' }) }}</option>
              </select>
            </div>
            <div class="flex items-center pt-5">
              <input v-model="form.is_all_months" type="checkbox" id="all-months"
                class="h-4 w-4 rounded border-verve-medium" />
              <label for="all-months" class="ml-2 text-sm text-verve-brown font-medium">Every Month</label>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Goal Logic -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">Goal Type</label>
        <select v-model="form.type"
          class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark bg-white">
          <option value="activity">Based on Activities</option>
          <option value="manual">Manual Entry</option>
        </select>
      </div>
      <div>
        <label class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">Metric</label>
        <select v-model="form.aggregation"
          class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark bg-white">
          <option v-for="agg in aggregations" :key="agg.value" :value="agg.value">{{ agg.label }}</option>
        </select>
      </div>
    </div>

    <div>
      <label class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">Target Value <span
          class="text-red-500">*</span></label>
      <input v-model="form.target" type="number" step="any"
        class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark bg-white"
        :class="errors.target ? 'border-red-500' : ''" />
      <p v-if="errors.target" class="text-red-500 text-xs mt-1">{{ errors.target }}</p>
      <p class="text-xs text-verve-brown/50 mt-1 italic">If using Duration, enter seconds (e.g., 3600 = 1 hour).</p>
    </div>

    <!-- Constraints Section -->
    <div class="border-t border-verve-medium/30 pt-4">
      <h4 class="text-xs font-bold text-verve-brown/50 uppercase tracking-wide mb-3">Filters (Optional)</h4>

      <!-- Activity Type Constraint -->
      <div class="mb-4">
        <div class="flex items-center mb-2">
          <input v-model="useActivityConstraint" type="checkbox" id="use-type"
            class="h-4 w-4 rounded border-verve-medium" />
          <label for="use-type" class="ml-2 text-sm font-medium text-verve-brown">Limit by Activity Type</label>
        </div>
        <div v-if="useActivityConstraint" class="pl-6 grid grid-cols-2 gap-3">
          <select v-model="selectedTypeId"
            class="border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown bg-white">
            <option :value="null">Select Type...</option>
            <option v-for="t in typeStore.activityTypes" :key="t.id" :value="t.id">{{ t.name }}</option>
          </select>
          <select v-model="selectedSubTypeId" :disabled="!selectedTypeId"
            class="border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown bg-white disabled:bg-gray-50 disabled:text-gray-400">
            <option :value="null">Any Sub-Type</option>
            <option v-for="st in availableSubTypes" :key="st.id" :value="st.id">{{ st.name }}</option>
          </select>
        </div>
      </div>

      <!-- Equipment Constraint -->
      <div>
        <div class="flex items-center mb-2">
          <input v-model="useEquipmentConstraint" type="checkbox" id="use-equip"
            class="h-4 w-4 rounded border-verve-medium" />
          <label for="use-equip" class="ml-2 text-sm font-medium text-verve-brown">Limit by Equipment</label>
        </div>
        <div v-if="useEquipmentConstraint" class="pl-6">
          <select v-model="selectedEquipmentIds" multiple
            class="w-full border-verve-medium rounded-xl text-sm h-24 p-2 text-verve-brown bg-white">
            <option v-for="eq in equipmentStore.allEquipment" :key="eq.id" :value="eq.id">
              {{ eq.name }} ({{ eq.equipment_type }})
            </option>
          </select>
          <p class="text-xs text-verve-brown/50 mt-1">Hold Ctrl/Cmd to select multiple.</p>
        </div>
      </div>
    </div>

    <!-- Footer Actions -->
    <div class="flex justify-end space-x-3 pt-4 border-t border-verve-medium/30">
      <button type="button" @click="$emit('close')"
        class="px-5 py-2.5 border border-verve-medium/50 rounded-xl text-verve-brown font-semibold hover:bg-verve-light transition-colors">
        Cancel
      </button>
      <button type="button" @click="handleSubmit"
        class="px-6 py-2.5 bg-verve-neon text-verve-brown font-bold rounded-xl shadow-sm hover:brightness-105 border border-verve-dark/5 transition-all">
        Save Goal
      </button>
    </div>
  </div>
</template>
