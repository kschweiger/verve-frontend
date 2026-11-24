<script setup lang="ts">
import { onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useHighlightStore } from '@/stores/highlights';
import { RANK_COLORS } from '@/utils/colors';

const props = defineProps<{ activityId: string }>();
const highlightStore = useHighlightStore();
const { t, n } = useI18n();

// Helper to get color safely
const getRankColor = (rank: number) => {
  return RANK_COLORS[rank] || '#000000';
};

onMounted(() => {
  highlightStore.fetchHighlightsForActivity(props.activityId);
});
</script>

<template>
  <!-- This component will only render if there are highlights -->
  <div v-if="highlightStore.activityHighlights.length > 0"
    class="bg-white p-6 rounded-xl shadow-sm border border-verve-medium/30">
    <h3 class="text-xl font-bold text-verve-brown mb-4">{{ t('activityHighlights.title') }}</h3>

    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      <div v-for="highlight in highlightStore.activityHighlights" :key="`${highlight.metric}-${highlight.scope}`"
        class="bg-verve-light/20 p-4 rounded-xl text-center border border-verve-medium/10">

        <!-- Rank: Color applied via inline style from config -->
        <p class="font-bold text-lg" :style="{ color: getRankColor(highlight.rank) }">
          {{ t('activityHighlights.place', { rank: n(highlight.rank) }) }}
        </p>

        <p class="text-verve-brown font-bold text-sm mt-1">
          {{ t(`activityHighlights.metrics.${highlight.metric}`) }}
        </p>
        <p class="text-xs text-verve-brown/60 mt-0.5">
          {{
            highlight.scope === 'yearly' && highlight.year !== null
              ? t('activityHighlights.inYear', { year: n(highlight.year, { useGrouping: false }) })
              : t(`activityHighlights.${highlight.scope}`)
          }}
        </p>
      </div>
    </div>
  </div>
</template>
