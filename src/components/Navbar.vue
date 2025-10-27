<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/auth';

const userStore = useUserStore();
const router = useRouter();

function handleLogout() {
  userStore.logout(); // This clears the token from the store and localStorage
  router.push({ name: 'login' }); // Redirect to the login page
}
</script>

<template>
  <nav class="bg-gray-800 shadow-md">
    <div class="container mx-auto px-6 py-3">
      <div class="flex items-center justify-between">
        <div class="text-white font-bold text-xl">
          <router-link to="/dashboard">Verve Outdoors</router-link>
        </div>
        <div class="flex items-center">
          <div class="flex text-white space-x-4">
            <!-- Use router-link for SPA navigation without page reloads -->
            <router-link to="/dashboard" class="hover:text-gray-300">Dashboard</router-link>
            <!-- We will create these routes later -->
            <router-link to="/activities" class="hover:text-gray-300">Activities</router-link>
            <router-link to="/heatmap" class="hover:text-gray-300">Heatmap</router-link>
            <router-link to="/settings" class="hover:text-gray-300">Settings</router-link>
          </div>
          <button @click="handleLogout"
            class="ml-6 px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-500">
            Logout
          </button>
        </div>
      </div>
    </div>
  </nav>
</template>
