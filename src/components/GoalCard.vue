<script setup lang="ts">
import { ref, computed } from 'vue';
import { type Goal } from '@/stores/goals';
import { useTypeStore } from '@/stores/types';
import { useEquipmentStore } from '@/stores/equipment';

const props = defineProps<{ goal: Goal }>();
const emit = defineEmits(['edit', 'delete', 'clone', 'manual-update']);

const typeStore = useTypeStore(); // Used to lookup activity names
const equipmentStore = useEquipmentStore();

const isEquipmentExpanded = ref(false);

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

interface Badge {
  label: string;
  type: 'general' | 'equipment';
  clickable: boolean;
}



const constraintBadges = computed<Badge[]>(() => {
  const badges: Badge[] = [];
  const c = props.goal.constraints;
  if (!c) return badges;

  // 1. Type Constraint
  if (c.type_id) {
    const type = typeStore.activityTypes.find(t => t.id === c.type_id);
    if (type) {
      let label = type.name;
      if (c.sub_type_id) {
        const sub = type.sub_types.find(st => st.id === c.sub_type_id);
        if (sub) label += ` (${sub.name})`;
      }
      badges.push({ label, type: 'general', clickable: false });
    } else {
      badges.push({ label: 'Specific Activity Type', type: 'general', clickable: false });
    }
  }

  // 2. Equipment Constraint
  if (c.equipment_ids && c.equipment_ids.length > 0) {
    badges.push({
      label: `${c.equipment_ids.length} Equipment Item(s)`,
      type: 'equipment',
      clickable: true
    });
  }

  return badges;
});

// Helper to resolve the actual names of the equipment
const resolvedEquipmentNames = computed(() => {
  const ids = props.goal.constraints?.equipment_ids || [];
  return ids.map((id: string) => {
    const eq = equipmentStore.allEquipment.find(e => e.id === id);
    return eq ? eq.name : 'Unknown Item'; // Fallback if store isn't loaded yet
  });
});

const toggleEquipment = () => {
  isEquipmentExpanded.value = !isEquipmentExpanded.value;
};
</script>

<template>
  <div
    class="bg-white rounded-lg border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow flex flex-col h-full">
    <div class="flex justify-between items-start mb-2">
      <!-- Title & Constraints -->
      <div class="flex-grow pr-2">
        <h4 class="text-lg font-bold text-gray-800 break-words">{{ goal.name }}</h4>

        <!-- BADGES ROW -->
        <div v-if="constraintBadges.length > 0" class="flex flex-wrap gap-2 mt-1">
          <button v-for="(badge, index) in constraintBadges" :key="index"
            @click="badge.type === 'equipment' ? toggleEquipment() : null" :class="[
              'px-2 py-0.5 rounded text-xs font-medium border transition-colors',
              badge.clickable
                ? 'bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-200 cursor-pointer flex items-center gap-1'
                : 'bg-gray-100 text-gray-700 border-gray-200 cursor-default'
            ]">
            {{ badge.label }}
            <!-- Add a tiny chevron icon if clickable -->
            <svg v-if="badge.clickable" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
              class="w-3 h-3 transition-transform" :class="isEquipmentExpanded ? 'rotate-180' : ''">
              <path fill-rule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clip-rule="evenodd" />
            </svg>
          </button>
        </div>

        <!-- EXPANDED EQUIPMENT LIST -->
        <div v-if="isEquipmentExpanded"
          class="mt-2 p-2 bg-gray-50 rounded border border-gray-100 text-xs text-gray-600 animate-fadeIn">
          <p class="font-semibold mb-1 text-gray-500 uppercase tracking-wider text-[10px]">Included Gear:</p>
          <ul class="list-disc list-inside space-y-0.5">
            <li v-for="name in resolvedEquipmentNames" :key="name">{{ name }}</li>
          </ul>
        </div>

        <p v-if="goal.description" class="text-sm text-gray-500 mt-2 line-clamp-2">{{ goal.description }}</p>
      </div>

      <!-- Context Menu / Actions -->
      <div class="flex items-center space-x-1 flex-shrink-0">
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

    <!-- Spacer to push Progress bar to bottom if content is short -->
    <div class="mt-auto"></div>

    <!-- Progress Stats -->
    <div class="flex justify-between items-end mb-1 text-sm mt-3">
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

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fadeIn {
  animation: fadeIn 0.2s ease-out forwards;
}
</style>
