<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/auth';

const router = useRouter();
const userStore = useUserStore();

const email = ref('');
const password = ref('');
const errorMessage = ref<string | null>(null);

async function handleLogin() {
  errorMessage.value = null;

  const success = await userStore.login(email.value, password.value);

  if (success) {
    router.push({ name: 'dashboard' });
  } else {
    errorMessage.value = 'Invalid email or password. Please try again.';
  }
}
</script>

<template>
  <form @submit.prevent="handleLogin" class="space-y-6">
    <div v-if="errorMessage" class="p-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl">
      {{ errorMessage }}
    </div>

    <div>
      <label for="email" class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">Email address</label>
      <div class="mt-1">
        <input v-model="email" id="email" name="email" type="email" autocomplete="email" required
          class="w-full px-4 py-3 border border-verve-medium rounded-xl shadow-sm text-verve-brown focus:outline-none focus:ring-2 focus:ring-verve-dark focus:border-verve-dark bg-white transition-colors" />
      </div>
    </div>

    <div>
      <label for="password" class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">Password</label>
      <div class="mt-1">
        <input v-model="password" id="password" name="password" type="password" autocomplete="current-password" required
          class="w-full px-4 py-3 border border-verve-medium rounded-xl shadow-sm text-verve-brown focus:outline-none focus:ring-2 focus:ring-verve-dark focus:border-verve-dark bg-white transition-colors" />
      </div>
    </div>

    <div>
      <button type="submit"
        class="w-full flex justify-center py-3 px-4 border border-verve-dark/5 rounded-xl shadow-sm text-sm font-bold text-verve-brown bg-verve-neon hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-verve-neon transition-all">
        Sign in
      </button>
    </div>
  </form>
</template>
