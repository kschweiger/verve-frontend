<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { Check, Plus, X } from '@lucide/vue';
import ActivityFilter from '@/components/ActivityFilter.vue';
import ActivityListItem from '@/components/ActivityListItem.vue';
import { fetchActivityPage, type ActivityPageParams } from '@/services/api';
import { ApiResponseError } from '@/services/authHeaders';
import type { Activity, ActivityFilters } from '@/stores/activity';

const props = defineProps<{
  selectedActivities: Activity[];
  lockedActivityIds?: string[];
}>();

const emit = defineEmits<{
  (event: 'update:selectedActivities', value: Activity[]): void;
}>();

const ACTIVITIES_PER_PAGE = 10;

const { t, n } = useI18n();
const activities = ref<Activity[]>([]);
const filters = ref<ActivityFilters>({});
const isLoading = ref(false);
const error = ref<{ detail?: string } | null>(null);
const offset = ref(0);
const canLoadMore = ref(true);

const selectedIds = computed(() => new Set(props.selectedActivities.map((activity) => activity.id)));
const lockedIds = computed(() => new Set(props.lockedActivityIds ?? []));

const sortedSelectedActivities = computed(() =>
  [...props.selectedActivities].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
);

function toPageParams(nextOffset: number): ActivityPageParams {
  return {
    ...filters.value,
    limit: ACTIVITIES_PER_PAGE,
    offset: nextOffset,
  };
}

async function loadActivities(loadMore = false) {
  if (isLoading.value) return;

  isLoading.value = true;
  error.value = null;

  if (!loadMore) {
    activities.value = [];
    offset.value = 0;
    canLoadMore.value = true;
  }

  try {
    const page = await fetchActivityPage(toPageParams(offset.value));
    activities.value = loadMore ? [...activities.value, ...page] : page;
    offset.value += page.length;
    canLoadMore.value = page.length === ACTIVITIES_PER_PAGE;
  } catch (e: unknown) {
    error.value = { detail: e instanceof ApiResponseError ? e.detail : undefined };
  } finally {
    isLoading.value = false;
  }
}

function handleFilterChange(nextFilters: ActivityFilters) {
  filters.value = nextFilters;
  loadActivities(false);
}

function addActivity(activity: Activity) {
  if (selectedIds.value.has(activity.id)) return;
  emit('update:selectedActivities', [...props.selectedActivities, activity]);
}

function removeActivity(activityId: string) {
  if (lockedIds.value.has(activityId)) return;
  emit(
    'update:selectedActivities',
    props.selectedActivities.filter((activity) => activity.id !== activityId)
  );
}

onMounted(() => {
  loadActivities(false);
});
</script>

<template>
  <div class="space-y-6">
    <section class="rounded-xl border border-verve-medium/30 bg-white p-5">
      <div class="flex items-center justify-between gap-4">
        <div>
          <h2 class="text-lg font-bold text-verve-brown">{{ t('collections.picker.selected') }}</h2>
          <p class="mt-1 text-sm text-verve-brown/60">
            {{ t('collections.picker.selectedCount', { formattedCount: n(selectedActivities.length) }, selectedActivities.length) }}
          </p>
        </div>
      </div>

      <div v-if="sortedSelectedActivities.length > 0" class="mt-4 space-y-2">
        <div
          v-for="activity in sortedSelectedActivities"
          :key="activity.id"
          class="flex items-center gap-3 rounded-lg border border-verve-medium/30 bg-verve-light/20 p-3"
        >
          <div class="min-w-0 grow">
            <ActivityListItem :activity="activity" compact />
          </div>
          <button
            type="button"
            class="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="lockedIds.has(activity.id)"
            :aria-label="activity.name
              ? t('collections.picker.remove', { name: activity.name })
              : t('collections.picker.removeUnnamed')"
            @click="removeActivity(activity.id)"
          >
            <X class="size-4" />
          </button>
        </div>
      </div>

      <p v-else class="mt-4 rounded-lg bg-verve-light/30 p-4 text-sm text-verve-brown/60">
        {{ t('collections.picker.selectOne') }}
      </p>
    </section>

    <section class="rounded-xl border border-verve-medium/30 bg-white p-5">
      <h2 class="text-lg font-bold text-verve-brown">{{ t('collections.picker.addActivities') }}</h2>
      <div class="mt-4">
        <ActivityFilter :initial-filters="filters" @filter-change="handleFilterChange" />
      </div>

      <div v-if="error" role="alert" class="mt-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">
        {{ t('collections.errors.loadActivities') }} {{ error.detail }}
      </div>

      <div class="mt-4 space-y-2">
        <div
          v-for="activity in activities"
          :key="activity.id"
          class="flex items-center gap-3 rounded-lg border border-verve-medium/30 bg-white p-3"
        >
          <div class="min-w-0 grow">
            <ActivityListItem :activity="activity" compact />
          </div>
          <button
            v-if="selectedIds.has(activity.id)"
            type="button"
            disabled
            class="inline-flex items-center justify-center rounded-lg bg-verve-light p-2 text-verve-brown/60"
            :aria-label="activity.name
              ? t('collections.picker.alreadySelected', { name: activity.name })
              : t('collections.picker.unnamedAlreadySelected')"
          >
            <Check class="size-4" />
          </button>
          <button
            v-else
            type="button"
            class="inline-flex items-center justify-center rounded-lg bg-verve-brown p-2 text-white transition-colors hover:bg-verve-brown/90"
            :aria-label="activity.name
              ? t('collections.picker.add', { name: activity.name })
              : t('collections.picker.addUnnamed')"
            @click="addActivity(activity)"
          >
            <Plus class="size-4" />
          </button>
        </div>
      </div>

      <div class="mt-4 text-center">
        <button
          v-if="canLoadMore && !isLoading"
          type="button"
          class="rounded-xl border border-verve-medium bg-white px-5 py-2 text-sm font-semibold text-verve-brown transition-colors hover:bg-verve-light"
          @click="loadActivities(true)"
        >
          {{ t('collections.picker.loadMore') }}
        </button>
        <p v-if="isLoading" class="py-3 text-sm text-verve-brown/60">
          {{ t('collections.picker.loading') }}
        </p>
      </div>
    </section>
  </div>
</template>
