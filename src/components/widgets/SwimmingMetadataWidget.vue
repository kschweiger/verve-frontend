<script setup lang="ts">
import { computed, ref } from 'vue';
import type { SwimmingMetaData, SwimmingSetMeta } from '@/activityMetadata/swimming';
import { Info } from 'lucide-vue-next';

const props = defineProps<{
  metadata: SwimmingMetaData;
}>();

const activeStyle = ref<string | null>(null);
const swolfDescription =
  'SWOLF is swim golf: length time in seconds plus stroke count. Lower is better for the same pool length.';

const formatNumber = (value: number | undefined, digits = 0): string =>
  value === undefined ? '-' : value.toFixed(digits);

const formatMeters = (value: number | undefined): string =>
  value === undefined ? '-' : `${formatNumber(value)} m`;

const formatSeconds = (value: number | undefined): string => {
  if (value === undefined) return '-';

  const totalSeconds = Math.round(value);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
};

const formatStyle = (style: string | undefined): string => {
  if (!style) return '-';
  return style
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const lapRange = (set: SwimmingSetMeta): string => {
  if (set.lapCount !== undefined) return formatNumber(set.lapCount);
  if (set.lapStartIndex !== undefined && set.lapEndIndex !== undefined) {
    return `${set.lapStartIndex + 1}-${set.lapEndIndex + 1}`;
  }
  return '-';
};

const toggleStyle = (style: string) => {
  activeStyle.value = activeStyle.value === style ? null : style;
};

const filteredSets = computed(() => {
  if (activeStyle.value === null) return props.metadata.sets;
  return props.metadata.sets.filter((set) => set.style === activeStyle.value);
});

const statCards = computed(() => [
  {
    label: 'Pool',
    value: formatMeters(props.metadata.poolLengthMeters),
  },
  {
    label: 'Laps',
    value: formatNumber(props.metadata.lapCount),
  },
  {
    label: 'Sets',
    value: formatNumber(props.metadata.setCount),
  },
  {
    label: 'Strokes',
    value: formatNumber(props.metadata.totalStrokeCount),
  },
  {
    label: 'Avg SWOLF',
    value: formatNumber(props.metadata.averageSwolf, 1),
  },
]);
</script>

<template>
  <section class="bg-white p-6 rounded-xl shadow-sm border border-verve-medium/30">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 class="text-xl font-bold text-verve-brown">Swimming</h2>
      </div>

      <div v-if="metadata.styles.length > 0" class="flex flex-wrap gap-2">
        <button
          v-for="style in metadata.styles"
          :key="style"
          type="button"
          class="rounded-lg border px-3 py-1 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-verve-orange/30"
          :class="
            activeStyle === style
              ? 'border-verve-brown bg-verve-brown text-white'
              : 'border-verve-medium/40 bg-verve-light/40 text-verve-brown hover:bg-verve-medium/40'
          "
          :aria-pressed="activeStyle === style"
          @click="toggleStyle(style)"
        >
          {{ formatStyle(style) }}
        </button>
      </div>
    </div>

    <div class="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
      <div v-for="card in statCards" :key="card.label" class="rounded-lg bg-verve-light/20 p-4 text-center">
        <p class="text-2xl font-bold text-verve-brown">{{ card.value }}</p>
        <p class="mt-1 inline-flex items-center justify-center gap-1 text-xs font-bold uppercase tracking-wider text-verve-brown/50">
          {{ card.label }}
          <span v-if="card.label === 'Avg SWOLF'" class="group relative inline-flex">
            <button
              type="button"
              class="rounded-full text-verve-brown/40 transition-colors hover:text-verve-brown focus:outline-none focus:ring-2 focus:ring-verve-orange/30"
              :aria-label="swolfDescription"
            >
              <Info class="size-3.5" />
            </button>
            <span
              class="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-56 -translate-x-1/2 rounded-lg bg-verve-brown px-3 py-2 text-left text-xs font-medium normal-case tracking-normal text-white shadow-lg group-focus-within:block group-hover:block"
            >
              {{ swolfDescription }}
            </span>
          </span>
        </p>
      </div>
    </div>

    <div v-if="metadata.sets.length > 0" class="mt-6">
      <h3 class="text-sm font-bold uppercase tracking-wider text-verve-brown/50">Sets</h3>
      <div class="mt-3 overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="border-b border-verve-medium/30 text-left text-xs font-bold uppercase tracking-wider text-verve-brown/50">
              <th class="py-3 pr-4">#</th>
              <th class="px-4 py-3">Distance</th>
              <th class="px-4 py-3">Duration</th>
              <th class="px-4 py-3">Laps</th>
              <th class="px-4 py-3">Style</th>
              <th class="px-4 py-3">Strokes</th>
              <th class="px-4 py-3">Avg SWOLF</th>
              <th class="py-3 pl-4">Rest</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-verve-medium/20">
            <tr v-for="set in filteredSets" :key="set.index" class="text-verve-brown">
              <td class="py-3 pr-4 font-semibold">{{ set.index + 1 }}</td>
              <td class="px-4 py-3">{{ formatMeters(set.distanceMeters) }}</td>
              <td class="px-4 py-3">{{ formatSeconds(set.durationSeconds) }}</td>
              <td class="px-4 py-3">{{ lapRange(set) }}</td>
              <td class="px-4 py-3">{{ formatStyle(set.style) }}</td>
              <td class="px-4 py-3">{{ formatNumber(set.strokeCount) }}</td>
              <td class="px-4 py-3 font-semibold">{{ formatNumber(set.averageSwolf, 1) }}</td>
              <td class="py-3 pl-4">{{ formatSeconds(set.restAfterSeconds) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="filteredSets.length === 0 && activeStyle !== null" class="mt-4 text-sm text-verve-brown/50 italic">
        No sets for {{ formatStyle(activeStyle) }}.
      </p>
    </div>
  </section>
</template>
