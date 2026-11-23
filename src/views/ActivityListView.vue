<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useActivityStore } from '@/stores/activity';
import type { ActivityFilters } from '@/stores/activity';
import ActivityFilter from '@/components/ActivityFilter.vue';
import ActivityListItem from '@/components/ActivityListItem.vue';

const activityStore = useActivityStore();
const { t } = useI18n();
const initialFilters = ref<ActivityFilters>({});

const listError = computed(() => {
  const failure = activityStore.listFailure;
  if (!failure) return null;
  if (failure.kind === 'unauthenticated') return t('activities.list.notAuthenticated');
  return failure.detail
    ? t('activities.list.loadErrorDetail', { detail: failure.detail })
    : t('activities.list.loadError');
});

function loadMoreActivities() {
  activityStore.fetchActivities(activityStore.currentFilters, true);
}

onMounted(() => {
  if (activityStore.paginatedActivities.length === 0) {
    activityStore.fetchActivities({});
  }
});
</script>

<template>
  <div class="p-4 sm:p-6 lg:p-8 bg-verve-medium min-h-[calc(100vh-64px)]">
    <div class="max-w-7xl mx-auto">
      <h1 class="text-3xl font-bold text-verve-brown mb-6">{{ t('activities.list.title') }}</h1>

      <!-- The Filter Component -->
      <ActivityFilter :initial-filters="initialFilters" @filter-change="activityStore.fetchActivities($event, false)" />

      <!-- Error Display -->
      <div v-if="listError" role="alert" class="mt-6 p-4 bg-red-100 text-red-700 rounded-xl">
        <p>{{ listError }}</p>
      </div>

      <!-- The Activity List -->
      <div v-else class="mt-6">
        <ul v-if="activityStore.paginatedActivities.length > 0" class="space-y-1">
          <li v-for="activity in activityStore.paginatedActivities" :key="activity.id">
            <ActivityListItem :activity="activity" />
          </li>
        </ul>
        <div v-else-if="!activityStore.isListLoading" class="p-12 text-center text-verve-brown/50 bg-white">
          <p class="text-lg">{{ t('activities.list.empty') }}</p>
        </div>
      </div>

      <!-- Loading State & Load More Button -->
      <div class="mt-8 text-center pb-8">
        <div v-if="activityStore.isListLoading" class="py-4 text-verve-brown/60">
          <span class="animate-pulse">{{ t('activities.list.loading') }}</span>
        </div>
        <button v-else-if="activityStore.canLoadMore" @click="loadMoreActivities"
          class="px-8 py-3 bg-verve-brown text-white font-bold rounded-xl shadow-md hover:bg-verve-brown/90 transition-all">
          {{ t('activities.list.loadMore') }}
        </button>
        <p v-else-if="activityStore.paginatedActivities.length > 0" class="py-4 text-verve-brown/40 italic">
          {{ t('activities.list.allLoaded') }}
        </p>
      </div>
    </div>
  </div>
</template>
