<script setup lang="ts">
import { computed } from 'vue';
import type { Activity } from '@/stores/activity';
import { useTypeStore } from '@/stores/types';

// Get an instance of the type store to access the list of all types
const typeStore = useTypeStore();

// This component receives a single 'activity' object as a prop
const props = defineProps<{
  activity: Activity;
  compact?: boolean; // <--- New Prop
}>();

// --- TYPE NAME LOOKUP LOGIC ---

// A computed property to find the full ActivityType object based on the activity's type_id
const activityType = computed(() => {
  // Find the type object in the store's array that matches our activity's type_id
  return typeStore.activityTypes.find(t => t.id === props.activity.type_id);
});

// A computed property to find the SubType object
const activitySubType = computed(() => {
  // First, make sure we found a main type and that our activity has a sub_type_id
  if (!activityType.value || !props.activity.sub_type_id) {
    return null;
  }
  // Then, find the sub-type within that main type's sub_types array
  return activityType.value.sub_types.find(st => st.id === props.activity.sub_type_id);
});


// --- FORMATTING HELPERS (Unchanged) ---
const formatDate = (isoDate: string) => {
  return new Date(isoDate).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
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
    class="block transition duration-150 ease-in-out hover:bg-gray-50" :class="compact ? 'p-3' : 'p-4'">

    <!-- COMPACT LAYOUT (For Sidebar/Widgets) -->
    <div v-if="compact">
      <!-- Row 1: Header -->
      <div class="flex justify-between items-start mb-2">
        <div class="overflow-hidden">
          <p class="font-bold text-gray-800 text-sm truncate">{{ activity.name }}</p>
          <p class="text-xs text-gray-500">{{ formatDate(activity.start) }} &bull; {{ formatTime(activity.start) }}</p>
        </div>
        <!-- Optional: Type Badge -->
        <span v-if="activityType"
          class="text-[10px] uppercase font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded ml-2 whitespace-nowrap">
          {{ activityType.name }}
        </span>
      </div>

      <!-- Row 2: Stats Grid -->
      <div class="grid grid-cols-3 gap-2 border-t border-gray-100 pt-2">
        <div>
          <p class="text-sm font-semibold text-gray-700">{{ (activity.distance).toFixed(2) }} <span
              class="text-xs font-normal text-gray-500">km</span></p>
        </div>
        <div class="text-center">
          <p class="text-sm font-semibold text-gray-700">{{ activity.duration }}</p>
        </div>
        <div class="text-right">
          <p class="text-sm font-semibold text-gray-700">
            {{ activity.elevationGain !== null ? activity.elevationGain.toFixed(0) : '-' }} <span
              class="text-xs font-normal text-gray-500">m</span>
          </p>
        </div>
      </div>
    </div>

    <!-- STANDARD LAYOUT (Existing) -->
    <div v-else class="grid grid-cols-2 md:grid-cols-6 gap-4 items-center">
      <!-- Activity Name -->
      <div>
        <p class="font-semibold text-gray-800">{{ activity.name }}</p>
      </div>

      <!-- Date and Time -->
      <div class="col-span-2 md:col-span-1">
        <p class="font-semibold text-gray-800">{{ formatDate(activity.start) }}</p>
        <p class="text-sm text-gray-500">{{ formatTime(activity.start) }}</p>
      </div>

      <!-- Activity Type and Sub-Type -->
      <div class="hidden md:block">
        <p class="text-gray-700 font-semibold">{{ activityType?.name ?? 'N/A' }}</p>
        <p v-if="activitySubType" class="text-sm text-gray-500">{{ activitySubType.name }}</p>
      </div>

      <!-- Duration -->
      <div>
        <p class="font-semibold text-gray-800">{{ activity.duration }}</p>
        <p class="text-sm text-gray-500">Duration</p>
      </div>

      <!-- Elevation -->
      <div class="text-right">
        <p class="font-semibold text-gray-800">
          {{ activity.elevationGain !== null ? activity.elevationGain.toFixed(0) + ' m' : 'N/A' }}
        </p>
        <p class="text-sm text-gray-500">Elevation Gain</p>
      </div>

      <!-- Distance -->
      <div class="text-right">
        <p class="font-semibold text-gray-800">{{ (activity.distance).toFixed(2) }} km</p>
        <p class="text-sm text-gray-500">Distance</p>
      </div>
    </div>
  </router-link>
</template>
