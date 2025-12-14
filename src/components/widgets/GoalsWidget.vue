<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useGoalStore, type Goal } from '@/stores/goals';
import GoalCreateForm from '@/components/forms/GoalCreateForm.vue';

const goalStore = useGoalStore();
const showCreateModal = ref(false);

// --- Time State ---
const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth() + 1;

// Helper to get ISO Week
function getISOWeek(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
const currentWeek = getISOWeek(now);

// --- Tabs State ---
type Tab = 'weekly' | 'monthly' | 'yearly';
const activeTab = ref<Tab>('monthly'); // Default to monthly as it's the most common context

onMounted(() => {
  // Fetch everything for the current time context
  goalStore.fetchAllGoalsForView(currentYear, currentMonth, currentWeek);
});

// --- Computed Data ---
const currentGoals = computed(() => {
  switch (activeTab.value) {
    case 'weekly': return goalStore.weeklyGoals;
    case 'monthly': return goalStore.monthlyGoals;
    case 'yearly': return goalStore.yearlyGoals;
  }
});

// --- Manual Step Logic ---
const manualSteps = ref<Record<string, number>>({});
const getStep = (goalId: string) => manualSteps.value[goalId] || 1;
const updateStep = (goalId: string, event: Event) => {
  const val = parseInt((event.target as HTMLInputElement).value);
  if (val > 0) manualSteps.value[goalId] = val;
};

const handleManualUpdate = async (goal: Goal, increase: boolean) => {
  const amount = getStep(goal.id);
  // We use the store action to update backend, then refresh data
  await goalStore.modifyManualGoal(goal.id, increase, amount);
  // Re-fetch to update progress bars
  goalStore.fetchAllGoalsForView(currentYear, currentMonth, currentWeek);
};

// --- Formatting Helpers ---
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
</script>

<template>
  <div class="bg-white rounded-lg shadow-md p-6 relative flex flex-col h-full min-h-[300px]">

    <!-- Header -->
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-xl font-bold text-gray-800">My Goals</h3>
      <button @click="showCreateModal = true" class="text-sm text-indigo-600 hover:text-indigo-800 font-semibold">
        + Add Goal
      </button>
    </div>

    <!-- Tabs -->
    <div class="flex border-b border-gray-200 mb-4">
      <button @click="activeTab = 'weekly'" class="pb-2 px-3 text-sm font-medium transition-colors relative"
        :class="activeTab === 'weekly' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'">
        Weekly
        <div v-if="activeTab === 'weekly'" class="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600"></div>
      </button>
      <button @click="activeTab = 'monthly'" class="pb-2 px-3 text-sm font-medium transition-colors relative"
        :class="activeTab === 'monthly' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'">
        Monthly
        <div v-if="activeTab === 'monthly'" class="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600"></div>
      </button>
      <button @click="activeTab = 'yearly'" class="pb-2 px-3 text-sm font-medium transition-colors relative"
        :class="activeTab === 'yearly' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'">
        Yearly
        <div v-if="activeTab === 'yearly'" class="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600"></div>
      </button>
    </div>

    <!-- Content -->
    <div v-if="goalStore.isLoading" class="flex-grow flex items-center justify-center text-gray-500">
      Loading...
    </div>

    <div v-else-if="currentGoals.length === 0"
      class="flex-grow flex flex-col items-center justify-center text-gray-400 py-6">
      <p>No {{ activeTab }} goals set.</p>
      <p class="text-xs mt-1">Time to challenge yourself!</p>
    </div>

    <div v-else class="space-y-6">
      <div v-for="goal in currentGoals" :key="goal.id">
        <!-- Goal Header -->
        <div class="flex justify-between text-sm mb-1">
          <span class="font-medium text-gray-700 truncate pr-2 w-2/3" :title="goal.name">{{ goal.name }}</span>
          <span class="text-gray-500 whitespace-nowrap text-xs flex items-center">
            {{ formatValue(goal.current, goal.aggregation) }} / {{ formatValue(goal.target, goal.aggregation) }} {{
              getGoalUnit(goal.aggregation) }}
          </span>
        </div>

        <!-- Progress Bar -->
        <div class="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden mb-2">
          <div class="h-2.5 rounded-full transition-all duration-500" :class="getProgressBarColor(goal)"
            :style="{ width: `${Math.min(goal.progress * 100, 100)}%` }"></div>
        </div>

        <!-- Manual Controls (Only for 'manual' type) -->
        <div v-if="goal.type === 'manual'" class="flex items-center justify-end space-x-1">
          <button @click="handleManualUpdate(goal, false)"
            class="w-6 h-6 flex items-center justify-center rounded bg-gray-50 hover:bg-red-100 text-gray-500 hover:text-red-600 transition-colors border border-gray-200"
            title="Decrease">
            -
          </button>

          <input type="number" min="1" :value="getStep(goal.id)" @input="updateStep(goal.id, $event)"
            class="w-10 h-6 text-xs text-center border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500" />

          <button @click="handleManualUpdate(goal, true)"
            class="w-6 h-6 flex items-center justify-center rounded bg-gray-50 hover:bg-green-100 text-gray-500 hover:text-green-600 transition-colors border border-gray-200"
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
        <GoalCreateForm @close="showCreateModal = false"
          @saved="goalStore.fetchAllGoalsForView(currentYear, currentMonth, currentWeek)" />
      </div>
    </div>
  </div>
</template>
