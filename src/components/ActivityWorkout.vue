<script setup lang="ts">
import { nextTick, onScopeDispose, ref, watch } from 'vue';
import { Trash2 } from '@lucide/vue';
import WorkoutExerciseFields from '@/components/WorkoutExerciseFields.vue';
import { useUserStore } from '@/stores/auth';
import { ApiResponseError } from '@/services/authHeaders';
import {
  addActivityExercise,
  applyWorkoutPlan,
  deleteActivityExerciseEntry,
  fetchActivityExercisePlan,
  fetchExercise,
  fetchExercises,
  fetchWorkoutPlans,
  saveActivityAsWorkoutPlan,
  updateActivityExercisePlan,
  updateLinkedWorkoutPlan,
  type ActivityExercisePlan,
  type Exercise,
  type WorkoutPlan,
} from '@/services/workoutPlans';
import { draftEntries, serializeEntries, type DraftEntry } from '@/utils/workoutPlanDraft';

const props = defineProps<{ activityId: string }>();
const auth = useUserStore();
const snapshot = ref<ActivityExercisePlan | null>(null);
const state = ref<'loading' | 'absent' | 'saved' | 'error' | 'sign-in-required'>('loading');
const error = ref('');
const notice = ref('');
const plans = ref<WorkoutPlan[]>([]);
const selected = ref('');
const applying = ref(false);
const manual = ref(false);
const unconfirmed = ref(false);
const verifying = ref(false);
const addButton = ref<HTMLButtonElement | null>(null);
const plansError = ref('');
const plansLoading = ref(false);
const labels = ref<Record<string, Exercise>>({});
const labelsFailed = ref(false);
const editing = ref(false);
const saving = ref(false);
const deletingEntryId = ref<number | null>(null);
const saveRequiresSignIn = ref(false);
const entries = ref<DraftEntry[]>([]);
const exercises = ref<Exercise[]>([]);
const catalogError = ref(false);
const catalogLoading = ref(false);
const planDialogOpen = ref(false);
const planMode = ref<'new' | 'update'>('new');
const planCancel = ref<HTMLButtonElement | null>(null);
const updateButton = ref<HTMLButtonElement | null>(null);
const planSaving = ref(false);
const planName = ref('');
const planNameError = ref('');
const planError = ref('');
const planDialog = ref<HTMLDialogElement | null>(null);
const planInput = ref<HTMLInputElement | null>(null);
const planButton = ref<HTMLButtonElement | null>(null);
const fields = ref<InstanceType<typeof WorkoutExerciseFields> | null>(null);
const workoutHeading = ref<HTMLHeadingElement | null>(null);
const editButton = ref<HTMLButtonElement | null>(null);
const recoveryButton = ref<HTMLButtonElement | null>(null);
let catalogPromise: Promise<Exercise[]> | null = null;
let catalogLoaded = false;
let generation = 0;
let active = true;
let labelGeneration = 0;
let conflict = false;

function owner() {
  const current = generation;
  const id = props.activityId;
  const token = auth.token;
  return () => active && generation === current && props.activityId === id && auth.token === token;
}

function isSessionRejected(cause: unknown): boolean {
  return (
    cause instanceof ApiResponseError &&
    (cause.status === 401 ||
      (cause.status === 403 && cause.message === 'Could not validate credentials'))
  );
}

