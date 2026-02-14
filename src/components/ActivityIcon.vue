<script setup lang="ts">
import { computed } from 'vue';
import { useTypeStore } from '@/stores/types';
import {
  Bike,
  Footprints,
  Snowflake,
  Waves,
  Dumbbell,
  HeartPulse,
  Rocket,
} from 'lucide-vue-next';

const props = defineProps<{
  typeId?: number;
  // Restricted to number to match strict Lucide type definitions in your environment
  size?: number;
}>();

const typeStore = useTypeStore();

const iconComponent = computed(() => {
  if (!props.typeId) return Rocket;

  const type = typeStore.activityTypes.find((t) => t.id === props.typeId);
  const name = type?.name || '';

  switch (name) {
    case 'Cycling':
      return Bike;
    case 'Foot Sports':
      return Footprints;
    case 'Winter Sports':
      return Snowflake;
    case 'Swimming':
      return Waves;
    case 'Strength Training':
      return Dumbbell;
    case 'Indoor Cardio':
      return HeartPulse;
    default:
      return Rocket;
  }
});
</script>

<template>
  <!--
    size-full uses Tailwind v4 to fill the container.
    stroke-2 ensures consistent line weight.
  -->
  <component :is="iconComponent" class="size-full stroke-2" :size="size" />
</template>
