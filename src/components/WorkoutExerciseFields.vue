<script setup lang="ts">
import { computed, nextTick, ref, useId } from 'vue';
import type { Exercise } from '@/services/workoutPlans';
import { newDraftEntry, type DraftEntry } from '@/utils/workoutPlanDraft';
const props = defineProps<{
  exercises: Exercise[];
  labels: Record<string, Exercise>;
  catalogLoading: boolean;
  catalogError: boolean;
}>();
const entries = defineModel<DraftEntry[]>({ required: true });
const fieldClass =
  'w-full rounded-lg border border-verve-brown/30 bg-white px-3 py-2 focus-visible:outline-2 focus-visible:outline-verve-orange';
const search = ref('');
const searchInput = ref<HTMLInputElement | null>(null);
const searchId = useId();
const filteredExercises = computed(() =>
  (props.catalogLoading || props.catalogError ? [] : props.exercises)
    .filter(
      (e) => e.is_active && e.name.toLocaleLowerCase().includes(search.value.toLocaleLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name))
);
function addExercise(exercise: Exercise) {
  entries.value.push(newDraftEntry(exercise.id));
  search.value = '';
  void nextTick(() => searchInput.value?.focus());
}
function focusSearch() {
  searchInput.value?.focus();
}
defineExpose({ focusSearch });
</script>
<template>
  <label :for="searchId" class="mt-3 block text-sm font-bold">Search exercises</label
  ><input
    :id="searchId"
    ref="searchInput"
    v-model="search"
    type="search"
    class="mt-2"
    :class="fieldClass"
    placeholder="Search active exercises"
    @keydown.enter.prevent
  />
  <ul v-if="search" class="max-h-48 overflow-auto bg-white">
    <li v-for="exercise in filteredExercises" :key="exercise.id">
      <button
        type="button"
        class="w-full px-4 py-2 text-left hover:bg-verve-light focus-visible:outline-2 focus-visible:outline-verve-orange"
        @click="addExercise(exercise)"
      >
        {{ exercise.name }}
      </button>
    </li>
    <li v-if="catalogLoading" class="p-3">Loading exercises...</li>
    <li v-else-if="!filteredExercises.length && !catalogError" class="p-3">
      No matching exercises.
    </li>
  </ul>
  <ul class="mt-4 space-y-2">
    <li v-for="(entry, index) in entries" :key="entry.key" class="bg-white p-4">
      <div class="flex justify-between gap-4">
        <strong class="min-w-0 wrap-anywhere"
          >{{ labels[entry.exercise_id]?.name ?? `Exercise ${entry.exercise_id}` }}
          <span
            v-if="labels[entry.exercise_id] && !labels[entry.exercise_id]?.is_active"
            class="text-sm font-normal"
            >(inactive)</span
          ></strong
        ><button
          type="button"
          class="underline focus-visible:outline-2 focus-visible:outline-verve-orange"
          :aria-label="`Remove ${labels[entry.exercise_id]?.name ?? entry.exercise_id}, row ${index + 1}`"
          @click="entries.splice(index, 1)"
        >
          Remove
        </button>
      </div>
      <div class="mt-3 grid grid-cols-3 gap-3">
        <label
          >Sets<input
            v-model.number="entry.sets"
            type="number"
            min="1"
            max="2147483647"
            step="1"
            :aria-label="`Sets for row ${index + 1}`"
            class="mt-1 min-w-0"
            :class="fieldClass" /></label
        ><label
          >Reps<input
            v-model.number="entry.repetitions"
            type="number"
            min="1"
            max="2147483647"
            step="1"
            :aria-label="`Reps for row ${index + 1}`"
            class="mt-1 min-w-0"
            :class="fieldClass" /></label
        ><label
          >Weight (kg)<input
            v-model.number="entry.weight"
            type="number"
            min="0"
            step="any"
            :aria-label="`Weight in kg for row ${index + 1}`"
            class="mt-1 min-w-0"
            :class="fieldClass"
        /></label>
      </div>
    </li>
  </ul>
</template>
