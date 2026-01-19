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
  <div class="bg-white rounded-xl shadow-sm border border-verve-medium/30 p-6 h-full">
    <h3 class="text-xl font-bold text-verve-brown mb-4">Recent Activities</h3>

    <!-- Loading State -->
    <div v-if="activityStore.isRecentLoading" class="text-center py-8 text-verve-brown/60 text-sm">
      Loading activities...
    </div>

    <!-- Error State -->
    <div v-else-if="activityStore.recentError" class="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
      Error: {{ activityStore.recentError }}
    </div>

    <!-- Success State (with activities) -->
    <div v-else-if="activityStore.recentActivities.length > 0" class="space-y-1">
      <router-link v-for="activity in activityStore.recentActivities" :key="activity.id"
        :to="{ name: 'activity-detail', params: { id: activity.id } }"
        class="block group p-3 rounded-xl hover:bg-verve-light/50 border border-transparent hover:border-verve-medium/30 transition-all">
        <div class="flex justify-between items-center">

          <!-- Left: Name & Date -->
          <div class="overflow-hidden pr-2">
            <p class="font-bold text-verve-brown text-sm truncate group-hover:text-verve-orange transition-colors">
              {{ activity.name }}
            </p>
            <p class="text-xs text-verve-brown/60">
              {{ new Date(activity.start).toLocaleDateString() }}
            </p>
          </div>

          <!-- Right: Stats -->
          <div class="text-right whitespace-nowrap">
            <p class="font-bold text-verve-brown text-sm">
              {{ activity.distance != null ? activity.distance.toFixed(2) : '-' }}
              <span v-if="activity.distance != null" class="text-[10px] font-normal text-verve-brown/60">km</span>
            </p>
            <p class="text-xs text-verve-brown/60 font-mono">
              {{ activity.duration }}
            </p>
          </div>

        </div>
      </router-link>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-8 text-verve-brown/60 text-sm italic">
      No recent activities found. Go record one!
    </div>
  </div>
</template>
