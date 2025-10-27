<script setup lang="ts">
import { useUserStore } from '@/stores/auth';
import LastActivitiesWidget from '@/components/widgets/LastActivitiesWidget.vue';
import UploadActivityWidget from '@/components/widgets/UploadActivityWidget.vue';
import YearlyStatsWidget from '@/components/widgets/YearlyStatsWidget.vue';
const userStore = useUserStore();
</script>

<template>
  <div class="p-4 sm:p-6 lg:p-8">
    <div class="max-w-7xl mx-auto">
      <h1 class="text-3xl font-bold text-gray-900 mb-6">
        Welcome back, {{ userStore.user_full_name ?? userStore.user_name }}!
      </h1>

      <!--
        Responsive Widget Grid:
        - `grid`: Enables grid layout.
        - `grid-cols-1`: Default is 1 column (for mobile).
        - `md:grid-cols-2`: On medium screens and up, switch to 2 columns.
        - `lg:grid-cols-3`: On large screens and up, switch to 3 columns.
        - `gap-6`: Adds a nice space between grid items.
      -->
      <div class="mb-6">
        <YearlyStatsWidget />
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <!-- Add your widgets here -->
        <UploadActivityWidget />
        <LastActivitiesWidget />

        <!-- Placeholder for future widgets -->
        <div class="bg-white rounded-lg shadow-md p-6 h-48 flex items-center justify-center">
          <p class="text-gray-400">Future Widget Spot</p>
        </div>
        <div class="bg-white rounded-lg shadow-md p-6 h-48 flex items-center justify-center">
          <p class="text-gray-400">Future Widget Spot</p>
        </div>
      </div>
    </div>
  </div>
</template>
