<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import WorkoutExerciseFields from '@/components/WorkoutExerciseFields.vue';
import WorkoutPlanActivities from '@/components/WorkoutPlanActivities.vue';
import { useUserStore } from '@/stores/auth';
import { ApiResponseError } from '@/services/authHeaders';
import {
  createWorkoutPlan,
  deleteWorkoutPlan,
  duplicateWorkoutPlan,
  fetchExercise,
  fetchExercises,
  fetchWorkoutPlan,
  updateWorkoutPlan,
  type Exercise,
  type WorkoutPlan,
} from '@/services/workoutPlans';
import {
  draftEntries,
  planChanges,
  serializeEntries,
  type DraftEntry,
} from '@/utils/workoutPlanDraft';

const fieldClass =
  'w-full rounded-lg border border-verve-brown/30 bg-white px-3 py-2 focus-visible:outline-2 focus-visible:outline-verve-orange';
const actionClass =
  'rounded-lg border border-verve-brown/30 px-4 py-2 font-bold focus-visible:outline-2 focus-visible:outline-verve-orange disabled:opacity-50';

const route = useRoute();
const router = useRouter();
const auth = useUserStore();
const isNew = computed(() => route.name === 'workout-plan-create');
const plan = ref<WorkoutPlan | null>(null);
const name = ref('');
const entries = ref<DraftEntry[]>([]);
const exercises = ref<Exercise[]>([]);
const labels = ref<Record<string, Exercise>>({});
const editing = ref(false);
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const nameError = ref('');
const labelError = ref(false);
const catalogError = ref(false);
const catalogLoading = ref(false);
const dialog = ref<'duplicate' | 'delete' | null>(null);
const duplicateName = ref('');
const dialogInput = ref<HTMLInputElement | null>(null);
const dialogBox = ref<HTMLDialogElement | null>(null);
const dialogCancel = ref<HTMLButtonElement | null>(null);
let dialogTrigger: HTMLElement | null = null;
let generation = 0;
let labelGeneration = 0;
const pendingLabels = new Map<string, Promise<Exercise>>();
function lookupLabel(id: string): Promise<Exercise> {
  const existing = pendingLabels.get(id);
  if (existing) return existing;
  const request = fetchExercise(id).finally(() => {
    if (pendingLabels.get(id) === request) pendingLabels.delete(id);
  });
  pendingLabels.set(id, request);
  return request;
}
function draftFrom(value: WorkoutPlan) {
  name.value = value.name;
  entries.value = draftEntries(value.entries);
}
async function resolveLabels(current: number) {
  const request = ++labelGeneration;
  labelError.value = false;
  const missing = [
    ...new Set(entries.value.map((e) => e.exercise_id).filter((id) => !labels.value[id])),
  ];
  const results = await Promise.allSettled(missing.map((id) => lookupLabel(id)));
  if (current !== generation || request !== labelGeneration) return;
  results.forEach((result) => {
    if (result.status === 'fulfilled') labels.value[result.value.id] = result.value;
  });
  labelError.value = missing.some((id) => !labels.value[id]);
}
async function loadCatalog(current: number) {
  catalogError.value = false;
  catalogLoading.value = true;
  try {
    const result = await fetchExercises();
    if (current !== generation) return;
    exercises.value = result;
    for (const item of result) labels.value[item.id] = item;
  } catch {
    if (current === generation) catalogError.value = true;
  } finally {
    if (current === generation) catalogLoading.value = false;
  }
}
async function retryCatalog() {
  const current = generation;
  await loadCatalog(current);
  if (current === generation) void resolveLabels(current);
}
async function load() {
  const current = ++generation;
  labelGeneration++;
  pendingLabels.clear();
  plan.value = null;
  entries.value = [];
  name.value = '';
  exercises.value = [];
  labels.value = {};
  error.value = '';
  nameError.value = '';
  labelError.value = false;
  dialog.value = null;
  saving.value = false;
  loading.value = true;
  editing.value = isNew.value;
  const catalog = loadCatalog(current);
  try {
    if (!isNew.value) {
      const value = await fetchWorkoutPlan(String(route.params.id));
      if (current !== generation) return;
      plan.value = value;
      draftFrom(value);
      void catalog.then(() => {
        if (current === generation) void resolveLabels(current);
      });
    }
  } catch (e) {
    if (current === generation)
      error.value = e instanceof Error ? e.message : 'Failed to load workout plan.';
  } finally {
    if (current === generation) loading.value = false;
  }
}
watch(
  [() => route.name, () => route.params.id, () => auth.token],
  ([routeName, id, token]) => {
    if (
      token &&
      (routeName === 'workout-plan-create' ||
        (routeName === 'workout-plan-detail' && typeof id === 'string'))
    )
      void load();
    else {
      generation++;
      plan.value = null;
      entries.value = [];
    }
  },
  { immediate: true, flush: 'sync' }
);
onUnmounted(() => {
  generation++;
});
function cancel() {
  nameError.value = '';
  error.value = '';
  if (isNew.value) void router.push({ name: 'workout-plans' });
  else if (plan.value) {
    draftFrom(plan.value);
    editing.value = false;
  }
}
async function save() {
  if (saving.value) return;
  if (!name.value.trim()) {
    nameError.value = 'Enter a plan name.';
    return;
  }
  const current = generation;
  saving.value = true;
  error.value = '';
  nameError.value = '';
  const normalized = serializeEntries(entries.value);
  try {
    let result: WorkoutPlan;
    if (isNew.value) result = await createWorkoutPlan({ name: name.value, entries: normalized });
    else {
      if (!plan.value) return;
      const payload = planChanges(plan.value, name.value, entries.value);
      if (!Object.keys(payload).length) {
        editing.value = false;
        return;
      }
      result = await updateWorkoutPlan(plan.value.id, payload);
    }
    if (current !== generation) return;
    if (isNew.value) await router.push({ name: 'workout-plan-detail', params: { id: result.id } });
    else {
      plan.value = result;
      draftFrom(result);
      editing.value = false;
      void resolveLabels(current);
    }
  } catch (e) {
    if (current === generation) {
      if (e instanceof ApiResponseError && e.status === 409)
        nameError.value = 'A plan with this name already exists.';
      else error.value = e instanceof Error ? e.message : 'Failed to save workout plan.';
    }
  } finally {
    if (current === generation) saving.value = false;
  }
}
async function openDialog(kind: 'duplicate' | 'delete') {
  dialogTrigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  dialog.value = kind;
  error.value = '';
  nameError.value = '';
  duplicateName.value = `${plan.value?.name ?? ''} copy`;
  await nextTick();
  dialogBox.value?.showModal();
  (kind === 'delete' ? dialogCancel.value : dialogInput.value)?.focus();
}
function closeDialog() {
  if (saving.value) return;
  dialogBox.value?.close();
  dialog.value = null;
  void nextTick(() => dialogTrigger?.focus());
}
async function confirmDialog() {
  if (!plan.value || saving.value) return;
  if (dialog.value === 'duplicate' && !duplicateName.value.trim()) {
    nameError.value = 'Enter a plan name.';
    return;
  }
  const current = generation;
  const id = plan.value.id;
  saving.value = true;
  error.value = '';
  nameError.value = '';
  try {
    if (dialog.value === 'duplicate') {
      const result = await duplicateWorkoutPlan(id, duplicateName.value);
      if (current === generation)
        await router.push({ name: 'workout-plan-detail', params: { id: result.id } });
    } else {
      await deleteWorkoutPlan(id);
      if (current === generation) await router.push({ name: 'workout-plans' });
    }
  } catch (e) {
    if (current === generation) {
      if (e instanceof ApiResponseError && e.status === 409)
        nameError.value = 'A plan with this name already exists.';
      else error.value = e instanceof Error ? e.message : 'Action failed.';
    }
  } finally {
    if (current === generation) saving.value = false;
  }
}
</script>
<template>
  <div class="min-h-[calc(100vh-64px)] bg-verve-medium p-4 sm:p-6 lg:p-8">
    <div class="mx-auto max-w-5xl">
      <router-link
        :to="{ name: 'workout-plans' }"
        class="text-sm underline focus-visible:outline-2 focus-visible:outline-verve-orange"
        >← Workout Plans</router-link
      >
      <p v-if="loading" class="mt-6">Loading workout plan...</p>
      <template v-else-if="isNew || plan">
        <div class="my-6 flex flex-wrap items-center justify-between gap-4">
          <h1 class="min-w-0 wrap-anywhere text-3xl font-bold">
            {{ isNew ? 'New Workout Plan' : plan?.name }}
          </h1>
          <div v-if="!editing" class="flex flex-wrap gap-2">
            <button :class="actionClass" type="button" @click="editing = true">Edit</button>
            <button :class="actionClass" type="button" @click="openDialog('duplicate')">
              Duplicate
            </button>
            <button :class="actionClass" type="button" @click="openDialog('delete')">Delete</button>
          </div>
        </div>
        <div v-if="error && !dialog" role="alert" class="my-4 text-red-700">{{ error }}</div>
        <form v-if="editing" @submit.prevent="save">
          <fieldset :disabled="saving">
            <label class="block font-bold" for="plan-name">Plan name</label
            ><input
              id="plan-name"
              v-model="name"
              required
              class="mt-2"
              :class="fieldClass"
              :aria-invalid="!!nameError"
              :aria-describedby="nameError ? 'name-error' : undefined"
            />
            <p v-if="nameError" id="name-error" role="alert" class="text-red-700">
              {{ nameError }}
            </p>
            <h2 class="mt-8 text-xl font-bold">Exercises</h2>
            <div v-if="catalogError" role="alert" class="my-2 text-red-700">
              Could not load the exercise catalog.
              <button type="button" class="underline" @click="retryCatalog">Retry</button>
            </div>
            <WorkoutExerciseFields
              v-model="entries"
              :exercises="exercises"
              :labels="labels"
              :catalog-loading="catalogLoading"
              :catalog-error="catalogError"
            />
            <div class="mt-6 flex gap-3">
              <button
                class="bg-verve-brown text-white"
                :class="actionClass"
                :disabled="saving"
                type="submit"
              >
                {{ saving ? 'Saving...' : 'Save' }}
              </button>
              <button :class="actionClass" :disabled="saving" type="button" @click="cancel">
                Cancel
              </button>
            </div>
          </fieldset>
        </form>
        <div v-else>
          <h2 class="mb-4 text-xl font-bold">Exercises</h2>
          <p v-if="!entries.length">No exercises in this plan.</p>
          <ul v-else class="space-y-2">
            <li
              v-for="entry in entries"
              :key="entry.key"
              class="flex flex-wrap justify-between gap-2 bg-white p-4"
            >
              <strong class="min-w-0 wrap-anywhere"
                >{{ labels[entry.exercise_id]?.name ?? `Exercise ${entry.exercise_id}` }}
                <span
                  v-if="labels[entry.exercise_id] && !labels[entry.exercise_id]?.is_active"
                  class="text-sm font-normal"
                  >(inactive)</span
                ></strong
              ><span
                >Sets: {{ entry.sets === '' ? '—' : entry.sets }} · Reps:
                {{ entry.repetitions === '' ? '—' : entry.repetitions }} · Weight:
                {{ entry.weight === '' ? '—' : `${entry.weight} kg` }}</span
              >
            </li>
          </ul>
        </div>
        <p v-if="labelError" role="alert" class="mt-4 text-red-700">
          Some exercise names could not be loaded.
          <button type="button" class="underline" @click="resolveLabels(generation)">Retry</button>
        </p>
        <WorkoutPlanActivities v-if="plan && !editing" :plan-id="plan.id" />
      </template>
      <div v-else-if="error" role="alert" class="mt-6 text-red-700">
        {{ error }} <button type="button" class="underline" @click="load">Retry</button>
      </div>
      <dialog
        v-if="dialog"
        ref="dialogBox"
        aria-labelledby="dialog-title"
        class="m-auto w-full max-w-md rounded-xl bg-white p-6 shadow-xl backdrop:bg-black/40"
        @cancel.prevent="closeDialog"
      >
        <h2 id="dialog-title" class="text-xl font-bold">
          {{ dialog === 'duplicate' ? 'Duplicate plan' : 'Delete plan?' }}
        </h2>
        <form @submit.prevent="confirmDialog">
          <fieldset :disabled="saving">
            <template v-if="dialog === 'duplicate'">
              <label for="duplicate-name" class="mt-4 block">Name for the copy</label>
              <input
                id="duplicate-name"
                ref="dialogInput"
                v-model="duplicateName"
                required
                class="mt-2"
                :class="fieldClass"
                :aria-invalid="!!nameError"
                :aria-describedby="nameError ? 'duplicate-name-error' : undefined"
              />
              <p v-if="nameError" id="duplicate-name-error" role="alert" class="text-red-700">
                {{ nameError }}
              </p>
            </template>
            <p v-else class="mt-4 wrap-anywhere">Delete “{{ plan?.name }}”?</p>
            <p v-if="error" role="alert" class="mt-3 text-red-700">{{ error }}</p>
            <div class="mt-6 flex gap-3">
              <button class="bg-verve-brown text-white" :class="actionClass" type="submit">
                {{ dialog === 'duplicate' ? 'Duplicate' : 'Delete' }}
              </button>
              <button ref="dialogCancel" :class="actionClass" type="button" @click="closeDialog">
                Cancel
              </button>
            </div>
          </fieldset>
        </form>
      </dialog>
    </div>
  </div>
</template>
