<script setup lang="ts">
import Navbar from '@/components/Navbar.vue';
</script>

<template>
  <div class="min-h-screen bg-gray-100">
    <Navbar />
    <main>
      <!-- The content of our pages (Dashboard, Activities, etc.) will be rendered here -->
      <router-view />
    </main>
  </div>
</template>
