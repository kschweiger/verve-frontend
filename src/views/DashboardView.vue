<script setup lang="ts">
import { useUserStore } from '@/stores/auth';
import AddActivityPanel from '@/components/dashboard/AddActivityPanel.vue';
import DashboardOverviewStrip from '@/components/dashboard/DashboardOverviewStrip.vue';
import ActivityGridWidget from '@/components/widgets/ActivityGridWidget.vue';
import LastActivitiesWidget from '@/components/widgets/LastActivitiesWidget.vue';
import HighlightsWidget from '@/components/widgets/HighlightsWidget.vue';
import GoalsWidget from '@/components/widgets/GoalsWidget.vue';

const userStore = useUserStore();
</script>

<template>
  <div class="bg-verve-medium">
    <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
        <div>
          <h1 class="text-3xl font-bold text-verve-brown">
            Welcome back, {{ userStore.user_full_name ?? userStore.user_name }}!
          </h1>
          <p class="text-verve-brown/60 mt-1 font-medium">Activity overview</p>
        </div>

        <AddActivityPanel />
      </header>

      <div class="space-y-6">
        <ActivityGridWidget />
        <DashboardOverviewStrip />

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2">
            <LastActivitiesWidget />
          </div>

          <div class="space-y-6">
            <GoalsWidget />
            <HighlightsWidget />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
