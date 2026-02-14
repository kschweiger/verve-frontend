<script setup lang="ts">
import { useUserStore } from '@/stores/auth';
import LastActivitiesWidget from '@/components/widgets/LastActivitiesWidget.vue';
import UploadActivityWidget from '@/components/widgets/UploadActivityWidget.vue';
import YearlyStatsWidget from '@/components/widgets/YearlyStatsWidget.vue';
import WeeklyStatsWidget from '@/components/widgets/WeeklyStatsWidget.vue';
import HighlightsWidget from '@/components/widgets/HighlightsWidget.vue';
import CalendarWidget from '@/components/widgets/CalendarWidget.vue';
import GoalsWidget from '@/components/widgets/GoalsWidget.vue';
import QuickAddWidget from '@/components/widgets/QuickAddWidget.vue';

const userStore = useUserStore();
</script>

<template>
  <div class="min-h-full flex flex-col">
    <!-- SECTION 1: White Background (Header & Statistics) -->
    <div class="bg-white pt-8 pb-12 px-4 sm:px-6 lg:px-8 border-b border-verve-medium/20">
      <div class="max-w-7xl mx-auto">
        <!-- Header -->
        <div class="flex justify-between items-end mb-8">
          <div>
            <h1 class="text-3xl font-bold text-verve-brown">
              Welcome back, {{ userStore.user_full_name ?? userStore.user_name }}!
            </h1>
            <p class="text-verve-brown/60 mt-1 font-medium">Highlights & Overview</p>
          </div>
        </div>

        <!-- Top Row: Statistics -->
        <div class="grid grid-cols-1 gap-6">
          <YearlyStatsWidget />
          <WeeklyStatsWidget />
        </div>
      </div>
    </div>

    <!-- SECTION 2: Medium Green Background (Widget Grid) -->
    <div class="bg-verve-medium grow px-4 sm:px-6 lg:px-8 py-8">
      <div class="max-w-7xl mx-auto">
        <!-- Widget Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <CalendarWidget />
          <LastActivitiesWidget />
          <GoalsWidget />

          <HighlightsWidget />
          <UploadActivityWidget />
          <QuickAddWidget />

          <!-- Placeholders -->
          <div
            class="bg-white/50 border-2 border-dashed border-verve-brown/10 rounded-xl shadow-sm h-48 flex items-center justify-center hover:bg-white/60 transition-colors cursor-pointer group">
            <p class="text-verve-brown/40 font-bold group-hover:text-verve-brown/60">
              Future Widget Spot
            </p>
          </div>
          <div
            class="bg-white/50 border-2 border-dashed border-verve-brown/10 rounded-xl shadow-sm h-48 flex items-center justify-center hover:bg-white/60 transition-colors cursor-pointer group">
            <p class="text-verve-brown/40 font-bold group-hover:text-verve-brown/60">
              Future Widget Spot
            </p>
          </div>
        </div>

        <!-- Add Widget Button -->
        <div class="flex justify-center pt-12 pb-4">
          <button
            class="px-6 py-3 bg-verve-neon text-verve-brown font-bold rounded-xl shadow-sm hover:brightness-105 border border-verve-dark/5 transition-all flex items-center gap-2">
            <span class="text-xl leading-none">+</span> Add Widget
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
