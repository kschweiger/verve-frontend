<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

// Get the router instance to redirect the user after login
const router = useRouter();

// Get the auth store instance
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const errorMessage = ref<string | null>(null); // A ref to hold any login error messages

async function handleLogin() {
  errorMessage.value = null; // Reset error message on new attempt

  // Call the login action from our Pinia store
  const success = await authStore.login(email.value, password.value);

  if (success) {
    // If login is successful, redirect to the dashboard
    router.push({ name: 'dashboard' });
  } else {
    // If login fails, show an error message
    errorMessage.value = 'Invalid email or password. Please try again.';
  }
}
</script>

<template>
  <form @submit.prevent="handleLogin" class="space-y-6">
    <!-- Error Message Display -->
    <div v-if="errorMessage" class="p-3 text-sm text-red-700 bg-red-100 border border-red-400 rounded-md">
      {{ errorMessage }}
    </div>

    <div>
      <label for="email" class="block text-sm font-medium text-gray-700">Email address</label>
      <div class="mt-1">
        <input v-model="email" id="email" name="email" type="email" autocomplete="email" required
          class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-black focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
      </div>
    </div>

    <div>
      <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
      <div class="mt-1">
        <input v-model="password" id="password" name="password" type="password" autocomplete="current-password" required
          class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-black focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
      </div>
    </div>

    <div>
      <button type="submit"
        class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
        Sign in
      </button>
    </div>
  </form>
</template>