async function loadLabels(plan: ActivityExercisePlan) {
  const ownsActivity = owner();
  const request = ++labelGeneration;
  const current = () => ownsActivity() && request === labelGeneration;
  labelsFailed.value = false;
  if (plan.entries.length === 0) {
    return;
  }
  let catalog: Exercise[] = [];
  try {
    catalog = await getCatalog();
  } catch {
    /* Resolve each label individually below. */
  }
  if (!current()) return;
  const found: Record<string, Exercise> = {
    ...Object.fromEntries(catalog.map((exercise) => [exercise.id, exercise])),
  };
  const missing = [...new Set(plan.entries.map((entry) => entry.exercise_id))].filter(
    (id) => !found[id] && !labels.value[id]
  );
  const resolved = await Promise.all(
    missing.map(async (id) => {
      try {
        return await fetchExercise(id);
      } catch {
        return null;
      }
    })
  );
  if (!current()) return;
  for (const exercise of resolved) if (exercise) found[exercise.id] = exercise;
  labels.value = { ...labels.value, ...found };
  labelsFailed.value = resolved.some((exercise) => exercise === null);
}
async function loadPlans(current: () => boolean) {
  plansLoading.value = true;
  plansError.value = '';
  try {
    const result = await fetchWorkoutPlans();
    if (current()) {
      plans.value = result;
    }
  } catch (cause: unknown) {
    if (!current()) return;
    if (isSessionRejected(cause)) {
      if (manual.value) saveRequiresSignIn.value = true;
      else state.value = 'sign-in-required';
      return;
    }
    plansError.value = cause instanceof Error ? cause.message : 'Failed to load workout plans.';
  } finally {
    if (current()) plansLoading.value = false;
  }
}
function retryPlans() {
  const current = owner();
  void loadPlans(() => current() && state.value === 'absent');
}
async function load() {
  const current = owner();
  state.value = 'loading';
  error.value = '';
  try {
    const result = await fetchActivityExercisePlan(props.activityId);
    if (!current()) return;
    snapshot.value = result;
    state.value = 'saved';
    if (conflict) notice.value = 'The existing workout has been loaded.';
    void loadLabels(result);
  } catch (cause: unknown) {
    if (!current()) return;
    if (conflict) notice.value = '';
    if (isSessionRejected(cause)) {
      state.value = 'sign-in-required';
    } else if (cause instanceof ApiResponseError && cause.status === 404) {
      snapshot.value = null;
      if (conflict) {
        state.value = 'error';
        error.value = 'A workout already exists, but could not be loaded. Retry to check again.';
      } else {
        state.value = 'absent';
        void loadPlans(() => current() && state.value === 'absent');
      }
    } else {
      error.value = cause instanceof Error ? cause.message : 'Failed to load workout.';
      state.value = 'error';
    }
  }
}
async function apply() {
  if (!selected.value || applying.value || manual.value || state.value !== 'absent') return;
  const current = owner();
  applying.value = true;
  error.value = '';
  notice.value = '';
  try {
    const result = await applyWorkoutPlan(props.activityId, selected.value);
    if (!current()) return;
    snapshot.value = result;
    state.value = 'saved';
    void loadLabels(result);
  } catch (cause: unknown) {
    if (!current()) return;
    if (isSessionRejected(cause)) {
      state.value = 'sign-in-required';
    } else if (cause instanceof ApiResponseError && cause.status === 409) {
      conflict = true;
      notice.value = 'A workout already exists for this activity. Reloading it.';
      await load();
    } else {
      error.value = cause instanceof Error ? cause.message : 'Failed to apply workout plan.';
    }
  } finally {
    if (current()) applying.value = false;
  }
}
function getCatalog(refresh = false): Promise<Exercise[]> {
  if (catalogPromise) return catalogPromise;
  if (catalogLoaded && !refresh) return Promise.resolve(exercises.value);
  const current = owner();
  const request = fetchExercises()
    .then((result) => {
      if (current()) {
        exercises.value = result;
        catalogLoaded = true;
      }
      return result;
    })
    .finally(() => {
      if (catalogPromise === request) catalogPromise = null;
    });
  catalogPromise = request;
  return request;
}
async function loadCatalog() {
  const current = owner();
  catalogLoading.value = true;
  catalogError.value = false;
  try {
    const result = await getCatalog(true);
    if (!current()) return;
    labels.value = {
      ...labels.value,
      ...Object.fromEntries(result.map((exercise) => [exercise.id, exercise])),
    };
  } catch {
    if (current()) catalogError.value = true;
  } finally {
    if (current()) catalogLoading.value = false;
  }
}
function startManual() {
  if (applying.value || state.value !== 'absent') return;
  entries.value = [];
  manual.value = true;
  editing.value = true;
  error.value = '';
  void loadCatalog();
  const current = owner();
  void nextTick(() => {
    if (current() && manual.value) fields.value?.focusSearch();
  });
}
function edit() {
  if (!snapshot.value || deletingEntryId.value !== null || planDialogOpen.value) return;
  entries.value = draftEntries(snapshot.value.entries);
  editing.value = true;
  error.value = '';
  notice.value = '';
  void loadCatalog();
  const current = owner();
  void nextTick(() => {
    if (current() && editing.value) fields.value?.focusSearch();
  });
}
function cancel() {
  if (saving.value || verifying.value) return;
  const wasManual = manual.value;
  const shouldReload = unconfirmed.value;
  editing.value = false;
  manual.value = false;
  unconfirmed.value = false;
  error.value = '';
  if (saveRequiresSignIn.value) {
    state.value = 'sign-in-required';
    return;
  }
  if (shouldReload) {
    workoutHeading.value?.focus();
    void load();
    return;
  }
  const current = owner();
  void nextTick(() => {
    if (current() && !editing.value) (wasManual ? addButton.value : editButton.value)?.focus();
  });
}
async function save() {
  if (
    (!snapshot.value && !manual.value) ||
    !editing.value ||
    saving.value ||
    saveRequiresSignIn.value ||
    unconfirmed.value
  )
    return;
  const updated = serializeEntries(entries.value);
  if (
    !manual.value &&
    snapshot.value &&
    JSON.stringify(updated) ===
      JSON.stringify(serializeEntries(draftEntries(snapshot.value.entries)))
  ) {
    cancel();
    return;
  }
  if (manual.value && updated.length !== 1) return;
  const current = owner();
  saving.value = true;
  error.value = '';
  try {
    const result = manual.value
      ? await addActivityExercise(props.activityId, updated[0]!)
      : await updateActivityExercisePlan(props.activityId, updated);
    if (!current()) return;
    snapshot.value = result;
    state.value = 'saved';
    manual.value = false;
    editing.value = false;
    void nextTick(() => {
      if (current()) editButton.value?.focus();
    });
    void loadLabels(result);
  } catch (cause: unknown) {
    if (!current()) return;
    if (isSessionRejected(cause)) saveRequiresSignIn.value = true;
    else if (manual.value && (!(cause instanceof ApiResponseError) || cause.status >= 500)) {
      unconfirmed.value = true;
      await verifyManualSave();
    } else error.value = cause instanceof Error ? cause.message : 'Failed to save workout.';
  } finally {
    if (current()) saving.value = false;
  }
}

