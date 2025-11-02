<script setup lang="ts">
import { computed } from 'vue';
import type { Activity } from '@/stores/activity';
import { useTypeStore } from '@/stores/types';

// Get an instance of the type store to access the list of all types
const typeStore = useTypeStore();

// This component receives a single 'activity' object as a prop
const props = defineProps<{
  activity: Activity;
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
    class="block p-4 transition duration-150 ease-in-out hover:bg-gray-50">
    <div class="grid grid-cols-2 md:grid-cols-6 gap-4 items-center">
      <!-- Activity Name -->
      <div>
        <p class="font-semibold text-gray-800">{{ activity.name }}</p>
        <!-- <p class="text-sm text-gray-500">Name</p> -->
      </div>

      <!-- Date and Time -->
      <div class="col-span-2 md:col-span-1">
        <p class="font-semibold text-gray-800">{{ formatDate(activity.start) }}</p>
        <p class="text-sm text-gray-500">{{ formatTime(activity.start) }}</p>
      </div>

      <!-- Activity Type and Sub-Type -->
      <div class="hidden md:block">
        <!--
          Use optional chaining (?.) to safely access the name.
          If activityType is not found, it will display nothing instead of crashing.
        -->
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
        <!-- Your distance is already in meters from the API, we need to convert to km -->
        <p class="font-semibold text-gray-800">{{ (activity.distance).toFixed(2) }} km</p>
        <p class="text-sm text-gray-500">Distance</p>
      </div>
    </div>
  </router-link>
</template>/template>
