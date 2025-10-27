<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useActivityStore } from '@/stores/activity';
import type { ActivityFilters } from '@/stores/activity';
import ActivityFilter from '@/components/ActivityFilter.vue';
import ActivityListItem from '@/components/ActivityListItem.vue';

const activityStore = useActivityStore();
const initialFilters = ref<ActivityFilters>({});

function loadMoreActivities() {
  // The 'true' flag tells the action to append data, not replace it
  activityStore.fetchActivities(activityStore.currentFilters, true);
}

// Initial fetch when the component is first created
onMounted(() => {
  // Only fetch if the list is empty, otherwise we keep the existing state
  if (activityStore.paginatedActivities.length === 0) {
    activityStore.fetchActivities({});
  }
});

// Optional but good practice: Reset the list when the user navigates away from the page
// so they get a fresh list next time.
onUnmounted(() => {
  // You could clear the list here if you always want a fresh start
  // activityStore.paginatedActivities = [];
});
</script>

<template>
  <div class="p-4 sm:p-6 lg:p-8">
    <div class="max-w-7xl mx-auto">
      <h1 class="text-3xl font-bold text-gray-900 mb-6">My Activities</h1>

      <!-- The Filter Component -->
      <ActivityFilter :initial-filters="initialFilters" @filter-change="activityStore.fetchActivities($event, false)" />
      <!-- Error Display -->
      <div v-if="activityStore.listError" class="mt-6 p-4 bg-red-100 text-red-700 rounded-md">
        <p>Error loading activities: {{ activityStore.listError }}</p>
      </div>

      <!-- The Activity List -->
      <div v-else class="mt-6 bg-white rounded-lg shadow-md overflow-hidden">
        <ul v-if="activityStore.paginatedActivities.length > 0">
          <li v-for="activity in activityStore.paginatedActivities" :key="activity.id" class="border-b last:border-b-0">
            <ActivityListItem :activity="activity" />
          </li>
        </ul>
        <div v-else-if="!activityStore.isListLoading" class="p-6 text-center text-gray-500">
          <p>No activities found matching your criteria.</p>
        </div>
      </div>

      <!-- Loading State & Load More Button -->
      <div class="mt-6 text-center">
        <div v-if="activityStore.isListLoading" class="py-4">
          <p class="text-gray-500">Loading...</p>
        </div>
        <button v-else-if="activityStore.canLoadMore" @click="loadMoreActivities"
          class="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-md shadow-md hover:bg-indigo-700 transition">
          Load More
        </button>
        <p v-else-if="activityStore.paginatedActivities.length > 0" class="py-4 text-gray-500">
          End of list.
        </p>
      </div>
    </div>
  </div>
</template>
