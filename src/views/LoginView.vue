<script setup lang="ts">
import LoginForm from '@/components/LoginForm.vue';
import logo from '@/assets/logo.svg';
</script>

<template>
  <div class="flex items-center justify-center min-h-screen bg-verve-medium p-4">
    <div class="w-full max-w-md p-10 space-y-8 bg-white rounded-2xl shadow-xl border border-verve-light">

      <div class="text-center flex flex-col items-center">
        <!-- Logo -->
        <img :src="logo" alt="Verve Outdoors" class="h-20 w-auto mb-4" />

        <p class="mt-2 text-verve-brown/60 text-sm font-medium">Log in to your personal sports journal</p>
      </div>

      <LoginForm />

      <div class="text-center text-sm text-verve-brown/70">
        <p>
          Don't have an account?
          <a href="#" class="font-bold text-verve-dark hover:text-verve-brown hover:underline transition-colors">
            Sign Up
          </a>
        </p>
      </div>

    </div>
  </div>
</template>
