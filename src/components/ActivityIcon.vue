<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useTypeStore } from '@/stores/types';

import IconBike from '@/components/icons/sports/IconBike.vue';
import IconRun from '@/components/icons/sports/IconRun.vue';
import IconWinter from '@/components/icons/sports/IconWinter.vue';
import IconSwim from '@/components/icons/sports/IconSwim.vue';
import IconStrength from '@/components/icons/sports/IconStrength.vue';
import IconDefault from '@/components/icons/sports/IconDefault.vue';
import IconCardio from '@/components/icons/sports/IconCardio.vue';

const props = defineProps<{ typeId?: number }>();
const typeStore = useTypeStore();

onMounted(() => {
  typeStore.fetchActivityTypes();
});


const iconCategory = computed(() => {
  if (!props.typeId) return 'default';

  const type = typeStore.activityTypes.find(t => t.id === props.typeId);
  const name = type ? type.name : '';

  switch (name) {
    case 'Cycling':
      return 'bike';
    case 'Foot Sports':
      return 'run';
    case 'Winter Sports':
      return 'winter';
    case 'Swimming':
      return 'swim';
    case 'Strength Training':
      return 'strength';
    case 'Indoor Cardio':
      return "cardio";
    default:
      return 'default';
  }
});
</script>

<template>
  <IconBike v-if="iconCategory === 'bike'" class="w-full h-full" />
  <IconRun v-else-if="iconCategory === 'run'" class="w-full h-full" />
  <IconWinter v-else-if="iconCategory === 'winter'" class="w-full h-full" />
  <IconSwim v-else-if="iconCategory === 'swim'" class="w-full h-full" />
  <IconStrength v-else-if="iconCategory === 'strength'" class="w-full h-full" />
  <IconCardio v-else-if="iconCategory === 'cardio'" class="w-full h-full" />
  <IconDefault v-else class="w-full h-full" />
</template>
