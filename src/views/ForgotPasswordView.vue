<script setup lang="ts">
import { ref } from 'vue';
import { RouterLink } from 'vue-router';
import logo from '@/assets/logo.svg';
import { requestPasswordReset } from '@/services/passwordReset';

const email = ref('');
const isSubmitting = ref(false);
const errorMessage = ref<string | null>(null);
const successMessage = ref<string | null>(null);
const resetLink = ref<string | null>(null);

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Failed to request password reset.';

async function handleSubmit() {
  isSubmitting.value = true;
  errorMessage.value = null;
  successMessage.value = null;
  resetLink.value = null;

  try {
    const result = await requestPasswordReset(email.value);
    successMessage.value = result.message;
    resetLink.value = result.resetLink;
  } catch (error) {
    errorMessage.value = toErrorMessage(error);
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="flex items-center justify-center min-h-screen bg-verve-medium p-4">
    <div class="w-full max-w-md p-10 space-y-8 bg-white rounded-2xl shadow-xl border border-verve-light">
      <div class="text-center flex flex-col items-center">
        <img :src="logo" alt="Verve Outdoors" class="h-20 w-auto mb-4" />
        <p class="mt-2 text-verve-brown/60 text-sm font-medium">
          Enter your email address and we will send a password reset link.
        </p>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-6">
        <div v-if="errorMessage" class="p-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl">
          {{ errorMessage }}
        </div>

        <div v-if="successMessage" class="p-4 text-sm text-verve-brown bg-verve-light/60 border border-verve-medium rounded-xl">
          <p>{{ successMessage }}</p>
          <a
            v-if="resetLink"
            :href="resetLink"
            class="inline-block mt-3 font-bold text-verve-dark hover:text-verve-brown hover:underline transition-colors"
          >
            Open reset link
          </a>
        </div>

        <div>
          <label for="forgot-email" class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">
            Email address
          </label>
          <div class="mt-1">
            <input
              v-model="email"
              id="forgot-email"
              name="email"
              type="email"
              autocomplete="email"
              required
              :disabled="isSubmitting"
              class="w-full px-4 py-3 border border-verve-medium rounded-xl shadow-sm text-verve-brown focus:outline-none focus:ring-2 focus:ring-verve-dark focus:border-verve-dark bg-white transition-colors disabled:bg-verve-light disabled:cursor-not-allowed"
            />
          </div>
        </div>

        <button
          type="submit"
          :disabled="isSubmitting"
          class="w-full flex justify-center py-3 px-4 border border-verve-dark/5 rounded-xl shadow-sm text-sm font-bold text-verve-brown bg-verve-neon hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-verve-neon transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {{ isSubmitting ? 'Sending...' : 'Send reset link' }}
        </button>
      </form>

      <div class="text-center text-sm text-verve-brown/70">
        <RouterLink
          :to="{ name: 'login' }"
          class="font-bold text-verve-dark hover:text-verve-brown hover:underline transition-colors"
        >
          Back to sign in
        </RouterLink>
      </div>
    </div>
  </div>
</template>
