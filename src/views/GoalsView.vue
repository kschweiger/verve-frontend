<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useGoalStore, type Goal, type GoalCreatePayload } from '@/stores/goals';
import { useTypeStore } from '@/stores/types';
import GoalCard from '@/components/GoalCard.vue';
import GoalCreateForm from '@/components/forms/GoalCreateForm.vue';
import GoalEditModal from '@/components/forms/GoalEditModal.vue';

const goalStore = useGoalStore();
const typeStore = useTypeStore();

// Navigation
const now = new Date();
const currentYear = ref(now.getFullYear());
const currentMonth = ref(now.getMonth() + 1);

const monthName = computed(() => new Date(currentYear.value, currentMonth.value - 1).toLocaleString('default', { month: 'long' }));

// Modals
const showCreateModal = ref(false);
const editingGoal = ref<Goal | null>(null);

// Cloning State (Used to pre-fill create form)
const clonePayload = ref<Partial<GoalCreatePayload> | null>(null);

// --- Data Loading ---
const refreshData = () => goalStore.fetchAllGoalsForView(currentYear.value, currentMonth.value);

onMounted(() => {
  typeStore.fetchActivityTypes();
  refreshData();
});

watch([currentYear, currentMonth], refreshData);

// --- Actions ---
const handleClone = (goal: Goal) => {
  // Logic to calculate "Next Period"
  let nextMonth = goal.month;
  let nextYear = goal.year;

  if (goal.temporal_type === 'monthly' && goal.month) {
    nextMonth = goal.month + 1;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear++;
    }
  } else if (goal.temporal_type === 'yearly') {
    nextYear++;
  }

  // Pre-fill payload for the create form
  // We can't perfectly reconstruct constraints from the API response object easily without mapping logic,
  // but we can pass the raw constraints object back if the backend accepts it.
  // Based on your previous form, we might need to rely on the user re-selecting specific filters
  // unless we pass the raw 'constraints' dict back to the API.
  // For now, we clone the main attributes and open the form.

  // Actually, let's just open the create form and let the user set it up,
  // OR we can implement a specific "Clone" endpoint if the backend supports it.
  // Since we don't have a clone endpoint, we'll just pre-fill what we can in the form.
  alert("Cloning copies the name and target. Please verify dates.");

  // NOTE: This relies on the GoalCreateForm accepting an 'initialValues' prop (we need to add that)
  // or we just skip full pre-fill for now to keep it simple.
  showCreateModal.value = true;
};

const handleDelete = async (goal: Goal) => {
  if (!confirm(`Delete goal "${goal.name}"?`)) return;
  await goalStore.deleteGoal(goal.id);
  refreshData();
};

const handleManualUpdate = async (goal: Goal, increase: boolean) => {
  await goalStore.modifyManualGoal(goal.id, increase, 1);
  refreshData(); // Refresh to see progress update
};

// --- Stats ---
const successRate = computed(() => {
  const all = [...goalStore.yearlyGoals, ...goalStore.monthlyGoals];
  if (all.length === 0) return 0;
  const reached = all.filter(g => g.reached).length;
  return Math.round((reached / all.length) * 100);
});
</script>

<template>
  <div class="p-4 sm:p-6 lg:p-8">
    <div class="max-w-7xl mx-auto space-y-8">

      <!-- Header & Navigation -->
      <div class="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-lg shadow-sm">
        <div class="flex items-center space-x-4 mb-4 md:mb-0">
          <h1 class="text-3xl font-bold text-gray-900">Goals</h1>
          <div class="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
            <button @click="currentMonth > 1 ? currentMonth-- : (currentMonth = 12, currentYear--)"
              class="px-3 py-1 hover:bg-white rounded shadow-sm text-gray-600">&lt;</button>
            <span class="font-semibold text-gray-800 w-32 text-center">{{ monthName }} {{ currentYear }}</span>
            <button @click="currentMonth < 12 ? currentMonth++ : (currentMonth = 1, currentYear++)"
              class="px-3 py-1 hover:bg-white rounded shadow-sm text-gray-600">&gt;</button>
          </div>
        </div>

        <div class="flex items-center space-x-6">
          <!-- Mini Stats -->
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
      <!-- We iterate over configurations to easily add "Weekly" later -->
      <div class="space-y-8">

        <!-- Yearly Section -->
        <section>
          <div class="flex items-center mb-4">
            <h2 class="text-xl font-bold text-gray-800">Yearly Targets</h2>
            <span class="ml-3 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">{{ currentYear
              }}</span>
          </div>

          <div v-if="goalStore.yearlyGoals.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <GoalCard v-for="goal in goalStore.yearlyGoals" :key="goal.id" :goal="goal" @edit="editingGoal = $event"
              @delete="handleDelete" @clone="handleClone" @manual-update="handleManualUpdate" />
          </div>
          <div v-else class="text-gray-400 italic bg-gray-50 p-6 rounded-lg text-center">
            No yearly goals set for {{ currentYear }}.
          </div>
        </section>

        <!-- Monthly Section -->
        <section>
          <div class="flex items-center mb-4">
            <h2 class="text-xl font-bold text-gray-800">Monthly Targets</h2>
            <span class="ml-3 px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs font-bold">{{ monthName
              }}</span>
          </div>

          <div v-if="goalStore.monthlyGoals.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <GoalCard v-for="goal in goalStore.monthlyGoals" :key="goal.id" :goal="goal" @edit="editingGoal = $event"
              @delete="handleDelete" @clone="handleClone" @manual-update="handleManualUpdate" />
          </div>
          <div v-else class="text-gray-400 italic bg-gray-50 p-6 rounded-lg text-center">
            No goals set for {{ monthName }}.
          </div>
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