async function verifyManualSave() {
  if (!manual.value || !unconfirmed.value || verifying.value) return;
  verifying.value = true;
  const current = owner();
  try {
    const result = await fetchActivityExercisePlan(props.activityId);
    if (!current() || !manual.value) return;
    snapshot.value = result;
    state.value = 'saved';
    manual.value = false;
    editing.value = false;
    unconfirmed.value = false;
    error.value = '';
    notice.value = 'A workout was found. Check the saved exercises before continuing.';
    void loadLabels(result);
    void nextTick(() => {
      if (current()) editButton.value?.focus();
    });
  } catch (cause: unknown) {
    if (!current() || !manual.value) return;
    if (isSessionRejected(cause)) saveRequiresSignIn.value = true;
    else if (cause instanceof ApiResponseError && cause.status === 404) {
      unconfirmed.value = false;
      error.value = 'No saved workout was found. You can try again.';
    } else {
      error.value = 'The save result could not be confirmed. Check again before saving.';
    }
  } finally {
    if (current()) verifying.value = false;
  }
}

async function removeSavedEntry(entryId: number, event?: MouseEvent) {
  if (!snapshot.value || editing.value || deletingEntryId.value !== null || planDialogOpen.value)
    return;
  const previous = snapshot.value;
  const current = owner();
  const trigger = event?.currentTarget;
  const stillFocused = () => !!trigger && trigger === document.activeElement;
  let moveFocus = false;
  let neighborButton: HTMLButtonElement | null = null;
  deletingEntryId.value = entryId;
  error.value = '';
  notice.value = 'Deleting exercise…';
  try {
    await deleteActivityExerciseEntry(props.activityId, entryId);
    if (!current()) return;
    const updated = {
      ...previous,
      entries: previous.entries.filter((entry) => entry.id !== entryId),
    };
    moveFocus = stillFocused();
    if (moveFocus) {
      const row = document.activeElement?.closest('li');
      const neighbor = row?.nextElementSibling ?? row?.previousElementSibling;
      neighborButton = neighbor?.querySelector('button') ?? null;
    }
    snapshot.value = updated;
    notice.value = 'Exercise deleted.';
    void loadLabels(updated);
  } catch (cause: unknown) {
    if (!current()) return;
    notice.value = '';
    if (isSessionRejected(cause)) {
      moveFocus = stillFocused();
      state.value = 'sign-in-required';
    } else if (cause instanceof ApiResponseError && cause.status === 404) {
      moveFocus = stillFocused();
      conflict = false;
      await load();
      if (current() && state.value === 'saved') notice.value = 'The exercise list was refreshed.';
    } else {
      error.value = cause instanceof Error ? cause.message : 'Failed to delete exercise.';
    }
  } finally {
    if (current()) {
      deletingEntryId.value = null;
      if (moveFocus) {
        void nextTick(() => {
          if (current() && document.activeElement === document.body) {
            (
              neighborButton ??
              recoveryButton.value ??
              editButton.value ??
              workoutHeading.value
            )?.focus();
          }
        });
      }
    }
  }
}

