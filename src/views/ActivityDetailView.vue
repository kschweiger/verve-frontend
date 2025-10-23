<script setup lang="ts">
// Because we set `props: true` in the router, we can define the 'id' parameter as a prop.
defineProps<{
  id: string;
}>();
</script>

<template>
  <div class="p-8">
    <div class="max-w-7xl mx-auto">
      <h1 class="text-2xl font-bold">Activity Detail Page</h1>
      <p class="mt-4">
        Showing details for Activity ID:
        <span class="font-mono bg-gray-200 p-1 rounded">{{ id }}</span>
      </p>
      <p class="mt-4">The map and detailed stats will be built here later.</p>
    </div>
  </div>
</template>
