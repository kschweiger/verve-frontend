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

function getISOWeek(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
const currentWeek = getISOWeek(now);

// --- Tabs State ---
type Tab = 'weekly' | 'monthly' | 'yearly';
const activeTab = ref<Tab>('monthly');

const tabs: Tab[] = ['weekly', 'monthly', 'yearly'];

onMounted(() => {
  goalStore.fetchAllGoalsForView(currentYear, currentMonth, currentWeek);
});

const currentGoals = computed(() => {
  switch (activeTab.value) {
    case 'weekly':
      return goalStore.weeklyGoals;
    case 'monthly':
      return goalStore.monthlyGoals;
    case 'yearly':
      return goalStore.yearlyGoals;
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
  await goalStore.modifyManualGoal(goal.id, increase, amount);
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
  if (goal.reached) return 'bg-verve-neon';
  if (goal.progress > 0) return 'bg-verve-orange';
  return 'bg-verve-medium';
};
</script>

<template>
  <div
    class="bg-white rounded-xl shadow-sm border border-verve-medium/30 p-6 relative flex flex-col h-full min-h-[300px]">
    <!-- Header -->
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-xl font-bold text-verve-brown">My Goals</h3>
      <button @click="showCreateModal = true"
        class="text-sm text-verve-orange hover:text-verve-brown font-bold transition-colors cursor-pointer">
        + Add Goal
      </button>
    </div>

    <!-- Tabs -->
    <div class="flex border-b border-verve-medium/30 mb-4">
      <button v-for="tab in tabs" :key="tab" @click="activeTab = tab"
        class="pb-2 px-3 text-sm font-bold transition-colors relative capitalize cursor-pointer" :class="activeTab === tab
            ? 'text-verve-brown'
            : 'text-verve-brown/50 hover:text-verve-brown/80'
          ">
        {{ tab }}
        <!-- Active Indicator -->
        <div v-if="activeTab === tab" class="absolute bottom-0 left-0 w-full h-0.5 bg-verve-orange"></div>
      </button>
    </div>

    <!-- Content -->
    <div v-if="goalStore.isLoading" class="grow flex items-center justify-center text-verve-brown/60 text-sm">
      Loading...
    </div>

    <div v-else-if="currentGoals.length === 0"
      class="grow flex flex-col items-center justify-center text-verve-brown/50 py-6">
      <p>No {{ activeTab }} goals set.</p>
      <p class="text-xs mt-1">Time to challenge yourself!</p>
    </div>

    <div v-else class="space-y-5">
      <div v-for="goal in currentGoals" :key="goal.id">
        <!-- Goal Header -->
        <div class="flex justify-between text-sm mb-1.5">
          <span class="font-bold text-verve-brown truncate pr-2 w-2/3" :title="goal.name">
            {{ goal.name }}
          </span>
          <span class="text-verve-brown/70 whitespace-nowrap text-xs flex items-center font-mono">
            {{ formatValue(goal.current, goal.aggregation) }} /
            {{ formatValue(goal.target, goal.aggregation) }} {{ getGoalUnit(goal.aggregation) }}
          </span>
        </div>

        <!-- Progress Bar -->
        <div class="progress-track mb-2">
          <div class="progress-fill" :class="getProgressBarColor(goal)"
            :style="{ width: `${Math.min(goal.progress * 100, 100)}%` }"></div>
        </div>

        <!-- Manual Controls -->
        <div v-if="goal.type === 'manual'" class="flex items-center justify-end gap-1">
          <button @click="handleManualUpdate(goal, false)"
            class="size-6 flex items-center justify-center rounded-lg bg-verve-light text-verve-brown hover:bg-red-100 hover:text-red-600 transition-colors"
            title="Decrease">
            -
          </button>

          <input type="number" min="1" :value="getStep(goal.id)" @input="updateStep(goal.id, $event)"
            class="w-10 h-6 text-xs text-center border-verve-medium rounded-lg text-verve-brown bg-white focus:ring-verve-dark focus:border-verve-dark" />

          <button @click="handleManualUpdate(goal, true)"
            class="size-6 flex items-center justify-center rounded-lg bg-verve-light text-verve-brown hover:bg-green-100 hover:text-green-600 transition-colors"
            title="Increase">
            +
          </button>
        </div>
      </div>
    </div>

    <!-- Simple Modal Overlay -->
    <div v-if="showCreateModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-verve-brown/20 backdrop-blur-sm">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <GoalCreateForm @close="showCreateModal = false"
          @saved="goalStore.fetchAllGoalsForView(currentYear, currentMonth, currentWeek)" />
      </div>
    </div>
  </div>
</template>
