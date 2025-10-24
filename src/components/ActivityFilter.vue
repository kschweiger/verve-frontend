<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import { useActivityStore } from '@/stores/activity';
import { useTypeStore } from '@/stores/types';

const activityStore = useActivityStore();
const typeStore = useTypeStore();

// Local state for the filter inputs, initialized from the store's current filters
const year = ref<number | null>(activityStore.currentFilters.year ?? null);
const month = ref<number | null>(activityStore.currentFilters.month ?? null);
const typeId = ref<number | null>(activityStore.currentFilters.type_id ?? null);
const subTypeId = ref<number | null>(activityStore.currentFilters.sub_type_id ?? null);

// --- Dependent Dropdown Logic (same as in the upload widget) ---
const availableSubTypes = computed(() => {
  if (!typeId.value) return [];
  const foundType = typeStore.activityTypes.find(t => t.id === typeId.value);
  return foundType?.sub_types || [];
});

watch(typeId, () => {
  subTypeId.value = null; // Reset sub-type when main type changes
});

// --- Data Fetching ---
onMounted(() => {
  typeStore.fetchActivityTypes(); // Ensure we have the types for the dropdowns
});

// --- Search Logic ---
function applyFilters() {
  activityStore.fetchActivities({
    year: year.value,
    month: month.value,
    type_id: typeId.value,
    sub_type_id: subTypeId.value,
  });
}

function clearFilters() {
  year.value = null;
  month.value = null;
  typeId.value = null;
  subTypeId.value = null;
  applyFilters(); // Re-fetch with no filters
}

// A simple array for the year dropdown
const availableYears = Array.from({ length: 20 }, (_, i) => new Date().getFullYear() - i);
</script>

<template>
  <div class="p-4 bg-gray-50 rounded-lg shadow-inner">
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      <!-- Year Filter -->
      <div class="lg:col-span-1">
        <label for="filter-year" class="block text-sm font-medium text-gray-700">Year</label>
        <select id="filter-year" v-model="year"
          class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md">
          <option :value="null">All Years</option>
          <option v-for="y in availableYears" :key="y" :value="y">{{ y }}</option>
        </select>
      </div>

      <!-- Month Filter -->
      <div class="lg:col-span-1">
        <label for="filter-month" class="block text-sm font-medium text-gray-700">Month</label>
        <select id="filter-month" v-model="month" :disabled="!year"
          class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md disabled:bg-gray-200">
          <option :value="null">All Months</option>
          <option v-for="m in 12" :key="m" :value="m">{{ new Date(0, m - 1).toLocaleString('default', { month: 'long' })
            }}</option>
        </select>
      </div>

      <!-- Type Filter -->
      <div class="lg:col-span-1">
        <label for="filter-type" class="block text-sm font-medium text-gray-700">Type</label>
        <select id="filter-type" v-model="typeId"
          class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md">
          <option :value="null">All Types</option>
          <option v-for="t in typeStore.activityTypes" :key="t.id" :value="t.id">{{ t.name }}</option>
        </select>
      </div>

      <!-- Sub-Type Filter -->
      <div class="lg:col-span-1">
        <label for="filter-sub-type" class="block text-sm font-medium text-gray-700">Sub-Type</label>
        <select id="filter-sub-type" v-model="subTypeId" :disabled="availableSubTypes.length === 0"
          class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md disabled:bg-gray-200">
          <option :value="null">All Sub-Types</option>
          <option v-for="st in availableSubTypes" :key="st.id" :value="st.id">{{ st.name }}</option>
        </select>
      </div>

      <!-- Action Buttons -->
      <div class="col-span-full lg:col-span-2 flex items-end space-x-2">
        <button @click="applyFilters"
          class="flex-1 w-full justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">
          Search
        </button>
        <button @click="clearFilters"
          class="flex-1 w-full justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
          Clear
        </button>
      </div>
    </div>
  </div>
</template>
