<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from 'vue';
import { ChevronDown } from '@lucide/vue';
import { useAccountSession } from '@/composables/useAccountSession';
import { useLatestRequest } from '@/composables/useLatestRequest';
import { fetchWorkoutPlanActivities } from '@/services/workoutPlans';
import type { ActivityPublic } from '@/types/api';
import { formatActivityTimestamp } from '@/utils/datetime';

const props = defineProps<{ planId: string }>();
const pageSize = 10;
const activities = ref<ActivityPublic[]>([]);
const page = ref(1);
const loading = ref(false);
const error = ref(false);
let active = true;
let accountValid = true;
function reset() {
  activities.value = [];
  page.value = 1;
  loading.value = false;
  error.value = false;
}
const captureSession = useAccountSession(() => {
  accountValid = false;
  reset();
});
const beginRequest = useLatestRequest(() => {
  const session = captureSession();
  const id = props.planId;
  return () => active && accountValid && session() && id === props.planId;
});
async function load() {
  if (!active || !accountValid) return;
  const current = beginRequest();
  loading.value = true;
  error.value = false;
  activities.value = [];
  page.value = 1;
  try {
    const result = await fetchWorkoutPlanActivities(props.planId);
    if (current()) activities.value = result;
  } catch {
    if (current()) error.value = true;
  } finally {
    if (current()) loading.value = false;
  }
}
function localTime(activity: ActivityPublic) {
  return formatActivityTimestamp(activity.start, activity.timezone, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}
const latest = computed(() => {
  const activity = activities.value[0];
  if (!activity) return null;
  const date = formatActivityTimestamp(activity.start, activity.timezone, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return { activity, date };
});
const pageCount = computed(() => Math.ceil(activities.value.length / pageSize));
const rows = computed(() => {
  const start = (page.value - 1) * pageSize;
  return activities.value
    .slice(start, start + pageSize)
    .map((activity) => ({ activity, time: localTime(activity) }));
});
function changePage(delta: number) {
  page.value = Math.max(1, Math.min(pageCount.value, page.value + delta));
}
watch(
  () => props.planId,
  () => {
    void load();
  },
  { immediate: true, flush: 'sync' }
);
onScopeDispose(() => {
  active = false;
});
</script>

<template>
  <details :key="planId" class="group mt-8 rounded-xl border border-verve-brown/20 bg-white">
    <summary
      class="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl p-4 focus-visible:outline-2 focus-visible:outline-verve-orange [&::-webkit-details-marker]:hidden"
    >
      <span class="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
        <strong v-if="loading || error">Linked activities</strong>
        <strong v-else>
          {{ activities.length }} linked {{ activities.length === 1 ? 'activity' : 'activities' }}
        </strong>
        <span v-if="loading" class="text-sm text-verve-brown/70">Loading…</span>
        <span v-else-if="error" class="text-sm text-red-700">Unavailable</span>
        <span v-else-if="latest" class="wrap-anywhere text-sm text-verve-brown/70">
          {{ latest.date.isLocalTimeAvailable ? 'Last on' : 'Last activity' }}
          <time
            :datetime="latest.activity.start"
            :title="latest.activity.timezone"
          >{{ latest.date.text }}</time>
        </span>
      </span>
      <ChevronDown class="size-5 shrink-0 group-open:rotate-180" aria-hidden="true" />
    </summary>
    <div class="border-t border-verve-brown/20 p-4">
      <p v-if="loading" role="status">Loading linked activities...</p>
      <p v-else-if="error" role="alert" class="text-red-700">
        Could not load linked activities.
        <button
          type="button"
          class="underline focus-visible:outline-2 focus-visible:outline-verve-orange"
          @click="load"
        >
          Retry
        </button>
      </p>
      <p v-else-if="!activities.length">No linked activities yet.</p>
      <template v-else>
        <ul class="divide-y divide-verve-brown/15">
          <li v-for="{ activity, time } in rows" :key="activity.id">
            <router-link
              :to="{ name: 'activity-detail', params: { id: activity.id } }"
              class="flex flex-wrap justify-between gap-2 rounded-lg px-3 py-3 hover:bg-verve-light focus-visible:outline-2 focus-visible:outline-verve-orange"
            >
              <strong class="min-w-0 wrap-anywhere">{{ activity.name || 'Activity' }}</strong>
              <time
                class="min-w-0 wrap-anywhere text-sm text-verve-brown/70"
                :datetime="activity.start"
                :title="activity.timezone"
                :aria-label="time.isLocalTimeAvailable ? `${time.text} · ${activity.timezone}` : time.text"
              >{{ time.text }}</time>
            </router-link>
          </li>
        </ul>
        <nav
          v-if="pageCount > 1"
          aria-label="Linked activities pagination"
          class="mt-4 flex flex-wrap items-center justify-between gap-2"
        >
          <button
            type="button"
            aria-label="Previous page"
            :aria-disabled="page === 1"
            class="rounded-lg border border-verve-brown/25 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-verve-orange aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
            @click="changePage(-1)"
          >
            Previous
          </button>
          <span class="text-sm text-verve-brown/70" role="status">Page {{ page }} of {{ pageCount }}</span>
          <button
            type="button"
            aria-label="Next page"
            :aria-disabled="page === pageCount"
            class="rounded-lg border border-verve-brown/25 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-verve-orange aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
            @click="changePage(1)"
          >
            Next
          </button>
        </nav>
      </template>
    </div>
  </details>
</template>
