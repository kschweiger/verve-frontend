<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useGoalStore, type Goal } from '@/stores/goals';
import { useTypeStore } from '@/stores/types';
import GoalCard from '@/components/GoalCard.vue';
import GoalCreateForm from '@/components/forms/GoalCreateForm.vue';
import GoalEditModal from '@/components/forms/GoalEditModal.vue';

const goalStore = useGoalStore();
const typeStore = useTypeStore();

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

// Navigation State
const now = new Date();
const currentYear = ref(now.getFullYear());
const currentMonth = ref(now.getMonth() + 1);
const currentWeek = ref(getISOWeek(now));

const monthName = computed(() =>
  new Date(currentYear.value, currentMonth.value - 1).toLocaleString('default', { month: 'long' })
);

// Modals
const showCreateModal = ref(false);
const editingGoal = ref<Goal | null>(null);

const refreshData = () =>
  goalStore.fetchAllGoalsForView(currentYear.value, currentMonth.value, currentWeek.value);

onMounted(() => {
  typeStore.fetchActivityTypes();
  refreshData();
});

watch([currentYear, currentMonth, currentWeek], refreshData);

const handleDelete = async (goal: Goal) => {
  if (!confirm(`Delete goal "${goal.name}"?`)) return;
  await goalStore.deleteGoal(goal.id);
  refreshData();
};

const handleManualUpdate = async (goal: Goal, increase: boolean) => {
  await goalStore.modifyManualGoal(goal.id, increase, 1);
  refreshData();
};

const successRate = computed(() => {
  const all = [
    ...goalStore.yearlyGoals,
    ...goalStore.monthlyGoals,
    ...goalStore.weeklyGoals,
  ];
  if (all.length === 0) return 0;
  const reached = all.filter((g) => g.reached).length;
  return Math.round((reached / all.length) * 100);
});
</script>

<template>
  <div class="p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-64px)] bg-verve-medium">
    <div class="max-w-7xl mx-auto space-y-8">
      <!-- Header & Navigation -->
      <div
        class="flex flex-col lg:flex-row justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-verve-medium/30 gap-6">
        <div class="flex flex-col sm:flex-row items-center gap-6">
          <h1 class="text-3xl font-bold text-verve-brown">Goals</h1>

          <div class="flex flex-wrap items-center justify-center gap-3">
            <!-- Year/Month Selector -->
            <div class="flex items-center gap-1 bg-verve-light rounded-xl p-1">
              <button @click="currentMonth > 1 ? currentMonth-- : (currentMonth = 12, currentYear--)"
                class="p-2 hover:bg-white rounded-lg text-verve-brown/60 hover:text-verve-brown transition-colors">
                &lt;
              </button>
              <span class="font-bold text-verve-brown w-32 text-center text-sm">
                {{ monthName }} <span class="font-normal text-verve-brown/60">{{ currentYear }}</span>
              </span>
              <button @click="currentMonth < 12 ? currentMonth++ : (currentMonth = 1, currentYear++)"
                class="p-2 hover:bg-white rounded-lg text-verve-brown/60 hover:text-verve-brown transition-colors">
                &gt;
              </button>
            </div>

            <!-- Week Selector -->
            <div class="flex items-center gap-1 bg-verve-light rounded-xl p-1">
              <button @click="currentWeek > 1 ? currentWeek-- : (currentWeek = 53, currentYear--)"
                class="p-2 hover:bg-white rounded-lg text-verve-brown/60 hover:text-verve-brown transition-colors">
                &lt;
              </button>
              <span class="font-bold text-verve-brown w-20 text-center text-sm">Week {{ currentWeek }}</span>
              <button @click="currentWeek < 53 ? currentWeek++ : (currentWeek = 1, currentYear++)"
                class="p-2 hover:bg-white rounded-lg text-verve-brown/60 hover:text-verve-brown transition-colors">
                &gt;
              </button>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-8">
          <div class="text-right">
            <div class="text-[10px] text-verve-brown/60 uppercase font-bold tracking-wider">
              Success Rate
            </div>
            <div class="text-2xl font-bold text-verve-orange">{{ successRate }}%</div>
          </div>
          <button @click="showCreateModal = true"
            class="px-5 py-2.5 bg-verve-neon text-verve-brown font-bold rounded-xl shadow-sm hover:brightness-105 border border-verve-dark/5 transition-all">
            + New Goal
          </button>
        </div>
      </div>

      <!-- Sections -->
      <div class="space-y-12">
        <!-- 1. Weekly Section -->
        <section>
          <div class="flex items-center mb-4">
            <h2 class="text-xl font-bold text-verve-brown">Weekly Targets</h2>
            <span class="ml-3 px-3 py-1 rounded-lg bg-verve-orange text-white text-xs font-bold shadow-sm">
              Week {{ currentWeek }}
            </span>
          </div>

          <div v-if="goalStore.weeklyGoals.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <GoalCard v-for="goal in goalStore.weeklyGoals" :key="goal.id" :goal="goal" @edit="editingGoal = $event"
              @delete="handleDelete" @manual-update="handleManualUpdate" />
          </div>
          <div v-else
            class="text-verve-brown/40 italic bg-white/50 border border-dashed border-verve-medium/30 p-8 rounded-xl text-center">
            No weekly goals set for Week {{ currentWeek }}.
          </div>
        </section>

        <!-- 2. Monthly Section -->
        <section>
          <div class="flex items-center mb-4">
            <h2 class="text-xl font-bold text-verve-brown">Monthly Targets</h2>
            <span
              class="ml-3 px-3 py-1 rounded-lg bg-verve-neon text-verve-brown text-xs font-bold shadow-sm border border-verve-dark/5">
              {{ monthName }}
            </span>
          </div>

          <div v-if="goalStore.monthlyGoals.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <GoalCard v-for="goal in goalStore.monthlyGoals" :key="goal.id" :goal="goal" @edit="editingGoal = $event"
              @delete="handleDelete" @manual-update="handleManualUpdate" />
          </div>
          <div v-else
            class="text-verve-brown/40 italic bg-white/50 border border-dashed border-verve-medium/30 p-8 rounded-xl text-center">
            No monthly goals set for {{ monthName }}.
          </div>
        </section>

        <!-- 3. Yearly Section -->
        <section>
          <div class="flex items-center mb-4">
            <h2 class="text-xl font-bold text-verve-brown">Yearly Targets</h2>
            <span
              class="ml-3 px-3 py-1 rounded-lg bg-verve-medium text-verve-brown text-xs font-bold shadow-sm border border-verve-dark/5">
              {{ currentYear }}
            </span>
          </div>

          <div v-if="goalStore.yearlyGoals.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <GoalCard v-for="goal in goalStore.yearlyGoals" :key="goal.id" :goal="goal" @edit="editingGoal = $event"
              @delete="handleDelete" @manual-update="handleManualUpdate" />
          </div>
          <div v-else
            class="text-verve-brown/40 italic bg-white/50 border border-dashed border-verve-medium/30 p-8 rounded-xl text-center">
            No yearly goals set for {{ currentYear }}.
          </div>
        </section>
      </div>
    </div>

    <!-- Modals -->
    <div v-if="showCreateModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-verve-brown/20 backdrop-blur-sm">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <GoalCreateForm @close="showCreateModal = false" @saved="refreshData" />
      </div>
    </div>

    <GoalEditModal v-if="editingGoal" :goal="editingGoal" @close="editingGoal = null" @saved="
      () => {
        editingGoal = null;
        refreshData();
      }
    " />
  </div>
</template>
