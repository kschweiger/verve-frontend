<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useUserStore } from '@/stores/auth';
import { ApiResponseError } from '@/services/authHeaders';
import { fetchWorkoutPlans, type WorkoutPlan } from '@/services/workoutPlans';

const { t, n } = useI18n();
const auth = useUserStore();
const plans = ref<WorkoutPlan[]>([]);
const loading = ref(false);
const error = ref<{ detail?: string } | null>(null);
const errorMessage = computed(() => {
  const message = t('workout.errors.loadPlans');
  return error.value?.detail
    ? t('workout.errors.withDetail', { message, detail: error.value.detail })
    : message;
});
let generation = 0;
async function load() {
  const current = ++generation;
  plans.value = [];
  error.value = null;
  loading.value = true;
  try {
    const result = await fetchWorkoutPlans();
    if (current === generation) plans.value = result;
  } catch (e) {
    if (current === generation)
      error.value = { detail: e instanceof ApiResponseError ? e.detail : undefined };
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
          <h1 class="text-3xl font-bold">{{ t('navigation.workoutPlans') }}</h1>
          <p class="mt-2 text-sm text-verve-brown/60">{{ t('training.list.description') }}</p>
        </div>
        <router-link
          :to="{ name: 'workout-plan-create' }"
          class="rounded-xl bg-verve-brown px-5 py-3 font-bold text-white focus-visible:outline-2 focus-visible:outline-verve-orange"
        >
          {{ t('training.list.newPlan') }}
        </router-link>
      </div>
      <p v-if="loading">{{ t('training.list.loading') }}</p>
      <div v-else-if="error" role="alert" class="text-red-700">
        {{ errorMessage }}
        <button type="button" class="underline" @click="load">{{ t('training.retry') }}</button>
      </div>
      <ul v-else-if="plans.length" class="space-y-1">
        <li v-for="plan in plans" :key="plan.id">
          <router-link
            :to="{ name: 'workout-plan-detail', params: { id: plan.id } }"
            class="flex justify-between gap-4 bg-white p-5 hover:bg-verve-light focus-visible:outline-2 focus-visible:outline-verve-orange"
          >
            <span class="min-w-0 wrap-anywhere font-bold">{{ plan.name }}</span>
            <span class="shrink-0">
              {{
                t(
                  'training.list.exerciseCount',
                  { count: n(plan.entries.length) },
                  plan.entries.length
                )
              }}
            </span>
          </router-link>
        </li>
      </ul>
      <p v-else class="bg-white p-12 text-center text-verve-brown/60">
        {{ t('training.list.empty') }}
      </p>
    </div>
  </div>
</template>
