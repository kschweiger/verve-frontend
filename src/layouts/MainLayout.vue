<script setup lang="ts">
import Navbar from '@/components/Navbar.vue';
import Footer from '@/components/Footer.vue';
</script>

<template>
  <div class="min-h-screen flex flex-col bg-verve-light font-sans text-verve-brown">
    <Navbar />

    <main class="flex-grow">
      <!--
        The Dashboard mockup specifically uses the Medium Green background.
        We can apply a wrapper here, or let individual views control their full-bleed background.
        For now, standard padding here.
      -->
      <router-view />
    </main>

    <Footer />
  </div>
</template>
