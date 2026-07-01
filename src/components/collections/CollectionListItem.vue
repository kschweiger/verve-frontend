<script setup lang="ts">
import { computed } from 'vue';
import { Layers } from 'lucide-vue-next';
import type { CollectionOverview } from '@/services/collections';

const props = defineProps<{
  collection: CollectionOverview;
}>();

const dateRange = computed(() => {
  const start = new Date(props.collection.start).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const end = new Date(props.collection.end).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  return start === end ? start : `${start} - ${end}`;
});
</script>

<template>
  <router-link
    :to="{ name: 'collection-detail', params: { id: collection.id } }"
    class="block bg-white border-b border-verve-medium/10 first:rounded-t-xl last:rounded-b-xl p-5 transition-all duration-200 hover:bg-verve-light hover:border-l-4 hover:border-l-verve-orange"
  >
    <div class="grid grid-cols-2 gap-4 md:grid-cols-7 md:items-center">
      <div class="col-span-2 md:col-span-3">
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
        <p class="text-xs font-bold uppercase tracking-wide text-verve-brown/40">Range</p>
      </div>

      <div>
        <p class="font-bold text-verve-brown">{{ collection.count }}</p>
        <p class="text-xs font-bold uppercase tracking-wide text-verve-brown/40">Activities</p>
      </div>

      <div>
        <p class="font-bold text-verve-brown">
          {{ collection.distance !== null ? collection.distance.toFixed(2) : '-' }}
          <span v-if="collection.distance !== null" class="text-xs font-normal text-verve-brown/50">km</span>
        </p>
        <p class="text-xs font-bold uppercase tracking-wide text-verve-brown/40">Distance</p>
      </div>

      <div class="text-left md:text-right">
        <p class="font-bold text-verve-brown">{{ collection.duration }}</p>
        <p class="text-xs font-bold uppercase tracking-wide text-verve-brown/40">Duration</p>
      </div>
    </div>
  </router-link>
</template>
