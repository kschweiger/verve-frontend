<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useGoalStore, type Goal } from '@/stores/goals';
import { useActivityStore } from '@/stores/activity';
import { useDashboardLoadError } from '@/composables/useDashboardLoadError';
import GoalCreateForm from '@/components/forms/GoalCreateForm.vue';

const goalStore = useGoalStore();
const activityStore = useActivityStore();
const { t, n } = useI18n();
const formatLoadError = useDashboardLoadError();
const showCreateModal = ref(false);

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

type Tab = 'weekly' | 'monthly' | 'yearly';
const activeTab = ref<Tab>('monthly');

const tabs: Tab[] = ['weekly', 'monthly', 'yearly'];

const refreshGoals = () => {
  goalStore.fetchAllGoalsForView(currentYear, currentMonth, currentWeek);
};

onMounted(refreshGoals);

watch(() => activityStore.lastUpdate, refreshGoals);

const currentGoals = computed(() => {
  const goalsByPeriod: Record<Tab, Goal[]> = {
    weekly: goalStore.weeklyGoals,
    monthly: goalStore.monthlyGoals,
    yearly: goalStore.yearlyGoals,
  };
  return goalsByPeriod[activeTab.value];
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
const decimalPrecision = { minimumFractionDigits: 1, maximumFractionDigits: 1 };
const countPrecision = { maximumSignificantDigits: 21 };

function formatValue(value: number, aggregation: Goal['aggregation'], showUnit = false): string {
  if (aggregation === 'duration') {
    const hours = n(value / 3600, decimalPrecision);
    return showUnit ? t('dashboard.goals.hours', { value: hours }) : hours;
  }
  if (aggregation.includes('distance')) {
    return showUnit
      ? n(value, { ...decimalPrecision, style: 'unit', unit: 'kilometer', unitDisplay: 'short' })
      : n(value, decimalPrecision);
  }
  if (aggregation === 'active_days' && showUnit) {
    return n(value, { ...countPrecision, style: 'unit', unit: 'day', unitDisplay: 'long' });
  }
  return n(value, countPrecision);
}

const getProgressBarColor = (goal: Goal) => {
  if (goal.reached) return 'bg-verve-neon';
  if (goal.progress > 0) return 'bg-verve-orange';
  return 'bg-verve-medium';
};
</script>

<template>
  <div
    class="bg-white rounded-xl shadow-sm border border-verve-medium/30 p-6 relative flex flex-col min-h-[300px]">
    <!-- Header -->
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-xl font-bold text-verve-brown">{{ t('dashboard.goals.title') }}</h3>
      <button type="button" @click="showCreateModal = true"
        class="text-sm text-verve-orange hover:text-verve-brown font-bold transition-colors cursor-pointer">
        {{ t('dashboard.goals.add') }}
      </button>
    </div>

    <!-- Tabs -->
    <div class="flex border-b border-verve-medium/30 mb-4">
      <button v-for="tab in tabs" :key="tab" type="button" :aria-pressed="activeTab === tab" @click="activeTab = tab"
        class="pb-2 px-3 text-sm font-bold transition-colors relative cursor-pointer" :class="activeTab === tab
          ? 'text-verve-brown'
          : 'text-verve-brown/50 hover:text-verve-brown/80'
          ">
        {{ t(`dashboard.goals.tabs.${tab}`) }}
        <!-- Active Indicator -->
        <div v-if="activeTab === tab" class="absolute bottom-0 left-0 w-full h-0.5 bg-verve-orange"></div>
      </button>
    </div>

    <!-- Content -->
    <div v-if="goalStore.isLoadingPeriods" class="grow flex items-center justify-center text-verve-brown/60 text-sm">
      {{ t('dashboard.goals.loading') }}
    </div>

    <div v-else-if="goalStore.periodsError" role="alert" class="p-3 text-sm text-red-700">
      <p>{{ formatLoadError('goals', goalStore.periodsError) }}</p>
      <button type="button" @click="refreshGoals" class="mt-2 rounded px-2 py-1 font-bold underline focus-visible:outline-2 focus-visible:outline-offset-2">{{ t('dashboard.goals.retry') }}</button>
    </div>

    <div v-else-if="currentGoals.length === 0"
      class="grow flex flex-col items-center justify-center text-verve-brown/50 py-6">
      <p>{{ t(`dashboard.goals.empty.${activeTab}`) }}</p>
      <p class="text-xs mt-1">{{ t('dashboard.goals.challenge') }}</p>
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
            {{ formatValue(goal.target, goal.aggregation, true) }}
          </span>
        </div>

        <!-- Progress Bar -->
        <div class="progress-track mb-2">
          <div class="progress-fill" :class="getProgressBarColor(goal)"
            :style="{ width: `${Math.min(goal.progress * 100, 100)}%` }"></div>
        </div>

        <!-- Manual Controls -->
        <div v-if="goal.type === 'manual'" class="flex items-center justify-end gap-1">
          <button type="button" @click="handleManualUpdate(goal, false)"
            class="size-6 flex items-center justify-center rounded-lg bg-verve-light text-verve-brown hover:bg-red-100 hover:text-red-600 transition-colors"
            :title="t('dashboard.goals.decrease', { goal: goal.name })"
            :aria-label="t('dashboard.goals.decrease', { goal: goal.name })">
            -
          </button>

          <input type="number" min="1" :value="getStep(goal.id)" @input="updateStep(goal.id, $event)"
            :aria-label="t('dashboard.goals.amount', { goal: goal.name })"
            class="w-10 h-6 text-xs text-center border-verve-medium rounded-lg text-verve-brown bg-white focus:ring-verve-dark focus:border-verve-dark" />

          <button type="button" @click="handleManualUpdate(goal, true)"
            class="size-6 flex items-center justify-center rounded-lg bg-verve-light text-verve-brown hover:bg-green-100 hover:text-green-600 transition-colors"
            :title="t('dashboard.goals.increase', { goal: goal.name })"
            :aria-label="t('dashboard.goals.increase', { goal: goal.name })">
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
