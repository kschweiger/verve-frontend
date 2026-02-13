<script setup lang="ts">
import { computed } from 'vue';
import { useTypeStore } from '@/stores/types';
// Import only the icons you need
import {
  Bike,
  Footprints,
  Snowflake,
  Waves,
  Dumbbell,
  HeartPulse,
  Rocket
} from 'lucide-vue-next';

const props = defineProps<{
  typeId?: number;
  size?: number | string; // Optional: control size via props
}>();

const typeStore = useTypeStore();

const iconComponent = computed(() => {
  if (!props.typeId) return Rocket;

  const type = typeStore.activityTypes.find(t => t.id === props.typeId);
  const name = type?.name || '';

  // Clean mapping logic
  switch (name) {
    case 'Cycling': return Bike;
    case 'Foot Sports': return Footprints;
    case 'Winter Sports': return Snowflake;
    case 'Swimming': return Waves;
    case 'Strength Training': return Dumbbell;
    case 'Indoor Cardio': return HeartPulse;
    default: return Rocket;
  }
});
</script>

<template>
  <!--
    size-full is Tailwind v4 shorthand for h-full w-full
    stroke-2 sets a consistent line weight
  -->
  <component :is="iconComponent" class="size-full stroke-2" :size="size" />
</template>
