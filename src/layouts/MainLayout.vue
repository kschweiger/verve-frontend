<script setup lang="ts">
import AppNavbar from '@/components/AppNavbar.vue';
import AppFooter from '@/components/AppFooter.vue';
</script>

<template>
  <div class="min-h-screen bg-verve-light font-sans text-verve-brown">
    <AppNavbar />

    <main>
      <router-view />
    </main>

    <AppFooter />
  </div>
</template>
