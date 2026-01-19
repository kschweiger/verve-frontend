<script setup lang="ts">
import logo from '@/assets/logo.svg';
// Assuming you have icons for socials, using text placeholders or generic SVGs for now
</script>

<template>
  <footer class="bg-verve-light border-t border-verve-medium/30 pt-12 pb-8 mt-auto">
    <div class="container mx-auto px-6">
      <div class="flex flex-col md:flex-row justify-between items-start gap-8">

        <!-- Branding Column -->
        <div class="flex flex-col items-start">
          <img :src="logo" alt="Verve Active" class="h-12 w-auto mb-4" />
          <div class="flex space-x-4 text-verve-brown hidden">
            <!-- Social Placeholders -->
            <a href="#" class="hover:text-verve-dark"><span class="sr-only">Instagram</span>📷</a>
            <a href="#" class="hover:text-verve-dark"><span class="sr-only">YouTube</span>▶️</a>
            <a href="#" class="hover:text-verve-dark"><span class="sr-only">Facebook</span>f</a>
          </div>
        </div>

        <!-- Links Columns -->
        <div class="grid grid-cols-2 md:grid-cols-3 gap-8 text-xs text-verve-dark w-full md:w-auto">
          <div class="flex flex-col space-y-2">
            <span class="font-bold text-verve-brown mb-1">Help</span>
            <a href="#" class="hover:underline">Overview</a>
            <a href="#" class="hover:underline">Getting Started</a>
            <a href="#" class="hover:underline">FAQ</a>
          </div>
          <div class="flex flex-col space-y-2">
            <span class="font-bold text-verve-brown mb-1">Contact</span>
            <a href="#" class="hover:underline">Contact Form</a>
            <a href="#" class="hover:underline">Contact Details</a>
          </div>
          <div class="flex flex-col space-y-2">
            <span class="font-bold text-verve-brown mb-1">About Us</span>
            <a href="#" class="hover:underline">Company</a>
            <a href="#" class="hover:underline">Imprint</a>
            <a href="#" class="hover:underline">Privacy Policy</a>
            <a href="#" class="hover:underline">Terms & Conditions</a>
          </div>
        </div>
      </div>
    </div>
  </footer>
</template>
