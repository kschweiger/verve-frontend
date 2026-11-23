<script setup lang="ts">
import { computed, nextTick, ref, useId } from 'vue';
import { useI18n } from 'vue-i18n';
import type { Exercise } from '@/services/workoutPlans';
import { newDraftEntry, type DraftEntry } from '@/utils/workoutPlanDraft';
const props = defineProps<{
  exercises: Exercise[];
  labels: Record<string, Exercise>;
  catalogLoading: boolean;
  catalogError: boolean;
  maxEntries?: number;
}>();
const entries = defineModel<DraftEntry[]>({ required: true });
const { t, n, locale } = useI18n();
const fieldClass =
  'w-full rounded-lg border border-verve-brown/30 bg-white px-3 py-2 focus-visible:outline-2 focus-visible:outline-verve-orange';
const search = ref('');
const searchInput = ref<HTMLInputElement | null>(null);
const removeButtons = ref<HTMLButtonElement[]>([]);
const searchId = useId();
const collator = computed(() => new Intl.Collator(locale.value));
const filteredExercises = computed(() => {
  const query = search.value.toLocaleLowerCase(locale.value);
  return (props.catalogLoading || props.catalogError ? [] : props.exercises)
    .filter(
      (exercise) =>
        exercise.is_active && exercise.name.toLocaleLowerCase(locale.value).includes(query)
    )
    .sort((a, b) => collator.value.compare(a.name, b.name));
});
function addExercise(exercise: Exercise) {
  if (props.maxEntries && entries.value.length >= props.maxEntries) return;
  entries.value.push(newDraftEntry(exercise.id));
  search.value = '';
  void nextTick(() => {
    if (props.maxEntries && entries.value.length >= props.maxEntries)
      removeButtons.value[0]?.focus();
    else searchInput.value?.focus();
  });
}
function removeEntry(index: number) {
  entries.value.splice(index, 1);
  if (props.maxEntries) void nextTick(() => searchInput.value?.focus());
}
function focusSearch() {
  searchInput.value?.focus();
}
defineExpose({ focusSearch });
</script>
<template>
  <template v-if="!maxEntries || entries.length < maxEntries">
    <label :for="searchId" class="mt-3 block text-sm font-bold">{{
      t('workoutFields.search')
    }}</label
    ><input
      :id="searchId"
      ref="searchInput"
      v-model="search"
      type="search"
      class="mt-2"
      :class="fieldClass"
      :placeholder="t('workoutFields.searchPlaceholder')"
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
      <li v-if="catalogLoading" class="p-3">{{ t('workoutFields.loading') }}</li>
      <li v-else-if="!filteredExercises.length && !catalogError" class="p-3">
        {{ t('workoutFields.noMatching') }}
      </li>
    </ul>
  </template>
  <ul class="mt-4 space-y-2">
    <li v-for="(entry, index) in entries" :key="entry.key" class="bg-white p-4">
      <div class="flex justify-between gap-4">
        <strong class="min-w-0 wrap-anywhere"
          >{{
            labels[entry.exercise_id]?.name ??
            t('workoutFields.exercise', { id: entry.exercise_id })
          }}
          <span
            v-if="labels[entry.exercise_id] && !labels[entry.exercise_id]?.is_active"
            class="text-sm font-normal"
            >{{ t('workoutFields.inactive') }}</span
          ></strong
        ><button
          ref="removeButtons"
          type="button"
          class="underline focus-visible:outline-2 focus-visible:outline-verve-orange"
          :aria-label="
            t('workoutFields.removeRow', {
              exercise: labels[entry.exercise_id]?.name ?? entry.exercise_id,
              row: n(index + 1),
            })
          "
          @click="removeEntry(index)"
        >
          {{ t('workoutFields.remove') }}
        </button>
      </div>
      <div class="mt-3 grid grid-cols-3 gap-3">
        <label class="min-w-0 wrap-anywhere"
          >{{ t('workoutFields.sets')
          }}<input
            v-model.number="entry.sets"
            type="number"
            min="1"
            max="2147483647"
            step="1"
            :aria-label="t('workoutFields.setsRow', { row: n(index + 1) })"
            class="mt-1 min-w-0"
            :class="fieldClass" /></label
        ><label class="min-w-0 wrap-anywhere"
          >{{ t('workoutFields.reps')
          }}<input
            v-model.number="entry.repetitions"
            type="number"
            min="1"
            max="2147483647"
            step="1"
            :aria-label="t('workoutFields.repsRow', { row: n(index + 1) })"
            class="mt-1 min-w-0"
            :class="fieldClass" /></label
        ><label class="min-w-0 wrap-anywhere"
          >{{ t('workoutFields.weight')
          }}<input
            v-model.number="entry.weight"
            type="number"
            min="0"
            step="any"
            :aria-label="t('workoutFields.weightRow', { row: n(index + 1) })"
            class="mt-1 min-w-0"
            :class="fieldClass"
        /></label>
      </div>
    </li>
  </ul>
</template>
