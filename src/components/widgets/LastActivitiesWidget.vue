<script setup lang="ts">
import { onMounted } from 'vue';
import { useActivityStore, type Activity } from '@/stores/activity';
import { useTypeStore } from '@/stores/types';

const activityStore = useActivityStore();
const typeStore = useTypeStore();

const getActivityTitle = (activity: Activity): string => {
  // 1. Find the main type object.
  const foundType = typeStore.activityTypes.find(t => t.id === activity.type_id);

  // If no main type is found at all, return a generic fallback.
  if (!foundType) {
    return 'Activity';
  }

  // 2. Check if a sub-type ID exists and if the found type has sub-types to search.
  if (activity.sub_type_id && foundType.sub_types) {
    const foundSubType = foundType.sub_types.find(st => st.id === activity.sub_type_id);

    // 3. If we found a matching sub-type, return the combined "Type: Subtype" string.
    if (foundSubType) {
      return `${foundType.name}: ${foundSubType.name}`;
    }
  }

  // 4. If no sub_type_id was present, or if a matching sub_type wasn't found,
  //    just return the main type's name as a fallback.
  return foundType.name;
};
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
          <router-link :to="{ name: 'activity-detail', params: { id: activity.id } }" class="block group">
            <div class="flex justify-between items-center">
              <div>
                <p class="font-semibold text-gray-700 group-hover:text-indigo-600">
                  <!-- {{ getActivityTitle(activity) }} -->
                  {{ activity.name }}
                </p>
                <p class="text-sm text-gray-500">
                  {{ new Date(activity.start).toLocaleDateString() }}
                </p>
              </div>
              <div class="text-right">
                <p class="font-semibold text-gray-700">
                  {{ activity.distance != null ? activity.distance.toFixed(2) : '-' }} <span
                    v-if="activity.distance != null" class="text-xs">km</span> </p>
                <p class="text-sm text-gray-500">
                  {{ activity.duration }}
                </p>
              </div>
            </div>
          </router-link>
        </li>
      </ul>
    </div> <!-- Success State (no activities) -->
    <div v-else>
      <p class="text-gray-500">No recent activities found. Go record one!</p>
    </div>
  </div>
</template>
