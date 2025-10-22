<script setup lang="ts">
import LoginForm from '@/components/LoginForm.vue';
</script>

<template>
  <div class="flex items-center justify-center min-h-screen bg-gray-100">
    <div class="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
      <div class="text-center">
        <h1 class="text-3xl font-bold text-gray-800">Verve Outdoors</h1>
        <p class="mt-2 text-gray-500">Log in to your personal sports journal</p>
      </div>
      <LoginForm />
      <div class="text-center text-sm text-gray-600">
        <p>
          Don't have an account?
          <a href="#" class="font-medium text-indigo-600 hover:text-indigo-500">Sign Up</a>
        </p>
      </div>
    </div>
  </div>
</template>
