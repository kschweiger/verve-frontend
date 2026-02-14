<script setup lang="ts">
import { onMounted } from 'vue';
import { useActivityStore } from '@/stores/activity';

const activityStore = useActivityStore();

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

    <!-- Success State -->
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
