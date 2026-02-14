<script setup lang="ts">
import Navbar from '@/components/Navbar.vue';
import Footer from '@/components/Footer.vue';
</script>

<template>
  <div class="min-h-screen flex flex-col bg-verve-light font-sans text-verve-brown">
    <Navbar />

    <main class="grow">
      <router-view />
    </main>

    <Footer />
  </div>
</template>
