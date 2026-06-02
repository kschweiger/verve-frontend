<script setup lang="ts">
import { computed, type Component } from 'vue';
import type { ActivityMetadataKind, ParsedActivityMetadata } from '@/activityMetadata/types';
import SwimmingMetadataWidget from './SwimmingMetadataWidget.vue';

const props = defineProps<{
  metadata: ParsedActivityMetadata;
}>();

const components = {
  swimming: SwimmingMetadataWidget,
} satisfies Record<ActivityMetadataKind, Component>;

const component = computed<Component>(() => components[props.metadata.kind]);
</script>

<template>
  <component :is="component" :metadata="metadata.data" />
</template>
