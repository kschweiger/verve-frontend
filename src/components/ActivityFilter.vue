<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import { useTypeStore } from '@/stores/types';
import type { ActivityFilters } from '@/stores/activity';

const typeStore = useTypeStore();

const props = defineProps<{
  initialFilters?: ActivityFilters;
}>();

const emit = defineEmits<{
  (e: 'filter-change', filters: ActivityFilters): void;
}>();

const year = ref<number | null>(props.initialFilters?.year ?? null);
const month = ref<number | null>(props.initialFilters?.month ?? null);
const typeId = ref<number | null>(props.initialFilters?.type_id ?? null);
const subTypeId = ref<number | null>(props.initialFilters?.sub_type_id ?? null);

const availableSubTypes = computed(() => {
  if (!typeId.value) return [];
  const foundType = typeStore.activityTypes.find((t) => t.id === typeId.value);
  return foundType?.sub_types || [];
});

const availableYears = Array.from({ length: 20 }, (_, i) => new Date().getFullYear() - i);

watch(year, (newYear) => {
  if (newYear === null) {
    month.value = null;
  }
});

watch(typeId, () => {
  subTypeId.value = null;
});

onMounted(() => {
  typeStore.fetchActivityTypes();
});

function applyFilters() {
  emit('filter-change', {
    year: year.value,
    month: year.value ? month.value : null,
    type_id: typeId.value,
    sub_type_id: typeId.value ? subTypeId.value : null,
  });
}

function clearFilters() {
  year.value = null;
  month.value = null;
  typeId.value = null;
  subTypeId.value = null;
  applyFilters();
}
</script>

<template>
  <div class="p-5 bg-white rounded-xl shadow-sm border border-verve-medium/30">
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      <!-- Year Filter -->
      <div class="lg:col-span-1">
        <label for="filter-year" class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">Year</label>
        <select id="filter-year" v-model="year"
          class="block w-full text-sm border-verve-medium rounded-lg focus:ring-verve-dark focus:border-verve-dark bg-verve-light/20">
          <option :value="null">All Years</option>
          <option v-for="y in availableYears" :key="y" :value="y">{{ y }}</option>
        </select>
      </div>

      <!-- Month Filter -->
      <div class="lg:col-span-1">
        <label for="filter-month" class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">Month</label>
        <select id="filter-month" v-model="month" :disabled="!year"
          class="block w-full text-sm border-verve-medium rounded-lg focus:ring-verve-dark focus:border-verve-dark bg-verve-light/20 disabled:bg-gray-100 disabled:text-gray-400">
          <option :value="null">All Months</option>
          <option v-for="m in 12" :key="m" :value="m">
            {{ new Date(0, m - 1).toLocaleString('default', { month: 'long' }) }}
          </option>
        </select>
      </div>

      <!-- Type Filter -->
      <div class="lg:col-span-1">
        <label for="filter-type" class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">Type</label>
        <select id="filter-type" v-model="typeId"
          class="block w-full text-sm border-verve-medium rounded-lg focus:ring-verve-dark focus:border-verve-dark bg-verve-light/20">
          <option :value="null">All Types</option>
          <option v-for="t in typeStore.activityTypes" :key="t.id" :value="t.id">
            {{ t.name }}
          </option>
        </select>
      </div>

      <!-- Sub-Type Filter -->
      <div class="lg:col-span-1">
        <label for="filter-sub-type" class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">Sub-Type</label>
        <select id="filter-sub-type" v-model="subTypeId" :disabled="availableSubTypes.length === 0"
          class="block w-full text-sm border-verve-medium rounded-lg focus:ring-verve-dark focus:border-verve-dark bg-verve-light/20 disabled:bg-gray-100 disabled:text-gray-400">
          <option :value="null">All Sub-Types</option>
          <option v-for="st in availableSubTypes" :key="st.id" :value="st.id">
            {{ st.name }}
          </option>
        </select>
      </div>

      <!-- Action Buttons -->
      <div class="col-span-full lg:col-span-2 flex items-end gap-3">
        <button @click="applyFilters"
          class="flex-1 py-2 px-4 bg-verve-neon text-verve-brown font-bold rounded-xl shadow-sm hover:brightness-105 transition-all border border-verve-dark/5">
          Search
        </button>
        <button @click="clearFilters"
          class="flex-1 py-2 px-4 bg-white border border-verve-medium text-verve-brown font-semibold rounded-xl hover:bg-verve-light transition-all">
          Clear
        </button>
      </div>
    </div>
  </div>
</template>
