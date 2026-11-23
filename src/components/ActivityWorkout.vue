<script setup lang="ts">
import { nextTick, onScopeDispose, ref, watch } from 'vue';
import { Trash2 } from '@lucide/vue';
import { useI18n } from 'vue-i18n';
import WorkoutExerciseFields from '@/components/WorkoutExerciseFields.vue';
import WorkoutMuscleMap from '@/components/WorkoutMuscleMap.vue';
import type { en as workoutMessages } from '@/i18n/workout';
import { useUserStore } from '@/stores/auth';
import { ApiResponseError } from '@/services/authHeaders';
import {
  addActivityExercise,
  applyWorkoutPlan,
  deleteActivityExerciseEntry,
  deleteActivityExercisePlan,
  fetchActivityExercisePlan,
  fetchActivityMuscleGroups,
  fetchExercise,
  fetchExercises,
  fetchWorkoutPlans,
  saveActivityAsWorkoutPlan,
  updateActivityExercisePlan,
  updateLinkedWorkoutPlan,
  type ActivityExercisePlan,
  type ActivityMuscleGroup,
  type Exercise,
  type WorkoutPlan,
} from '@/services/workoutPlans';
import { draftEntries, serializeEntries, type DraftEntry } from '@/utils/workoutPlanDraft';

type PlanMode = keyof typeof workoutMessages.dialog;
type ErrorKey = Exclude<keyof typeof workoutMessages.errors, 'withDetail'>;
type WorkoutError = { key: ErrorKey; detail?: string };

const props = defineProps<{ activityId: string }>();
const { t, n } = useI18n();
const auth = useUserStore();
const snapshot = ref<ActivityExercisePlan | null>(null);
const state = ref<'loading' | 'absent' | 'saved' | 'error' | 'sign-in-required'>('loading');
const error = ref<WorkoutError | null>(null);
const notice = ref<keyof typeof workoutMessages.notices | null>(null);
const plans = ref<WorkoutPlan[]>([]);
const selected = ref('');
const applying = ref(false);
const manual = ref(false);
const unconfirmed = ref(false);
const verifying = ref(false);
const addButton = ref<HTMLButtonElement | null>(null);
const plansError = ref<WorkoutError | null>(null);
const plansLoading = ref(false);
const labels = ref<Record<string, Exercise>>({});
const labelsFailed = ref(false);
const muscleGroups = ref<ActivityMuscleGroup[] | 'loading' | 'error'>([]);
const muscleGroupsRegion = ref<HTMLElement | null>(null);
const editing = ref(false);
const saving = ref(false);
const deletingEntryId = ref<number | null>(null);
const saveRequiresSignIn = ref(false);
const entries = ref<DraftEntry[]>([]);
const exercises = ref<Exercise[]>([]);
const catalogError = ref(false);
const catalogLoading = ref(false);
const planDialogOpen = ref(false);
const planMode = ref<PlanMode>('new');
const planCancel = ref<HTMLButtonElement | null>(null);
const updateButton = ref<HTMLButtonElement | null>(null);
const deleteButton = ref<HTMLButtonElement | null>(null);
const planSaving = ref(false);
const planName = ref('');
const planNameError = ref<'nameRequired' | 'nameConflict' | null>(null);
const planError = ref<WorkoutError | null>(null);
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

function workoutError(key: ErrorKey, cause: unknown): WorkoutError {
  return { key, detail: cause instanceof ApiResponseError ? cause.detail : undefined };
}

function errorText(failure: WorkoutError | null): string {
  if (!failure) return '';
  const message = t(`workout.errors.${failure.key}`);
  return failure.detail
    ? t('workout.errors.withDetail', { message, detail: failure.detail })
    : message;
}

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

function savedWorkoutEntries() {
  return state.value === 'saved' ? snapshot.value?.entries : undefined;
}

async function loadMuscleGroups() {
  const savedEntries = savedWorkoutEntries();
  if (!savedEntries?.length) {
    muscleGroups.value = [];
    return;
  }
  const ownsActivity = owner();
  const current = () => ownsActivity() && savedWorkoutEntries() === savedEntries;
  muscleGroups.value = 'loading';
  try {
    const groups = await fetchActivityMuscleGroups(props.activityId);
    if (current()) muscleGroups.value = groups;
  } catch {
    if (current()) muscleGroups.value = 'error';
  }
}

