<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { Activity } from '@/stores/activity';
import { useTypeStore } from '@/stores/types';
import { useActivityDateTime } from '@/composables/useActivityDateTime';
import { formatDuration } from '@/utils/datetime';

const props = defineProps<{
  activity: Activity;
  compact?: boolean;
}>();

const typeStore = useTypeStore();
const { locale, t } = useI18n();
const activityDateTime = useActivityDateTime(() => props.activity, locale);
const localTimeUnavailable = computed(() =>
  activityDateTime.value.isLocalTimeAvailable
    ? null
    : t('activities.row.localTimeUnavailable', {
        timestamp: props.activity.start,
        timezone: props.activity.timezone,
      })
);
const timeLabel = computed(
  () =>
    localTimeUnavailable.value ??
    t('activities.row.timeLabel', {
      dateTime: activityDateTime.value.dateTime,
      timezone: props.activity.timezone,
    })
);

const distance = computed(() =>
  props.activity.distance == null
    ? '-'
    : new Intl.NumberFormat(locale.value, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(props.activity.distance)
);
const elevationGain = computed(() =>
  props.activity.elevationGain === null
    ? '-'
    : new Intl.NumberFormat(locale.value, { maximumFractionDigits: 0 }).format(
        props.activity.elevationGain
      )
);

const activityType = computed(() => {
  return typeStore.activityTypes.find((t) => t.id === props.activity.type_id);
});

const activitySubType = computed(() => {
  if (!activityType.value || !props.activity.sub_type_id) {
    return null;
  }
  return activityType.value.sub_types.find((st) => st.id === props.activity.sub_type_id);
});

const hasDistinctTotalDuration = computed(() => {
  return props.activity.durationSeconds !== props.activity.effectiveDurationSeconds;
});
const effectiveDuration = computed(() => formatDuration(props.activity.effectiveDurationSeconds, locale.value));
const totalDuration = computed(() => formatDuration(props.activity.durationSeconds, locale.value));
</script>

<template>
  <router-link :to="{ name: 'activity-detail', params: { id: activity.id } }"
    class="block transition-all duration-200 ease-in-out hover:bg-verve-light border-l-4 border-transparent hover:border-verve-neon"
    :class="compact
        ? 'p-3'
        : 'p-5 bg-white border-b border-verve-medium/10 first:rounded-t-xl last:rounded-b-xl last:border-b-0'
      ">
    <!-- COMPACT LAYOUT (For Sidebar/Widgets) -->
    <div v-if="compact">
      <div class="flex justify-between items-start mb-2">
        <div class="overflow-hidden">
          <p class="font-bold text-verve-brown text-sm truncate">{{ activity.name }}</p>
          <p class="text-xs text-verve-brown/60" :title="activity.timezone">
            <time :datetime="activity.start" :aria-label="timeLabel">
              {{ localTimeUnavailable ?? activityDateTime.shortDate }}<template v-if="activityDateTime.time"> &bull; {{ activityDateTime.time }}</template>
            </time>
          </p>
        </div>
        <span v-if="activityType"
          class="text-[10px] uppercase font-bold text-verve-brown/70 bg-verve-light px-1.5 py-0.5 rounded ml-2 whitespace-nowrap">
          {{ activityType.name }}
        </span>
      </div>

      <div class="grid grid-cols-3 gap-2 border-t border-verve-medium/20 pt-2 text-verve-brown/80">
        <div>
          <span class="text-sm font-semibold">{{ distance }}</span>
          <span v-if="activity.distance != null" class="text-xs font-normal text-verve-brown/50 ml-0.5">km</span>
        </div>
        <div class="text-center">
          <p class="text-sm font-semibold">{{ effectiveDuration }}</p>
          <p v-if="hasDistinctTotalDuration" class="text-[10px] text-verve-brown/45">
            {{ t('activities.row.totalDuration', { duration: totalDuration }) }}
          </p>
        </div>
        <div class="text-right">
          <span class="text-sm font-semibold">{{ elevationGain }}</span>
          <span class="text-xs font-normal text-verve-brown/50 ml-0.5">m</span>
        </div>
      </div>
    </div>

    <!-- STANDARD LAYOUT (Main List) -->
    <div v-else class="grid grid-cols-2 md:grid-cols-6 gap-4 items-center">
      <!-- Activity Name -->
      <div class="col-span-2 md:col-span-2">
        <p class="font-bold text-verve-brown text-lg leading-tight">{{ activity.name }}</p>
      </div>

      <!-- Date and Time -->
      <div class="col-span-2 md:col-span-1">
        <time :datetime="activity.start" :title="activity.timezone" :aria-label="timeLabel">
          <span class="block font-semibold text-verve-brown/80 text-sm">{{ localTimeUnavailable ?? activityDateTime.shortDate }}</span>
          <span v-if="activityDateTime.time" class="block text-xs text-verve-brown/50">{{ activityDateTime.time }}</span>
        </time>
      </div>

      <!-- Activity Type and Sub-Type -->
      <div class="hidden md:block">
        <p class="text-verve-brown font-semibold text-sm">{{ activityType?.name ?? t('activities.row.unknownType') }}</p>
        <p v-if="activitySubType" class="text-xs text-verve-brown/50">{{ activitySubType.name }}</p>
      </div>

      <!-- Duration -->
      <div>
        <p class="font-bold text-verve-brown">{{ effectiveDuration }}</p>
        <p class="text-xs text-verve-brown/50 uppercase tracking-wide">{{ t('activities.row.activeTime') }}</p>
        <p v-if="hasDistinctTotalDuration" class="text-xs text-verve-brown/45">
          {{ t('activities.row.totalDuration', { duration: totalDuration }) }}
        </p>
      </div>

      <!-- Distance -->
      <div class="text-right">
        <p class="font-bold text-verve-brown">
          {{ distance }}
          <span v-if="activity.distance" class="text-xs font-normal text-verve-brown/50">km</span>
        </p>
        <p class="text-xs text-verve-brown/50 uppercase tracking-wide">{{ t('activities.row.distance') }}</p>
      </div>
    </div>
  </router-link>
</template>
