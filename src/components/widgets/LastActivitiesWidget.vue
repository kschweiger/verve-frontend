<script setup lang="ts">
import { onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useDashboardLoadError } from '@/composables/useDashboardLoadError';
import { useActivityStore } from '@/stores/activity';
import { formatDuration } from '@/utils/datetime';

const activityStore = useActivityStore();
const { t, n, locale } = useI18n();
const formatLoadError = useDashboardLoadError();

onMounted(() => {
  activityStore.fetchRecentActivities();
});
</script>

<template>
  <section class="bg-white rounded-xl shadow-sm border border-verve-medium/30 p-6 h-full">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h3 class="text-xl font-bold text-verve-brown">{{ t('dashboard.recent.title') }}</h3>
        <p class="text-sm text-verve-brown/60">{{ t('dashboard.recent.subtitle') }}</p>
      </div>
      <router-link to="/activities" class="text-sm font-bold text-verve-orange hover:text-verve-brown transition">
        {{ t('dashboard.recent.viewAll') }}
      </router-link>
    </div>

    <div v-if="activityStore.isRecentLoading" class="text-center py-8 text-verve-brown/60 text-sm">
      {{ t('dashboard.recent.loading') }}
    </div>

    <div v-else-if="activityStore.recentError" class="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
      {{ formatLoadError('recent', activityStore.recentError) }}
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
            {{ activity.name || t('dashboard.recent.untitled') }}
          </p>
          <p class="text-xs text-verve-brown/60">
            {{ new Date(activity.start).toLocaleDateString(locale) }}
          </p>
        </div>

        <div class="text-right whitespace-nowrap">
          <p class="font-bold text-verve-brown text-sm font-mono">
            {{ formatDuration(activity.effectiveDurationSeconds, locale) }}
          </p>
          <p
            v-if="activity.durationSeconds !== activity.effectiveDurationSeconds"
            class="text-[10px] text-verve-brown/45 font-mono"
          >
            {{ t('dashboard.recent.totalDuration', { duration: formatDuration(activity.durationSeconds, locale) }) }}
          </p>
          <p class="text-xs text-verve-brown/60 font-mono">
            <span v-if="activity.distance != null">{{ n(activity.distance, {
              style: 'unit', unit: 'kilometer', unitDisplay: 'short', minimumFractionDigits: 2, maximumFractionDigits: 2,
            }) }}</span>
            <span v-else>{{ t('dashboard.recent.noDistance') }}</span>
          </p>
        </div>
      </router-link>
    </div>

    <div v-else class="text-center py-8 text-verve-brown/60 text-sm italic">
      {{ t('dashboard.recent.empty') }}
    </div>
  </section>
</template>
