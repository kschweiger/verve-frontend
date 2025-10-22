<script setup lang="ts">
import { useUserStore } from '@/stores/auth';

const userStore = useUserStore();
</script>

<template>
  <div class="p-8 ">
    <h1 class="text-2xl font-bold">
      Welcome to your dashboard, {{ userStore.user_full_name ?? userStore.user_name }}!
    </h1>
    <p>This is a protected page.</p>
  </div>
</template>
