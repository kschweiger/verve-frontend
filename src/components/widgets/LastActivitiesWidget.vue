<script setup lang="ts">
import { onMounted } from 'vue';
import { useActivityStore } from '@/stores/activity';

const activityStore = useActivityStore();

// The `onMounted` hook is a perfect place to trigger an initial data fetch
// when the component is first added to the page.
onMounted(() => {
  activityStore.fetchRecentActivities();
});
</script>

<template>
  <div class="bg-white rounded-lg shadow-md p-6">
    <h3 class="text-xl font-bold text-gray-800 mb-4">Recent Activities</h3>

    <!-- Loading State -->
    <div v-if="activityStore.isRecentLoading">
      <p class="text-gray-500">Loading activities...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="activityStore.recentError">
      <p class="text-red-500">Error: {{ activityStore.recentError }}</p>
    </div>

    <!-- Success State (with activities) -->
    <div v-else-if="activityStore.recentActivities.length > 0" class="space-y-4">
      <ul>
        <li v-for="activity in activityStore.recentActivities" :key="activity.id" class="border-b last:border-b-0 py-2">
          <!--
            Use <router-link> for internal navigation. This prevents a full page reload.
            We bind the `:to` prop to an object to create a link to a named route with params.
          -->
          <router-link :to="{ name: 'activity-detail', params: { id: activity.id } }" class="block group">
            <div class="flex justify-between items-center">
              <div>
                <p class="font-semibold text-gray-700 group-hover:text-indigo-600">
                  {{ new Date(activity.start).toLocaleDateString() }}
                </p>
                <p class="text-sm text-gray-500">
                  Duration: {{ activity.duration }}
                </p>
              </div>
              <div class="text-right">
                <p class="font-semibold text-gray-700">
                  {{ activity.distance.toFixed(2) }} km
                </p>
              </div>
            </div>
          </router-link>
        </li>
      </ul>
    </div>

    <!-- Success State (no activities) -->
    <div v-else>
      <p class="text-gray-500">No recent activities found. Go record one!</p>
    </div>
  </div>
</template>