async function openPlanDialog(mode: 'new' | 'update' = 'new') {
  if (!snapshot.value || editing.value || deletingEntryId.value !== null || planDialogOpen.value)
    return;
  const current = owner();
  planMode.value = mode;
  planName.value = '';
  notice.value = '';
  planNameError.value = '';
  planError.value = '';
  planDialogOpen.value = true;
  await nextTick();
  if (!current() || !planDialogOpen.value) return;
  planDialog.value?.showModal();
  if (mode === 'update') planCancel.value?.focus();
  else planInput.value?.focus();
}
function closePlanDialog() {
  if (planSaving.value) return;
  const current = owner();
  planDialog.value?.close();
  planDialogOpen.value = false;
  void nextTick(() => {
    if (current()) (planMode.value === 'update' ? updateButton.value : planButton.value)?.focus();
  });
}
async function saveAsPlan() {
  if (!snapshot.value || !planDialogOpen.value || planSaving.value) return;
  if (!planName.value.trim()) {
    planNameError.value = 'Enter a plan name.';
    return;
  }
  const current = owner();
  planSaving.value = true;
  planNameError.value = '';
  planError.value = '';
  try {
    const result = await saveActivityAsWorkoutPlan(props.activityId, planName.value);
    if (!current()) return;
    snapshot.value = { ...snapshot.value, source_plan_id: result.id };
    notice.value = 'Workout saved as a new plan.';
    planSaving.value = false;
    closePlanDialog();
  } catch (cause: unknown) {
    if (!current()) return;
    if (isSessionRejected(cause)) {
      planSaving.value = false;
      planDialog.value?.close();
      planDialogOpen.value = false;
      state.value = 'sign-in-required';
      void nextTick(() => {
        if (current()) recoveryButton.value?.focus();
      });
    } else if (cause instanceof ApiResponseError && cause.status === 409) {
      planNameError.value = 'A plan with this name already exists.';
    } else {
      planError.value =
        cause instanceof Error ? cause.message : 'Failed to save workout as a plan.';
    }
  } finally {
    if (current()) {
      planSaving.value = false;
      if (planDialogOpen.value) {
        void nextTick(() => {
          if (current() && planDialogOpen.value) planInput.value?.focus();
        });
      }
    }
  }
}

async function updatePlan() {
  if (!snapshot.value?.source_plan_id || !planDialogOpen.value || planSaving.value) return;
  const current = owner();
  planSaving.value = true;
  planError.value = '';
  try {
    const result = await updateLinkedWorkoutPlan(props.activityId);
    if (!current() || !snapshot.value) return;
    snapshot.value = { ...snapshot.value, source_plan_id: result.id };
    notice.value = 'Linked plan updated.';
    planSaving.value = false;
    closePlanDialog();
  } catch (cause: unknown) {
    if (!current()) return;
    if (isSessionRejected(cause)) {
      planSaving.value = false;
      planDialog.value?.close();
      planDialogOpen.value = false;
      state.value = 'sign-in-required';
      void nextTick(() => {
        if (current()) recoveryButton.value?.focus();
      });
    } else if (cause instanceof ApiResponseError && cause.status === 409) {
      if (snapshot.value) snapshot.value = { ...snapshot.value, source_plan_id: null };
      notice.value = 'This workout is no longer linked to a plan.';
      planSaving.value = false;
      closePlanDialog();
      void nextTick(() => {
        if (current()) planButton.value?.focus();
      });
    } else {
      planError.value = cause instanceof Error ? cause.message : 'Failed to update linked plan.';
    }
  } finally {
    if (current()) {
      planSaving.value = false;
      if (planDialogOpen.value)
        void nextTick(() => {
          if (current() && planDialogOpen.value) planCancel.value?.focus();
        });
    }
  }
}

