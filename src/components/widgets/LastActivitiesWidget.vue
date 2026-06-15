<script setup lang="ts">
import { onMounted } from 'vue';
import { useActivityStore } from '@/stores/activity';

const activityStore = useActivityStore();

onMounted(() => {
  activityStore.fetchRecentActivities();
});
</script>

<template>
  <section class="bg-white rounded-xl shadow-sm border border-verve-medium/30 p-6 h-full">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h3 class="text-xl font-bold text-verve-brown">Recent Activities</h3>
        <p class="text-sm text-verve-brown/60">Latest sessions and imports</p>
      </div>
      <router-link to="/activities" class="text-sm font-bold text-verve-orange hover:text-verve-brown transition">
        View all
      </router-link>
    </div>

    <div v-if="activityStore.isRecentLoading" class="text-center py-8 text-verve-brown/60 text-sm">
      Loading activities...
    </div>

    <div v-else-if="activityStore.recentError" class="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
      Error: {{ activityStore.recentError }}
    </div>

    <div v-else-if="activityStore.recentActivities.length > 0" class="divide-y divide-verve-medium/20">
      <router-link
        v-for="activity in activityStore.recentActivities"
        :key="activity.id"
        :to="{ name: 'activity-detail', params: { id: activity.id } }"
        class="grid grid-cols-[1fr_auto] gap-4 py-3 group"
      >
        <div class="min-w-0">
          <p class="font-bold text-verve-brown text-sm truncate group-hover:text-verve-orange transition-colors">
            {{ activity.name || 'Untitled activity' }}
          </p>
          <p class="text-xs text-verve-brown/60">
            {{ new Date(activity.start).toLocaleDateString() }}
          </p>
        </div>

        <div class="text-right whitespace-nowrap">
          <p class="font-bold text-verve-brown text-sm font-mono">
            {{ activity.duration }}
          </p>
          <p class="text-xs text-verve-brown/60 font-mono">
            <span v-if="activity.distance != null">{{ activity.distance.toFixed(2) }} km</span>
            <span v-else>No distance</span>
          </p>
        </div>
      </router-link>
    </div>

    <div v-else class="text-center py-8 text-verve-brown/60 text-sm italic">
      No recent activities found.
    </div>
  </section>
</template>
