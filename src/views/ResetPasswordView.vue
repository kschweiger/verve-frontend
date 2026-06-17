<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import logo from '@/assets/logo.svg';
import { resetPassword } from '@/services/passwordReset';

const route = useRoute();

const resetToken = computed(() => {
  const queryToken = route.query.token;
  if (typeof queryToken === 'string') return queryToken;

  const paramToken = route.params.token;
  if (typeof paramToken === 'string') return paramToken;

  return '';
});

const hasResetToken = computed(() => resetToken.value.length > 0);

const newPassword = ref('');
const confirmPassword = ref('');
const isSubmitting = ref(false);
const errorMessage = ref<string | null>(null);
const successMessage = ref<string | null>(null);

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Failed to reset password.';

const validateForm = (): string | null => {
  if (!hasResetToken.value) return 'Password reset token is missing.';
  if (!newPassword.value || !confirmPassword.value) return 'Enter and confirm your new password.';
  if (newPassword.value !== confirmPassword.value) return 'Passwords do not match.';
  if (newPassword.value.length < 8 || newPassword.value.length > 40) {
    return 'Password must be between 8 and 40 characters.';
  }

  return null;
};

async function handleSubmit() {
  errorMessage.value = null;
  successMessage.value = null;

  const validationError = validateForm();
  if (validationError) {
    errorMessage.value = validationError;
    return;
  }

  isSubmitting.value = true;

  try {
    await resetPassword({ token: resetToken.value, new_password: newPassword.value });
    newPassword.value = '';
    confirmPassword.value = '';
    successMessage.value = 'Password reset successfully. You can now sign in.';
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
        <p class="mt-2 text-verve-brown/60 text-sm font-medium">Choose a new password for your account.</p>
      </div>

      <div v-if="!hasResetToken" class="space-y-6">
        <div class="p-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl">
          Password reset token is missing.
        </div>

        <RouterLink
          :to="{ name: 'forgot-password' }"
          class="block text-center font-bold text-verve-dark hover:text-verve-brown hover:underline transition-colors"
        >
          Request a new reset link
        </RouterLink>
      </div>

      <form v-else @submit.prevent="handleSubmit" class="space-y-6">
        <div v-if="errorMessage" class="p-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl">
          {{ errorMessage }}
        </div>

        <div v-if="successMessage" class="p-4 text-sm text-verve-brown bg-verve-light/60 border border-verve-medium rounded-xl">
          <p>{{ successMessage }}</p>
          <RouterLink
            :to="{ name: 'login' }"
            class="inline-block mt-3 font-bold text-verve-dark hover:text-verve-brown hover:underline transition-colors"
          >
            Sign in
          </RouterLink>
        </div>

        <div>
          <label for="new-password" class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">
            New password
          </label>
          <div class="mt-1">
            <input
              v-model="newPassword"
              id="new-password"
              name="new-password"
              type="password"
              autocomplete="new-password"
              required
              minlength="8"
              maxlength="40"
              :disabled="isSubmitting"
              class="w-full px-4 py-3 border border-verve-medium rounded-xl shadow-sm text-verve-brown focus:outline-none focus:ring-2 focus:ring-verve-dark focus:border-verve-dark bg-white transition-colors disabled:bg-verve-light disabled:cursor-not-allowed"
            />
          </div>
        </div>

        <div>
          <label for="confirm-password" class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">
            Confirm password
          </label>
          <div class="mt-1">
            <input
              v-model="confirmPassword"
              id="confirm-password"
              name="confirm-password"
              type="password"
              autocomplete="new-password"
              required
              minlength="8"
              maxlength="40"
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
          {{ isSubmitting ? 'Resetting...' : 'Reset password' }}
        </button>
      </form>
    </div>
  </div>
</template>