function retryMuscleGroups() {
  muscleGroupsRegion.value?.focus({ preventScroll: true });
  void loadMuscleGroups();
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
  plansError.value = null;
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
    plansError.value = workoutError('loadPlans', cause);
  } finally {
    if (current()) plansLoading.value = false;
  }
}
function retryPlans() {
  const current = owner();
  void loadPlans(() => current() && state.value === 'absent');
}
function showPlanPicker(current: () => boolean) {
  snapshot.value = null;
  selected.value = '';
  error.value = null;
  labelGeneration++;
  labelsFailed.value = false;
  state.value = 'absent';
  void loadPlans(() => current() && state.value === 'absent');
}
async function load() {
  const current = owner();
  state.value = 'loading';
  error.value = null;
  try {
    const result = await fetchActivityExercisePlan(props.activityId);
    if (!current()) return;
    snapshot.value = result;
    state.value = 'saved';
    if (conflict) notice.value = 'existingLoaded';
    void loadLabels(result);
  } catch (cause: unknown) {
    if (!current()) return;
    if (conflict) notice.value = null;
    if (isSessionRejected(cause)) {
      state.value = 'sign-in-required';
    } else if (cause instanceof ApiResponseError && cause.status === 404) {
      if (conflict) {
        snapshot.value = null;
        state.value = 'error';
        error.value = { key: 'existingUnavailable' };
      } else {
        showPlanPicker(current);
      }
    } else {
      error.value = workoutError('loadWorkout', cause);
      state.value = 'error';
    }
  }
}
async function apply() {
  if (!selected.value || applying.value || manual.value || state.value !== 'absent') return;
  const current = owner();
  applying.value = true;
  error.value = null;
  notice.value = null;
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
      notice.value = 'reloadingExisting';
      await load();
    } else {
      error.value = workoutError('applyPlan', cause);
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
  error.value = null;
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
  error.value = null;
  notice.value = null;
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
  error.value = null;
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
  error.value = null;
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
    } else error.value = workoutError('saveWorkout', cause);
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
    error.value = null;
    notice.value = 'savedFound';
    void loadLabels(result);
    void nextTick(() => {
      if (current()) editButton.value?.focus();
    });
  } catch (cause: unknown) {
    if (!current() || !manual.value) return;
    if (isSessionRejected(cause)) saveRequiresSignIn.value = true;
    else if (cause instanceof ApiResponseError && cause.status === 404) {
      unconfirmed.value = false;
      error.value = { key: 'savedNotFound' };
    } else {
      error.value = { key: 'saveUnconfirmed' };
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
  error.value = null;
  notice.value = 'deletingExercise';
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
    notice.value = 'exerciseDeleted';
    void loadLabels(updated);
  } catch (cause: unknown) {
    if (!current()) return;
    notice.value = null;
    if (isSessionRejected(cause)) {
      moveFocus = stillFocused();
      state.value = 'sign-in-required';
    } else if (cause instanceof ApiResponseError && cause.status === 404) {
      moveFocus = stillFocused();
      conflict = false;
      await load();
      if (current() && state.value === 'saved') notice.value = 'exerciseListRefreshed';
    } else {
      error.value = workoutError('deleteExercise', cause);
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

async function openPlanDialog(mode: PlanMode) {
  if (!snapshot.value || editing.value || deletingEntryId.value !== null || planDialogOpen.value)
    return;
  const current = owner();
  planMode.value = mode;
  planName.value = '';
  notice.value = null;
  planNameError.value = null;
  planError.value = null;
  planDialogOpen.value = true;
  await nextTick();
  if (!current() || !planDialogOpen.value) return;
  planDialog.value?.showModal();
  if (mode === 'new') planInput.value?.focus();
  else planCancel.value?.focus();
}
function closePlanDialog() {
  if (planSaving.value) return;
  const current = owner();
  const trigger = { new: planButton, update: updateButton, delete: deleteButton }[planMode.value];
  planDialog.value?.close();
  planDialogOpen.value = false;
  void nextTick(() => {
    if (current()) (trigger.value ?? recoveryButton.value ?? workoutHeading.value)?.focus();
  });
}
async function saveAsPlan() {
  if (!snapshot.value || !planDialogOpen.value || planSaving.value) return;
  if (!planName.value.trim()) {
    planNameError.value = 'nameRequired';
    return;
  }
  const current = owner();
  planSaving.value = true;
  planNameError.value = null;
  planError.value = null;
  try {
    const result = await saveActivityAsWorkoutPlan(props.activityId, planName.value);
    if (!current()) return;
    snapshot.value = { ...snapshot.value, source_plan_id: result.id };
    notice.value = 'savedAsPlan';
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
      planNameError.value = 'nameConflict';
    } else {
      planError.value = workoutError('saveAsPlan', cause);
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
  planError.value = null;
  try {
    const result = await updateLinkedWorkoutPlan(props.activityId);
    if (!current() || !snapshot.value) return;
    snapshot.value = { ...snapshot.value, source_plan_id: result.id };
    notice.value = 'linkedPlanUpdated';
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
      notice.value = 'noPlanLink';
      planSaving.value = false;
      closePlanDialog();
      void nextTick(() => {
        if (current()) planButton.value?.focus();
      });
    } else {
      planError.value = workoutError('updatePlan', cause);
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

async function deleteWorkout() {
  if (!snapshot.value || !planDialogOpen.value || planSaving.value) return;
  const current = owner();
  planSaving.value = true;
  planError.value = null;
  try {
    await deleteActivityExercisePlan(props.activityId);
    if (!current()) return;
    conflict = false;
    entries.value = [];
    notice.value = 'workoutDeleted';
    showPlanPicker(current);
  } catch (cause: unknown) {
    if (!current()) return;
    if (isSessionRejected(cause)) {
      state.value = 'sign-in-required';
    } else if (cause instanceof ApiResponseError && cause.status === 404) {
      conflict = false;
      await load();
    } else {
      planError.value = workoutError('deleteWorkout', cause);
      void nextTick(() => {
        if (current() && planDialogOpen.value) planCancel.value?.focus();
      });
      return;
    }
  } finally {
    if (current()) planSaving.value = false;
  }
  if (current()) closePlanDialog();
}

const planActions = { new: saveAsPlan, update: updatePlan, delete: deleteWorkout };

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
  plansError.value = null;
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
  notice.value = null;
  error.value = null;
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
watch(savedWorkoutEntries, loadMuscleGroups);
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
      {{ t('workout.title') }}
    </h2>
    <p v-if="notice" class="mt-3 text-sm text-verve-brown" role="status">
      {{ t(`workout.notices.${notice}`) }}
    </p>
    <p v-if="state === 'loading'" class="mt-3 text-sm text-verve-brown/60">
      {{ t('workout.loading') }}
    </p>
    <div v-else-if="state === 'sign-in-required'" class="mt-3 space-y-2">
      <p role="alert" class="text-sm text-red-700">{{ t('workout.signInExpired') }}</p>
      <button
        ref="recoveryButton"
        type="button"
        class="rounded-lg px-2 py-1 font-semibold underline focus-visible:outline-2"
        @click="auth.logout"
      >
        {{ t('workout.signInAgain') }}
      </button>
    </div>
    <div v-else-if="state === 'error'" class="mt-3 space-y-2">
      <p role="alert" class="text-sm text-red-700">{{ errorText(error) }}</p>
      <button
        ref="recoveryButton"
        type="button"
        class="rounded-lg px-2 py-1 font-semibold underline focus-visible:outline-2"
        @click="load"
      >
        {{ t('workout.retry') }}
      </button>
    </div>
    <div v-else-if="state === 'absent' && !manual" class="mt-3 space-y-3">
      <p v-if="plansLoading" class="text-sm">{{ t('workout.plansLoading') }}</p>
      <p v-else-if="plansError" role="alert" class="text-sm text-red-700">
        {{ errorText(plansError) }}
        <button type="button" class="underline" @click="retryPlans">
          {{ t('workout.retryPlans') }}
        </button>
      </p>
      <i18n-t
        v-else-if="plans.length === 0"
        keypath="workout.noPlans"
        tag="p"
        scope="global"
        class="text-sm text-verve-brown/70"
      >
        <template #planning>
          <router-link
            :to="{ name: 'workout-plans' }"
            class="font-semibold underline focus-visible:outline-2"
          >
            {{ t('navigation.planning') }}
          </router-link>
        </template>
      </i18n-t>
      <template v-else>
        <label for="workout-plan" class="block text-sm font-semibold text-verve-brown">
          {{ t('workout.plan') }}
        </label>
        <div class="flex flex-wrap gap-3">
          <select
            id="workout-plan"
            v-model="selected"
            :disabled="applying"
            class="min-w-0 grow rounded-lg border border-verve-medium bg-white px-3 py-2 focus-visible:outline-2"
          >
            <option value="">{{ t('workout.selectPlan') }}</option>
            <option v-for="plan in plans" :key="plan.id" :value="plan.id">{{ plan.name }}</option>
          </select>
          <button
            type="button"
            :disabled="!selected || applying"
            class="rounded-lg bg-verve-brown px-4 py-2 font-semibold text-white disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2"
            @click="apply"
          >
            {{ t(applying ? 'workout.applying' : 'workout.applyPlan') }}
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
        {{ t('workout.addExercise') }}
      </button>
      <p v-if="error" role="alert" class="text-sm text-red-700">{{ errorText(error) }}</p>
    </div>
    <div v-else-if="snapshot || manual" class="mt-3">
      <form v-if="editing" @submit.prevent="save">
        <fieldset :disabled="saving || verifying">
          <div v-if="catalogError" role="alert" class="my-2 text-sm text-red-700">
            {{ t('workout.errors.loadCatalog') }}
            <button type="button" class="underline focus-visible:outline-2" @click="loadCatalog">
              {{ t('workout.retryCatalog') }}
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
              {{ t('workout.signInExpiredDraft') }}
            </p>
            <button
              type="button"
              class="rounded-lg px-2 py-1 font-semibold underline focus-visible:outline-2"
              @click="auth.logout"
            >
              {{ t('workout.signInAgain') }}
            </button>
          </div>
          <p v-else-if="error" role="alert" class="mt-3 text-sm text-red-700">
            {{ errorText(error) }}
            <button
              v-if="unconfirmed"
              type="button"
              class="underline focus-visible:outline-2"
              @click="verifyManualSave"
            >
              {{ t('workout.checkAgain') }}
            </button>
          </p>
          <div class="mt-4 flex gap-3">
            <button
              type="submit"
              :disabled="saveRequiresSignIn || unconfirmed || (manual && entries.length !== 1)"
              class="rounded-lg bg-verve-brown px-4 py-2 font-semibold text-white disabled:opacity-50 focus-visible:outline-2"
            >
              {{ t(saving ? 'workout.saving' : 'workout.save') }}
            </button>
            <button
              type="button"
              class="rounded-lg border border-verve-brown/30 px-4 py-2 font-semibold focus-visible:outline-2"
              @click="cancel"
            >
              {{ t('workout.cancel') }}
            </button>
          </div>
        </fieldset>
      </form>
      <template v-else-if="snapshot">
        <div class="mb-3 grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center md:gap-3">
          <button
            ref="editButton"
            type="button"
            class="rounded-lg border border-verve-brown/30 px-2 py-2 text-sm font-semibold focus-visible:outline-2 disabled:opacity-50 md:px-4 md:text-base"
            :disabled="deletingEntryId !== null || planDialogOpen"
            @click="edit"
          >
            {{ t('workout.edit') }}
          </button>
          <button
            ref="planButton"
            type="button"
            :disabled="deletingEntryId !== null || planDialogOpen"
            class="rounded-lg border border-verve-brown/30 px-2 py-2 text-sm font-semibold focus-visible:outline-2 disabled:opacity-50 md:px-4 md:text-base"
            @click="openPlanDialog('new')"
          >
            {{ t('workout.dialog.new.title') }}
          </button>
          <button
            v-if="snapshot.source_plan_id"
            ref="updateButton"
            type="button"
            :disabled="deletingEntryId !== null || planDialogOpen"
            class="rounded-lg border border-verve-brown/30 px-2 py-2 text-sm font-semibold focus-visible:outline-2 disabled:opacity-50 md:px-4 md:text-base"
            @click="openPlanDialog('update')"
          >
            {{ t('workout.dialog.update.title') }}
          </button>
          <button
            ref="deleteButton"
            type="button"
            :disabled="deletingEntryId !== null || planDialogOpen"
            class="rounded-lg border border-red-700/30 px-2 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-2 disabled:opacity-50 md:px-4 md:text-base"
            @click="openPlanDialog('delete')"
          >
            {{ t('workout.dialog.delete.confirm') }}
          </button>
        </div>
        <p v-if="error" role="alert" class="mb-3 text-sm text-red-700">{{ errorText(error) }}</p>
        <p v-if="snapshot.entries.length === 0" class="text-sm text-verve-brown/70">
          {{ t('workout.noExercises') }}
        </p>
        <div
          v-else
          class="grid items-start gap-5 lg:gap-8"
          :class="{ 'lg:grid-cols-[minmax(0,1fr)_19rem]': muscleGroups.length }"
        >
          <div class="min-w-0">
            <h3 class="font-semibold">{{ t('workout.exercises') }}</h3>
            <ul class="mt-1 divide-y divide-verve-medium/30">
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
                    >
                      {{ t('workout.inactive') }}
                    </span>
                  </p>
                  <p class="mt-1 flex flex-wrap gap-x-1 text-verve-brown/70">
                    <span v-if="entry.sets != null">
                      {{ t('workout.sets', { count: n(entry.sets) }, entry.sets) }}
                    </span>
                    <span v-if="entry.repetitions != null">
                      {{
                        t('workout.repetitions', { count: n(entry.repetitions) }, entry.repetitions)
                      }}
                    </span>
                    <span v-if="entry.weight != null">
                      {{
                        t('workout.weight', {
                          weight: n(entry.weight, { maximumSignificantDigits: 21 }),
                        })
                      }}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  class="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
                  :aria-label="
                    t('workout.deleteExercise', {
                      name: labels[entry.exercise_id]?.name ?? entry.exercise_id,
                      row: n(index + 1),
                    })
                  "
                  :aria-disabled="deletingEntryId !== null || planDialogOpen"
                  @click="removeSavedEntry(entry.id, $event)"
                >
                  <Trash2 class="size-4" aria-hidden="true" />
                </button>
              </li>
            </ul>
          </div>
          <div
            v-if="muscleGroups.length"
            ref="muscleGroupsRegion"
            role="group"
            :aria-label="t('workout.muscleGroups')"
            tabindex="-1"
            class="w-full max-w-76 min-w-0 focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <p v-if="muscleGroups === 'loading'" class="text-sm text-verve-brown/70" role="status">
              {{ t('workout.muscleGroupsLoading') }}
            </p>
            <div v-else-if="muscleGroups === 'error'" class="space-y-2 text-sm text-verve-brown">
              <p role="status">{{ t('workout.errors.loadMuscleGroups') }}</p>
              <button
                type="button"
                class="rounded-sm font-semibold underline focus-visible:outline-2"
                @click="retryMuscleGroups"
              >
                {{ t('workout.retryMuscleGroups') }}
              </button>
            </div>
            <WorkoutMuscleMap v-else :groups="muscleGroups" />
          </div>
        </div>
      </template>
      <p v-if="labelsFailed && snapshot" class="mt-3 text-sm text-verve-brown/70">
        {{ t('workout.errors.loadNames') }}
        <button
          type="button"
          class="font-semibold underline focus-visible:outline-2"
          :disabled="saving"
          @click="loadLabels(snapshot)"
        >
          {{ t('workout.retryNames') }}
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
        {{ t(`workout.dialog.${planMode}.title`) }}
      </h2>
      <p v-if="planMode === 'new'" id="plan-description" class="mt-2 text-sm">
        {{
          t(
            snapshot?.source_plan_id
              ? 'workout.dialog.new.descriptionLinked'
              : 'workout.dialog.new.description'
          )
        }}
      </p>
      <p v-else-if="planMode === 'update'" id="plan-description" class="mt-2 text-sm">
        {{
          t(
            snapshot?.entries.length === 0
              ? 'workout.dialog.update.descriptionEmpty'
              : 'workout.dialog.update.description'
          )
        }}
      </p>
      <p v-else id="plan-description" class="mt-2 text-sm">
        {{
          t(
            snapshot?.source_plan_id
              ? 'workout.dialog.delete.descriptionLinked'
              : 'workout.dialog.delete.description'
          )
        }}
      </p>
      <form class="mt-4" @submit.prevent="planActions[planMode]()">
        <template v-if="planMode === 'new'">
          <label for="new-plan-name" class="block text-sm font-semibold">
            {{ t('workout.planName') }}
          </label>
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
            {{ t(`workout.errors.${planNameError}`) }}
          </p>
        </template>
        <p v-if="planError" role="alert" class="mt-2 text-sm text-red-700">
          {{ errorText(planError) }}
        </p>
        <div class="mt-4 flex gap-3">
          <button
            type="submit"
            :disabled="planSaving"
            :class="planMode === 'delete' ? 'bg-red-700' : 'bg-verve-brown'"
            class="rounded-lg px-4 py-2 font-semibold text-white disabled:opacity-50 focus-visible:outline-2"
          >
            {{ t(`workout.dialog.${planMode}.${planSaving ? 'pending' : 'confirm'}`) }}
          </button>
          <button
            ref="planCancel"
            type="button"
            :disabled="planSaving"
            class="rounded-lg border border-verve-brown/30 px-4 py-2 font-semibold disabled:opacity-50 focus-visible:outline-2"
            @click="closePlanDialog"
          >
            {{ t('workout.cancel') }}
          </button>
        </div>
      </form>
    </dialog>
  </section>
</template>
