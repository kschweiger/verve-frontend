<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { Layers } from '@lucide/vue';
import type { CollectionOverview } from '@/services/collections';
import { formatDuration } from '@/utils/datetime';

const props = defineProps<{
  collection: CollectionOverview;
}>();

const { t, n, locale } = useI18n();
const dateRange = computed(() => {
  const date = new Intl.DateTimeFormat(locale.value, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const start = date.format(new Date(props.collection.start));
  const end = date.format(new Date(props.collection.end));
  return start === end ? start : `${start} - ${end}`;
});
</script>

<template>
  <router-link
    :to="{ name: 'collection-detail', params: { id: collection.id } }"
    class="block bg-white border-b border-verve-medium/10 first:rounded-t-xl last:rounded-b-xl p-5 transition-all duration-200 hover:bg-verve-light hover:border-l-4 hover:border-l-verve-orange"
  >
    <div class="grid grid-cols-2 gap-4 md:grid-cols-4 md:items-center lg:grid-cols-8">
      <div class="col-span-2 md:col-span-2 lg:col-span-3">
        <div class="flex items-start gap-3">
          <div class="mt-1 flex size-9 shrink-0 items-center justify-center rounded-lg bg-verve-light text-verve-brown">
            <Layers class="size-5" />
          </div>
          <div class="min-w-0">
            <p class="truncate text-lg font-bold leading-tight text-verve-brown">
              {{ collection.name }}
            </p>
            <p class="mt-1 truncate text-sm text-verve-brown/60">
              {{ collection.description || dateRange }}
            </p>
          </div>
        </div>
      </div>

      <div>
        <p class="text-sm font-semibold text-verve-brown/80">{{ dateRange }}</p>
        <p class="text-xs font-bold uppercase tracking-wide text-verve-brown/40">{{ t('collections.range') }}</p>
      </div>

      <div>
        <p class="font-bold text-verve-brown">{{ n(collection.count) }}</p>
        <p class="text-xs font-bold uppercase tracking-wide text-verve-brown/40">{{ t('collections.activities') }}</p>
      </div>

      <div>
        <p class="font-bold text-verve-brown">
          {{ collection.distance === null ? '-' : n(collection.distance, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
          <span v-if="collection.distance !== null" class="text-xs font-normal text-verve-brown/50">km</span>
        </p>
        <p class="text-xs font-bold uppercase tracking-wide text-verve-brown/40">{{ t('collections.distance') }}</p>
      </div>

      <div class="text-left md:text-right">
        <p class="font-bold text-verve-brown">{{ formatDuration(collection.effectiveDurationSeconds, locale) }}</p>
        <p class="text-xs font-bold uppercase tracking-wide text-verve-brown/40">{{ t('collections.active') }}</p>
      </div>

      <div class="text-left md:text-right">
        <p class="font-bold text-verve-brown">{{ formatDuration(collection.durationSeconds, locale) }}</p>
        <p class="text-xs font-bold uppercase tracking-wide text-verve-brown/40">{{ t('collections.total') }}</p>
        <p v-if="collection.pauseDurationSeconds !== null" class="text-[10px] text-verve-brown/45">
          {{ t('collections.pauseSummary', { duration: formatDuration(collection.pauseDurationSeconds, locale) }) }}
        </p>
      </div>
    </div>
  </router-link>
</template>
