<script setup lang="ts">
import { computed } from 'vue';
import type { Activity } from '@/stores/activity';
import { useTypeStore } from '@/stores/types';

const props = defineProps<{
  activity: Activity;
  compact?: boolean;
}>();

const typeStore = useTypeStore();

const activityType = computed(() => {
  return typeStore.activityTypes.find((t) => t.id === props.activity.type_id);
});

const activitySubType = computed(() => {
  if (!activityType.value || !props.activity.sub_type_id) {
    return null;
  }
  return activityType.value.sub_types.find((st) => st.id === props.activity.sub_type_id);
});

const formatDate = (isoDate: string) => {
  return new Date(isoDate).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatTime = (isoDate: string) => {
  return new Date(isoDate).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
};
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
          <p class="text-xs text-verve-brown/60">
            {{ formatDate(activity.start) }} &bull; {{ formatTime(activity.start) }}
          </p>
        </div>
        <span v-if="activityType"
          class="text-[10px] uppercase font-bold text-verve-brown/70 bg-verve-light px-1.5 py-0.5 rounded ml-2 whitespace-nowrap">
          {{ activityType.name }}
        </span>
      </div>

      <div class="grid grid-cols-3 gap-2 border-t border-verve-medium/20 pt-2 text-verve-brown/80">
        <div>
          <span class="text-sm font-semibold">{{
            activity.distance != null ? activity.distance.toFixed(2) : '-'
            }}</span>
          <span v-if="activity.distance != null" class="text-xs font-normal text-verve-brown/50 ml-0.5">km</span>
        </div>
        <div class="text-center">
          <p class="text-sm font-semibold">{{ activity.duration }}</p>
        </div>
        <div class="text-right">
          <span class="text-sm font-semibold">{{
            activity.elevationGain !== null ? activity.elevationGain.toFixed(0) : '-'
            }}</span>
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
        <p class="font-semibold text-verve-brown/80 text-sm">{{ formatDate(activity.start) }}</p>
        <p class="text-xs text-verve-brown/50">{{ formatTime(activity.start) }}</p>
      </div>

      <!-- Activity Type and Sub-Type -->
      <div class="hidden md:block">
        <p class="text-verve-brown font-semibold text-sm">{{ activityType?.name ?? 'N/A' }}</p>
        <p v-if="activitySubType" class="text-xs text-verve-brown/50">{{ activitySubType.name }}</p>
      </div>

      <!-- Duration -->
      <div>
        <p class="font-bold text-verve-brown">{{ activity.duration }}</p>
        <p class="text-xs text-verve-brown/50 uppercase tracking-wide">Duration</p>
      </div>

      <!-- Distance -->
      <div class="text-right">
        <p class="font-bold text-verve-brown">
          {{ activity.distance != null ? activity.distance.toFixed(2) : '-' }}
          <span v-if="activity.distance" class="text-xs font-normal text-verve-brown/50">km</span>
        </p>
        <p class="text-xs text-verve-brown/50 uppercase tracking-wide">Distance</p>
      </div>
    </div>
  </router-link>
</template>
