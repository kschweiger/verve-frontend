<script setup lang="ts">
import logo from '@/assets/logo.svg';
</script>

<template>
  <footer class="bg-verve-light border-t border-verve-medium/30 pt-12 pb-8 mt-auto">
    <div class="container mx-auto px-6">
      <div class="flex flex-col md:flex-row justify-between items-start gap-8">

        <!-- Branding Column -->
        <div class="flex flex-col items-start">
          <img :src="logo" alt="Verve Active" class="h-12 w-auto mb-4" />
          <!-- Socials hidden as per original -->
        </div>

        <!-- Links Columns -->
        <div class="grid grid-cols-2 md:grid-cols-3 gap-8 text-xs text-verve-dark w-full md:w-auto">
          <div class="flex flex-col space-y-2">
            <span class="font-bold text-verve-brown mb-1">Help</span>
            <router-link to="/help#start" class="hover:underline">Getting Started</router-link>
            <router-link to="/help#faq" class="hover:underline">FAQ</router-link>
            <router-link to="/help#formats" class="hover:underline">File Formats</router-link>
          </div>
          <div class="flex flex-col space-y-2">
            <span class="font-bold text-verve-brown mb-1">Contact</span>
            <a href="#" class="hover:underline">Contact Form</a>
            <a href="#" class="hover:underline">Contact Details</a>
          </div>
          <div class="flex flex-col space-y-2">
            <span class="font-bold text-verve-brown mb-1">About Us</span>
            <router-link to="/help#about" class="hover:underline">About Verve</router-link>
            <a href="#" class="hover:underline">Imprint</a>
            <a href="#" class="hover:underline">Privacy Policy</a>
          </div>
        </div>
      </div>
    </div>
  </footer>
</template>
