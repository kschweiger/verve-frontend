<script setup lang="ts">
import { computed } from 'vue';
import { type Goal } from '@/stores/goals';
import { useTypeStore } from '@/stores/types';

const props = defineProps<{ goal: Goal }>();
const emit = defineEmits(['edit', 'delete', 'clone', 'manual-update']);

const typeStore = useTypeStore(); // Used to lookup activity names

// --- Helpers ---
const progressPercent = computed(() => Math.min(props.goal.progress * 100, 100));

const formatValue = (val: number, agg: string) => {
  if (agg === 'duration') {
    const hours = Math.floor(val / 3600);
    const mins = Math.floor((val % 3600) / 60);
    return `${hours}h ${mins}m`;
  }
  if (agg.includes('distance')) return `${val.toFixed(1)} km`;
  return val.toString();
};

// Resolve Constraint Names (e.g., "Cycling")
const constraintBadges = computed(() => {
  const badges: string[] = [];
  const c = props.goal.constraints;
  if (!c) return badges;

  // Type Constraint
  if (c.type_id) {
    const type = typeStore.activityTypes.find(t => t.id === c.type_id);
    if (type) {
      let label = type.name;
      // SubType Constraint
      if (c.sub_type_id) {
        const sub = type.sub_types.find(st => st.id === c.sub_type_id);
        if (sub) label += ` (${sub.name})`;
      }
      badges.push(label);
    } else {
      badges.push('Specific Activity Type');
    }
  }

  // Equipment Constraint
  if (c.equipment_ids && c.equipment_ids.length > 0) {
    badges.push(`${c.equipment_ids.length} Equipment Item(s)`);
  }

  return badges;
});
</script>

<template>
  <div class="bg-white rounded-lg border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow">
    <div class="flex justify-between items-start mb-2">
      <!-- Title & Constraints -->
      <div>
        <h4 class="text-lg font-bold text-gray-800">{{ goal.name }}</h4>
        <div v-if="constraintBadges.length > 0" class="flex flex-wrap gap-2 mt-1">
          <span v-for="badge in constraintBadges" :key="badge"
            class="px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
            {{ badge }}
          </span>
        </div>
        <p v-if="goal.description" class="text-sm text-gray-500 mt-1">{{ goal.description }}</p>
      </div>

      <!-- Context Menu / Actions -->
      <div class="flex items-center space-x-1">
        <!-- Manual +/- Controls -->
        <div v-if="goal.type === 'manual'" class="flex items-center bg-gray-100 rounded-md mr-2">
          <button @click="$emit('manual-update', goal, false)"
            class="px-2 py-1 hover:bg-red-100 text-gray-600 hover:text-red-600 rounded-l">-</button>
          <button @click="$emit('manual-update', goal, true)"
            class="px-2 py-1 hover:bg-green-100 text-gray-600 hover:text-green-600 rounded-r">+</button>
        </div>

        <button @click="$emit('edit', goal)" class="p-1.5 text-gray-400 hover:text-indigo-600 rounded hover:bg-gray-100"
          title="Edit">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
            <path
              d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
          </svg>
        </button>
        <button @click="$emit('clone', goal)" class="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-gray-100"
          title="Clone to next period">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
            <path
              d="M7 3.5A1.5 1.5 0 0 1 8.5 2h3.879a1.5 1.5 0 0 1 1.06.44l3.122 3.12A1.5 1.5 0 0 1 17 6.622V12.5a1.5 1.5 0 0 1-1.5 1.5h-1v-3.379a3 3 0 0 0-.879-2.121L9.5 4.379A3 3 0 0 0 7.379 3.5H7Z" />
            <path
              d="M4.5 5A1.5 1.5 0 0 0 3 6.5v6a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5v-6a1.5 1.5 0 0 0-1.5-1.5h-11Z" />
          </svg>
        </button>
        <button @click="$emit('delete', goal)" class="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-gray-100"
          title="Delete">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
            <path fill-rule="evenodd"
              d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z"
              clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Progress Stats -->
    <div class="flex justify-between items-end mb-1 text-sm">
      <div class="font-bold text-gray-900 text-2xl">
        {{ (goal.progress * 100).toFixed(0) }}%
      </div>
      <div class="text-gray-600">
        <span class="font-semibold text-gray-900">{{ formatValue(goal.current, goal.aggregation) }}</span>
        <span class="text-gray-400 mx-1">/</span>
        <span>{{ formatValue(goal.target, goal.aggregation) }}</span>
      </div>
    </div>

    <!-- Progress Bar -->
    <div class="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
      <div class="h-full rounded-full transition-all duration-500 relative"
        :class="goal.reached ? 'bg-green-500' : 'bg-indigo-600'" :style="{ width: `${progressPercent}%` }">
        <!-- Shimmer effect for active goals -->
        <div v-if="!goal.reached" class="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }

  100% {
    transform: translateX(100%);
  }
}
</style>