function reset() {
  generation++;
  planDialog.value?.close();
  planDialogOpen.value = false;
  planSaving.value = false;
  labelGeneration++;
  conflict = false;
  snapshot.value = null;
  plans.value = [];
  labels.value = {};
  selected.value = '';
  applying.value = false;
  manual.value = false;
  unconfirmed.value = false;
  verifying.value = false;
  plansError.value = '';
  plansLoading.value = false;
  editing.value = false;
  saving.value = false;
  deletingEntryId.value = null;
  saveRequiresSignIn.value = false;
  entries.value = [];
  exercises.value = [];
  catalogError.value = false;
  catalogLoading.value = false;
  catalogLoaded = false;
  catalogPromise = null;
  notice.value = '';
  error.value = '';
  state.value = 'loading';
}
watch(() => auth.token, reset, { flush: 'sync' });
watch(
  () => props.activityId,
  () => {
    reset();
    if (auth.token) void load();
  },
  { immediate: true, flush: 'sync' }
);
onScopeDispose(() => {
  active = false;
  generation++;
});
</script>

<template>
  <section
    class="rounded-xl border border-verve-medium/30 bg-white p-6 shadow-sm"
    aria-labelledby="workout-heading"
  >
    <h2
      id="workout-heading"
      ref="workoutHeading"
      tabindex="-1"
      class="text-lg font-bold text-verve-brown"
    >
      Workout
    </h2>
    <p v-if="notice" class="mt-3 text-sm text-verve-brown" role="status">{{ notice }}</p>
    <p v-if="state === 'loading'" class="mt-3 text-sm text-verve-brown/60">Loading workout...</p>
    <div v-else-if="state === 'sign-in-required'" class="mt-3 space-y-2">
      <p role="alert" class="text-sm text-red-700">Your sign-in is no longer valid.</p>
      <button
        ref="recoveryButton"
        type="button"
        class="rounded-lg px-2 py-1 font-semibold underline focus-visible:outline-2"
        @click="auth.logout"
      >
        Sign in again
      </button>
    </div>
    <div v-else-if="state === 'error'" class="mt-3 space-y-2">
      <p role="alert" class="text-sm text-red-700">{{ error }}</p>
      <button
        ref="recoveryButton"
        type="button"
        class="rounded-lg px-2 py-1 font-semibold underline focus-visible:outline-2"
        @click="load"
      >
        Retry workout
      </button>
    </div>
    <div v-else-if="state === 'absent' && !manual" class="mt-3 space-y-3">
      <p v-if="plansLoading" class="text-sm">Loading plans...</p>
      <p v-else-if="plansError" role="alert" class="text-sm text-red-700">
        {{ plansError }}
        <button type="button" class="underline" @click="retryPlans">Retry plans</button>
      </p>
      <p v-else-if="plans.length === 0" class="text-sm text-verve-brown/70">
        No workout plans available. Create one in
        <router-link
          :to="{ name: 'workout-plans' }"
          class="font-semibold underline focus-visible:outline-2"
          >Planning</router-link
        >.
      </p>
      <template v-else>
        <label for="workout-plan" class="block text-sm font-semibold text-verve-brown"
          >Workout plan</label
        >
        <div class="flex flex-wrap gap-3">
          <select
            id="workout-plan"
            v-model="selected"
            :disabled="applying"
            class="min-w-0 grow rounded-lg border border-verve-medium bg-white px-3 py-2 focus-visible:outline-2"
          >
            <option value="">Select a plan</option>
            <option v-for="plan in plans" :key="plan.id" :value="plan.id">{{ plan.name }}</option>
          </select>
          <button
            type="button"
            :disabled="!selected || applying"
            class="rounded-lg bg-verve-brown px-4 py-2 font-semibold text-white disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2"
            @click="apply"
          >
            {{ applying ? 'Applying...' : 'Apply plan' }}
          </button>
        </div>
      </template>
      <button
        type="button"
        :disabled="applying"
        class="rounded-lg border border-verve-brown/30 px-4 py-2 font-semibold focus-visible:outline-2 disabled:opacity-50"
        ref="addButton"
        @click="startManual"
      >
        Add exercise
      </button>
      <p v-if="error" role="alert" class="text-sm text-red-700">{{ error }}</p>
    </div>
    <div v-else-if="snapshot || manual" class="mt-3">
      <form v-if="editing" @submit.prevent="save">
        <fieldset :disabled="saving || verifying">
          <div v-if="catalogError" role="alert" class="my-2 text-sm text-red-700">
            Could not load the exercise catalog.
            <button type="button" class="underline focus-visible:outline-2" @click="loadCatalog">
              Retry catalog
            </button>
          </div>
          <WorkoutExerciseFields
            ref="fields"
            v-model="entries"
            :exercises="exercises"
            :labels="labels"
            :catalog-loading="catalogLoading"
            :catalog-error="catalogError"
            :max-entries="manual ? 1 : undefined"
          />
          <div v-if="saveRequiresSignIn" class="mt-3 space-y-2">
            <p role="alert" class="text-sm text-red-700">
              Your sign-in is no longer valid. Signing in again discards this draft.
            </p>
            <button
              type="button"
              class="rounded-lg px-2 py-1 font-semibold underline focus-visible:outline-2"
              @click="auth.logout"
            >
              Sign in again
            </button>
          </div>
          <p v-else-if="error" role="alert" class="mt-3 text-sm text-red-700">
            {{ error }}
            <button
              v-if="unconfirmed"
              type="button"
              class="underline focus-visible:outline-2"
              @click="verifyManualSave"
            >
              Check again
            </button>
          </p>
          <div class="mt-4 flex gap-3">
            <button
              type="submit"
              :disabled="saveRequiresSignIn || unconfirmed || (manual && entries.length !== 1)"
              class="rounded-lg bg-verve-brown px-4 py-2 font-semibold text-white disabled:opacity-50 focus-visible:outline-2"
            >
              {{ saving ? 'Saving...' : 'Save' }}
            </button>
            <button
              type="button"
              class="rounded-lg border border-verve-brown/30 px-4 py-2 font-semibold focus-visible:outline-2"
              @click="cancel"
            >
              Cancel
            </button>
          </div>
        </fieldset>
      </form>
      <template v-else-if="snapshot">
        <div class="mb-3 flex flex-wrap items-center gap-3">
          <button
            ref="editButton"
            type="button"
            class="rounded-lg border border-verve-brown/30 px-4 py-2 font-semibold focus-visible:outline-2 disabled:opacity-50"
            :disabled="deletingEntryId !== null || planDialogOpen"
            @click="edit"
          >
            Edit workout
          </button>
          <button
            ref="planButton"
            type="button"
            :disabled="deletingEntryId !== null || planDialogOpen"
            class="rounded-lg border border-verve-brown/30 px-4 py-2 font-semibold focus-visible:outline-2 disabled:opacity-50"
            @click="openPlanDialog('new')"
          >
            Save as new plan
          </button>
          <button
            v-if="snapshot.source_plan_id"
            ref="updateButton"
            type="button"
            :disabled="deletingEntryId !== null || planDialogOpen"
            class="rounded-lg border border-verve-brown/30 px-4 py-2 font-semibold focus-visible:outline-2 disabled:opacity-50"
            @click="openPlanDialog('update')"
          >
            Update linked plan
          </button>
        </div>
        <p v-if="error" role="alert" class="mb-3 text-sm text-red-700">{{ error }}</p>
        <p v-if="snapshot.entries.length === 0" class="text-sm text-verve-brown/70">
          This workout has no exercises.
        </p>
        <ul v-else class="divide-y divide-verve-medium/30">
          <li
            v-for="(entry, index) in snapshot.entries"
            :key="entry.id"
            class="flex items-start justify-between gap-3 py-3 text-sm text-verve-brown"
          >
            <div class="min-w-0">
              <p class="font-semibold wrap-anywhere">
                {{ labels[entry.exercise_id]?.name ?? entry.exercise_id }}
                <span
                  v-if="labels[entry.exercise_id] && !labels[entry.exercise_id]?.is_active"
                  class="font-normal"
                  >(inactive)</span
                >
              </p>
              <p class="mt-1 text-verve-brown/70">
                <span v-if="entry.sets != null">{{ entry.sets }} sets </span
                ><span v-if="entry.repetitions != null">{{ entry.repetitions }} reps </span
                ><span v-if="entry.weight != null">{{ entry.weight }} kg</span>
              </p>
            </div>
            <button
              type="button"
              class="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-2 font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
              :aria-label="`Delete ${labels[entry.exercise_id]?.name ?? entry.exercise_id}, row ${index + 1}`"
              :aria-disabled="deletingEntryId !== null || planDialogOpen"
              @click="removeSavedEntry(entry.id, $event)"
            >
              <Trash2 class="size-4" aria-hidden="true" />
              Delete
            </button>
          </li>
        </ul>
      </template>
      <p v-if="labelsFailed && snapshot" class="mt-3 text-sm text-verve-brown/70">
        Some exercise names could not be loaded.
        <button
          type="button"
          class="font-semibold underline focus-visible:outline-2"
          :disabled="saving"
          @click="loadLabels(snapshot)"
        >
          Retry names
        </button>
      </p>
    </div>
    <dialog
      v-if="planDialogOpen"
      ref="planDialog"
      aria-labelledby="save-plan-title"
      aria-describedby="plan-description"
      class="m-auto w-full max-w-md rounded-xl bg-white p-6 text-verve-brown shadow-xl backdrop:bg-black/40"
      @cancel.prevent="closePlanDialog"
    >
      <h2 id="save-plan-title" class="text-xl font-bold">
        {{ planMode === 'new' ? 'Save as new plan' : 'Update linked plan' }}
      </h2>
      <p v-if="planMode === 'new'" id="plan-description" class="mt-2 text-sm">
        This copies the saved workout and links this activity to the new plan<span
          v-if="snapshot?.source_plan_id"
          >, replacing its current plan link</span
        >.
      </p>
      <p v-else id="plan-description" class="mt-2 text-sm">
        This replaces the linked plan's exercises with this activity's saved exercises.<span
          v-if="snapshot?.entries.length === 0"
        >
          This removes all exercises from the linked plan.</span
        >
      </p>
      <form class="mt-4" @submit.prevent="planMode === 'new' ? saveAsPlan() : updatePlan()">
        <template v-if="planMode === 'new'">
          <label for="new-plan-name" class="block text-sm font-semibold">Plan name</label>
          <input
            id="new-plan-name"
            ref="planInput"
            v-model="planName"
            :disabled="planSaving"
            :aria-invalid="!!planNameError"
            :aria-describedby="planNameError ? 'new-plan-error' : undefined"
            class="mt-1 w-full rounded-lg border border-verve-medium px-3 py-2 focus-visible:outline-2"
          />
          <p
            v-if="planNameError"
            id="new-plan-error"
            role="alert"
            class="mt-2 text-sm text-red-700"
          >
            {{ planNameError }}
          </p>
        </template>
        <p v-if="planError" role="alert" class="mt-2 text-sm text-red-700">{{ planError }}</p>
        <div class="mt-4 flex gap-3">
          <button
            type="submit"
            :disabled="planSaving"
            class="rounded-lg bg-verve-brown px-4 py-2 font-semibold text-white disabled:opacity-50 focus-visible:outline-2"
          >
            {{ planSaving ? 'Saving...' : planMode === 'new' ? 'Save' : 'Update plan' }}
          </button>
          <button
            ref="planCancel"
            type="button"
            :disabled="planSaving"
            class="rounded-lg border border-verve-brown/30 px-4 py-2 font-semibold disabled:opacity-50 focus-visible:outline-2"
            @click="closePlanDialog"
          >
            Cancel
          </button>
        </div>
      </form>
    </dialog>
  </section>
</template>
