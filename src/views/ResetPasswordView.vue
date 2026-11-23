<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import logo from '@/assets/logo.svg';
import { resetPassword } from '@/services/passwordReset';
import { ApiResponseError } from '@/services/authHeaders';

const route = useRoute();
const { t } = useI18n();

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
type ResetErrorKey = 'enterAndConfirmPassword' | 'passwordsDoNotMatch' | 'passwordLength' | 'resetFallbackError';
type ResetError = { kind: 'translation'; key: ResetErrorKey } | { kind: 'message'; message: string };
const errorState = ref<ResetError | null>(null);
const hasResetSucceeded = ref(false);

const validateForm = (): ResetErrorKey | null => {
  if (!newPassword.value || !confirmPassword.value) return 'enterAndConfirmPassword';
  if (newPassword.value !== confirmPassword.value) return 'passwordsDoNotMatch';
  if (newPassword.value.length < 8 || newPassword.value.length > 40) {
    return 'passwordLength';
  }

  return null;
};

async function handleSubmit() {
  errorState.value = null;
  hasResetSucceeded.value = false;

  const validationError = validateForm();
  if (validationError) {
    errorState.value = { kind: 'translation', key: validationError };
    return;
  }

  isSubmitting.value = true;

  try {
    await resetPassword({ token: resetToken.value, new_password: newPassword.value });
    newPassword.value = '';
    confirmPassword.value = '';
    hasResetSucceeded.value = true;
  } catch (error) {
    if (error instanceof ApiResponseError && error.detail) {
      errorState.value = { kind: 'message', message: error.detail };
    } else {
      errorState.value = { kind: 'translation', key: 'resetFallbackError' };
    }
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
        <p class="mt-2 text-verve-brown/60 text-sm font-medium">{{ t('auth.resetDescription') }}</p>
      </div>

      <div v-if="!hasResetToken" class="space-y-6">
        <div class="p-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl">
          {{ t('auth.missingToken') }}
        </div>

        <RouterLink
          :to="{ name: 'forgot-password' }"
          class="block text-center font-bold text-verve-dark hover:text-verve-brown hover:underline transition-colors"
        >
          {{ t('auth.requestNewLink') }}
        </RouterLink>
      </div>

      <form v-else @submit.prevent="handleSubmit" class="space-y-6">
        <div v-if="errorState" class="p-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl">
          {{ errorState.kind === 'translation' ? t(`auth.${errorState.key}`) : errorState.message }}
        </div>

        <div v-if="hasResetSucceeded" class="p-4 text-sm text-verve-brown bg-verve-light/60 border border-verve-medium rounded-xl">
          <p>{{ t('auth.resetSuccess') }}</p>
          <RouterLink
            :to="{ name: 'login' }"
            class="inline-block mt-3 font-bold text-verve-dark hover:text-verve-brown hover:underline transition-colors"
          >
            {{ t('auth.signIn') }}
          </RouterLink>
        </div>

        <div>
          <label for="new-password" class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">
            {{ t('auth.newPassword') }}
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
            {{ t('auth.confirmPassword') }}
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
          {{ isSubmitting ? t('auth.resetPending') : t('auth.resetSubmit') }}
        </button>
      </form>
    </div>
  </div>
</template>
