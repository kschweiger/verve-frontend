<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue';
import { useUserStore } from '@/stores/auth';
import { fetchWorkoutPlans, type WorkoutPlan } from '@/services/workoutPlans';
const auth = useUserStore();
const plans = ref<WorkoutPlan[]>([]);
const loading = ref(false);
const error = ref('');
let generation = 0;
async function load() {
  const current = ++generation;
  plans.value = [];
  error.value = '';
  loading.value = true;
  try {
    const result = await fetchWorkoutPlans();
    if (current === generation) plans.value = result;
  } catch (e) {
    if (current === generation)
      error.value = e instanceof Error ? e.message : 'Failed to load workout plans.';
  } finally {
    if (current === generation) loading.value = false;
  }
}
watch(
  () => auth.token,
  (token) => {
    if (token) void load();
    else {
      generation++;
      plans.value = [];
    }
  },
  { immediate: true, flush: 'sync' }
);
onUnmounted(() => {
  generation++;
});
</script>
<template>
  <div class="min-h-[calc(100vh-64px)] bg-verve-medium p-4 sm:p-6 lg:p-8">
    <div class="mx-auto max-w-7xl">
      <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold">Workout Plans</h1>
          <p class="mt-2 text-sm text-verve-brown/60">Build reusable exercise plans.</p>
        </div>
        <router-link
          :to="{ name: 'workout-plan-create' }"
          class="rounded-xl bg-verve-brown px-5 py-3 font-bold text-white focus-visible:outline-2 focus-visible:outline-verve-orange"
          >New Plan</router-link
        >
      </div>
      <p v-if="loading">Loading workout plans...</p>
      <div v-else-if="error" role="alert" class="text-red-700">
        {{ error }} <button type="button" class="underline" @click="load">Retry</button>
      </div>
      <ul v-else-if="plans.length" class="space-y-1">
        <li v-for="plan in plans" :key="plan.id">
          <router-link
            :to="{ name: 'workout-plan-detail', params: { id: plan.id } }"
            class="flex justify-between gap-4 bg-white p-5 hover:bg-verve-light focus-visible:outline-2 focus-visible:outline-verve-orange"
          >
            <span class="min-w-0 wrap-anywhere font-bold">{{ plan.name }}</span>
            <span class="shrink-0">
              {{ plan.entries.length }} {{ plan.entries.length === 1 ? 'exercise' : 'exercises' }}
            </span>
          </router-link>
        </li>
      </ul>
      <p v-else class="bg-white p-12 text-center text-verve-brown/60">No workout plans yet.</p>
    </div>
  </div>
</template>
