<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useGoalStore, type Goal } from '@/stores/goals';
import { useTypeStore } from '@/stores/types';
import GoalCard from '@/components/GoalCard.vue';
import GoalCreateForm from '@/components/forms/GoalCreateForm.vue';
import GoalEditModal from '@/components/forms/GoalEditModal.vue';

const goalStore = useGoalStore();
const typeStore = useTypeStore();

// --- Helper for current week ---
function getISOWeek(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// Navigation State
const now = new Date();
const currentYear = ref(now.getFullYear());
const currentMonth = ref(now.getMonth() + 1);
const currentWeek = ref(getISOWeek(now)); // <--- New

const monthName = computed(() => new Date(currentYear.value, currentMonth.value - 1).toLocaleString('default', { month: 'long' }));

// Modals
const showCreateModal = ref(false);
const editingGoal = ref<Goal | null>(null);

// --- Data Loading ---
const refreshData = () => goalStore.fetchAllGoalsForView(currentYear.value, currentMonth.value, currentWeek.value);

onMounted(() => {
  typeStore.fetchActivityTypes();
  refreshData();
});

// Watch for any time change
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
  const all = [...goalStore.yearlyGoals, ...goalStore.monthlyGoals, ...goalStore.weeklyGoals];
  if (all.length === 0) return 0;
  const reached = all.filter(g => g.reached).length;
  return Math.round((reached / all.length) * 100);
});
</script>

<template>
  <div class="p-4 sm:p-6 lg:p-8">
    <div class="max-w-7xl mx-auto space-y-8">

      <!-- Header & Navigation -->
      <div class="flex flex-col lg:flex-row justify-between items-center bg-white p-6 rounded-lg shadow-sm gap-6">
        <div class="flex flex-col sm:flex-row items-center gap-4">
          <h1 class="text-3xl font-bold text-gray-900">Goals</h1>

          <div class="flex flex-wrap items-center justify-center gap-2 bg-gray-100 rounded-lg p-1">
            <!-- Year/Month Selector -->
            <div class="flex items-center space-x-1 border-r border-gray-300 pr-2 mr-1">
              <button @click="currentMonth > 1 ? currentMonth-- : (currentMonth = 12, currentYear--)"
                class="px-2 py-1 hover:bg-white rounded text-gray-600">&lt;</button>
              <span class="font-semibold text-gray-800 w-28 text-center text-sm">{{ monthName }} {{ currentYear
              }}</span>
              <button @click="currentMonth < 12 ? currentMonth++ : (currentMonth = 1, currentYear++)"
                class="px-2 py-1 hover:bg-white rounded text-gray-600">&gt;</button>
            </div>

            <!-- Week Selector -->
            <div class="flex items-center space-x-1">
              <button @click="currentWeek > 1 ? currentWeek-- : (currentWeek = 53, currentYear--)"
                class="px-2 py-1 hover:bg-white rounded text-gray-600">&lt;</button>
              <span class="font-semibold text-gray-800 w-20 text-center text-sm">Week {{ currentWeek }}</span>
              <button @click="currentWeek < 53 ? currentWeek++ : (currentWeek = 1, currentYear++)"
                class="px-2 py-1 hover:bg-white rounded text-gray-600">&gt;</button>
            </div>
          </div>
        </div>

        <div class="flex items-center space-x-6">
          <div class="text-right">
            <div class="text-xs text-gray-500 uppercase font-bold">Success Rate</div>
            <div class="text-xl font-bold text-indigo-600">{{ successRate }}%</div>
          </div>
          <button @click="showCreateModal = true"
            class="px-4 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 shadow-sm transition">
            + New Goal
          </button>
        </div>
      </div>

      <!-- Sections -->
      <div class="space-y-12">

        <!-- 1. Weekly Section -->
        <section>
          <div class="flex items-center mb-4">
            <h2 class="text-xl font-bold text-gray-800">Weekly Targets</h2>
            <span class="ml-3 px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 text-xs font-bold">Week {{
              currentWeek }}</span>
          </div>
          <div v-if="goalStore.weeklyGoals.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <GoalCard v-for="goal in goalStore.weeklyGoals" :key="goal.id" :goal="goal" @edit="editingGoal = $event"
              @delete="handleDelete" @manual-update="handleManualUpdate" />
          </div>
          <div v-else class="text-gray-400 italic bg-gray-50 p-6 rounded-lg text-center">No weekly goals set for Week {{
            currentWeek }}.</div>
        </section>

        <!-- 2. Monthly Section -->
        <section>
          <div class="flex items-center mb-4">
            <h2 class="text-xl font-bold text-gray-800">Monthly Targets</h2>
            <span class="ml-3 px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs font-bold">{{ monthName
            }}</span>
          </div>
          <div v-if="goalStore.monthlyGoals.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <GoalCard v-for="goal in goalStore.monthlyGoals" :key="goal.id" :goal="goal" @edit="editingGoal = $event"
              @delete="handleDelete" @manual-update="handleManualUpdate" />
          </div>
          <div v-else class="text-gray-400 italic bg-gray-50 p-6 rounded-lg text-center">No monthly goals set for {{
            monthName }}.</div>
        </section>

        <!-- 3. Yearly Section -->
        <section>
          <div class="flex items-center mb-4">
            <h2 class="text-xl font-bold text-gray-800">Yearly Targets</h2>
            <span class="ml-3 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">{{ currentYear
            }}</span>
          </div>
          <div v-if="goalStore.yearlyGoals.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <GoalCard v-for="goal in goalStore.yearlyGoals" :key="goal.id" :goal="goal" @edit="editingGoal = $event"
              @delete="handleDelete" @manual-update="handleManualUpdate" />
          </div>
          <div v-else class="text-gray-400 italic bg-gray-50 p-6 rounded-lg text-center">No yearly goals set for {{
            currentYear }}.</div>
        </section>

      </div>
    </div>

    <!-- Modals -->
    <div v-if="showCreateModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <GoalCreateForm @close="showCreateModal = false" @saved="refreshData" />
      </div>
    </div>

    <GoalEditModal v-if="editingGoal" :goal="editingGoal" @close="editingGoal = null"
      @saved="() => { editingGoal = null; refreshData(); }" />
  </div>
</template>
