<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { ChevronDown } from '@lucide/vue';
import { useAccountSession } from '@/composables/useAccountSession';
import { useLatestRequest } from '@/composables/useLatestRequest';
import { fetchWorkoutPlanActivities } from '@/services/workoutPlans';
import { ApiResponseError } from '@/services/authHeaders';
import type { ActivityPublic } from '@/types/api';
import { formatActivityTimestamp } from '@/utils/datetime';

const props = defineProps<{ planId: string }>();
const { t, n, locale } = useI18n();
const pageSize = 10;
const activities = ref<ActivityPublic[]>([]);
const page = ref(1);
const loading = ref(false);
const error = ref<{ detail?: string } | null>(null);
let active = true;
let accountValid = true;
function reset() {
  activities.value = [];
  page.value = 1;
  loading.value = false;
  error.value = null;
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
  error.value = null;
  activities.value = [];
  page.value = 1;
  try {
    const result = await fetchWorkoutPlanActivities(props.planId);
    if (current()) activities.value = result;
  } catch (cause: unknown) {
    if (current()) {
      error.value = { detail: cause instanceof ApiResponseError ? cause.detail : undefined };
    }
  } finally {
    if (current()) loading.value = false;
  }
}
function localTime(activity: ActivityPublic, options: Intl.DateTimeFormatOptions) {
  const { start, timezone } = activity;
  const result = formatActivityTimestamp(start, timezone, options, locale.value);
  return {
    isLocalTimeAvailable: result.isLocalTimeAvailable,
    text: result.isLocalTimeAvailable
      ? result.text
      : t('activities.row.localTimeUnavailable', { timestamp: start, timezone }),
  };
}
const latest = computed(() => {
  const activity = activities.value[0];
  if (!activity) return null;
  const date = localTime(activity, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return { activity, date };
});
const pageCount = computed(() => Math.ceil(activities.value.length / pageSize));
const rows = computed(() => {
  const start = (page.value - 1) * pageSize;
  return activities.value.slice(start, start + pageSize).map((activity) => ({
    activity,
    time: localTime(activity, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    }),
  }));
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
        <strong v-if="loading || error">{{ t('linkedActivities.title') }}</strong>
        <strong v-else>
          {{ t('linkedActivities.count', { count: n(activities.length) }, activities.length) }}
        </strong>
        <span v-if="loading" class="text-sm text-verve-brown/70">{{
          t('linkedActivities.loading')
        }}</span>
        <span v-else-if="error" class="text-sm text-red-700">{{
          t('linkedActivities.unavailable')
        }}</span>
        <span v-else-if="latest" class="wrap-anywhere text-sm text-verve-brown/70">
          {{
            t(
              latest.date.isLocalTimeAvailable
                ? 'linkedActivities.lastOn'
                : 'linkedActivities.lastActivity'
            )
          }}
          <time :datetime="latest.activity.start" :title="latest.activity.timezone">{{
            latest.date.text
          }}</time>
        </span>
      </span>
      <ChevronDown class="size-5 shrink-0 group-open:rotate-180" aria-hidden="true" />
    </summary>
    <div class="border-t border-verve-brown/20 p-4">
      <p v-if="loading" role="status">{{ t('linkedActivities.loadingDetails') }}</p>
      <p v-else-if="error" role="alert" class="text-red-700">
        {{
          error.detail
            ? t('linkedActivities.failureDetail', { detail: error.detail })
            : t('linkedActivities.failed')
        }}
        <button
          type="button"
          class="underline focus-visible:outline-2 focus-visible:outline-verve-orange"
          @click="load"
        >
          {{ t('linkedActivities.retry') }}
        </button>
      </p>
      <p v-else-if="!activities.length">{{ t('linkedActivities.empty') }}</p>
      <template v-else>
        <ul class="divide-y divide-verve-brown/15">
          <li v-for="{ activity, time } in rows" :key="activity.id">
            <router-link
              :to="{ name: 'activity-detail', params: { id: activity.id } }"
              class="flex flex-wrap justify-between gap-2 rounded-lg px-3 py-3 hover:bg-verve-light focus-visible:outline-2 focus-visible:outline-verve-orange"
            >
              <strong class="min-w-0 wrap-anywhere">{{
                activity.name || t('linkedActivities.activity')
              }}</strong>
              <time
                class="min-w-0 wrap-anywhere text-sm text-verve-brown/70"
                :datetime="activity.start"
                :title="activity.timezone"
                :aria-label="
                  time.isLocalTimeAvailable
                    ? t('linkedActivities.timeLabel', {
                        time: time.text,
                        timezone: activity.timezone,
                      })
                    : time.text
                "
                >{{ time.text }}</time
              >
            </router-link>
          </li>
        </ul>
        <nav
          v-if="pageCount > 1"
          :aria-label="t('linkedActivities.pagination')"
          class="mt-4 flex flex-wrap items-center justify-between gap-2"
        >
          <button
            type="button"
            :aria-label="t('linkedActivities.previousPage')"
            :aria-disabled="page === 1"
            class="rounded-lg border border-verve-brown/25 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-verve-orange aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
            @click="changePage(-1)"
          >
            {{ t('linkedActivities.previous') }}
          </button>
          <span class="text-sm text-verve-brown/70" role="status">
            {{ t('linkedActivities.page', { page: n(page), total: n(pageCount) }) }}
          </span>
          <button
            type="button"
            :aria-label="t('linkedActivities.nextPage')"
            :aria-disabled="page === pageCount"
            class="rounded-lg border border-verve-brown/25 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-verve-orange aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
            @click="changePage(1)"
          >
            {{ t('linkedActivities.next') }}
          </button>
        </nav>
      </template>
    </div>
  </details>
</template>
