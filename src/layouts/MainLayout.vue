<script setup lang="ts">
import Navbar from '@/components/Navbar.vue';
import Footer from '@/components/Footer.vue';
</script>

<template>
  <div class="min-h-screen bg-verve-light font-sans text-verve-brown">
    <Navbar />

    <main>
      <router-view />
    </main>

    <Footer />
  </div>
</template>
