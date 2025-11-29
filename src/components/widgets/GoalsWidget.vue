<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useGoalStore, type Goal } from '@/stores/goals';
import GoalCreateForm from '@/components/forms/GoalCreateForm.vue';

const goalStore = useGoalStore();
const showCreateModal = ref(false);

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

// Local state to track the "step" amount for manual goals
// Key = goal.id, Value = amount (number)
const manualSteps = ref<Record<string, number>>({});

onMounted(() => {
  goalStore.fetchGoals(currentYear, currentMonth);
});

// Formatting Helpers
const getGoalUnit = (agg: string) => {
  if (agg.includes('distance')) return 'km';
  if (agg === 'duration') return 'h';
  return '';
};

const formatValue = (val: number, agg: string) => {
  if (agg === 'duration') return (val / 3600).toFixed(1);
  if (agg.includes('distance')) return val.toFixed(1);
  return val.toString();
};

const getProgressBarColor = (goal: Goal) => {
  if (goal.reached) return 'bg-green-500';
  if (goal.progress > 0) return 'bg-indigo-600';
  return 'bg-gray-300';
};

// --- Manual Goal Logic ---
const getStep = (goalId: string) => manualSteps.value[goalId] || 1;

const updateStep = (goalId: string, event: Event) => {
  const val = parseInt((event.target as HTMLInputElement).value);
  if (val > 0) manualSteps.value[goalId] = val;
};

const handleManualUpdate = async (goal: Goal, increase: boolean) => {
  const amount = getStep(goal.id);
  await goalStore.modifyManualGoal(goal.id, increase, amount);
};
</script>

<template>
  <div class="bg-white rounded-lg shadow-md p-6 relative">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-xl font-bold text-gray-800">Monthly Goals</h3>
      <button @click="showCreateModal = true" class="text-sm text-indigo-600 hover:text-indigo-800 font-semibold">
        + Add Goal
      </button>
    </div>

    <div v-if="goalStore.isLoading" class="text-center py-4 text-gray-500">Loading...</div>

    <div v-else-if="goalStore.goals.length === 0" class="text-center py-6 text-gray-400">
      No goals set for this month.
    </div>

    <div v-else class="space-y-6"> <!-- Increased spacing slightly -->
      <div v-for="goal in goalStore.goals" :key="goal.id">
        <!-- Goal Header -->
        <div class="flex justify-between text-sm mb-1">
          <span class="font-medium text-gray-700 truncate pr-2" :title="goal.name">{{ goal.name }}</span>
          <span class="text-gray-500 whitespace-nowrap">
            {{ formatValue(goal.current, goal.aggregation) }} / {{ formatValue(goal.target, goal.aggregation) }} {{
              getGoalUnit(goal.aggregation) }}
          </span>
        </div>

        <!-- Progress Bar -->
        <div class="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden mb-2">
          <div class="h-2.5 rounded-full transition-all duration-500" :class="getProgressBarColor(goal)"
            :style="{ width: `${Math.min(goal.progress * 100, 100)}%` }"></div>
        </div>

        <!-- Manual Controls (Only for 'manual' type) -->
        <div v-if="goal.type === 'manual'" class="flex items-center justify-end space-x-2">
          <span class="text-xs text-gray-400">Modify:</span>

          <button @click="handleManualUpdate(goal, false)"
            class="w-6 h-6 flex items-center justify-center rounded bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-600 transition-colors"
            title="Decrease">
            -
          </button>

          <!-- Small input for step size -->
          <input type="number" min="1" :value="getStep(goal.id)" @input="updateStep(goal.id, $event)"
            class="w-12 h-6 text-xs text-center border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500" />

          <button @click="handleManualUpdate(goal, true)"
            class="w-6 h-6 flex items-center justify-center rounded bg-gray-100 hover:bg-green-100 text-gray-600 hover:text-green-600 transition-colors"
            title="Increase">
            +
          </button>
        </div>
      </div>
    </div>

    <!-- Simple Modal Overlay -->
    <div v-if="showCreateModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <GoalCreateForm @close="showCreateModal = false" @saved="goalStore.fetchGoals(currentYear, currentMonth)" />
      </div>
    </div>
  </div>
</template>
