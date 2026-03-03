<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useUserStore } from '@/stores/auth';
import { Menu, X } from 'lucide-vue-next';
import logo from '@/assets/logo.svg';

const userStore = useUserStore();
const router = useRouter();
const route = useRoute();

const isMobileMenuOpen = ref(false);

function handleLogout() {
  userStore.logout();
  router.push({ name: 'login' });
}

// Close mobile menu on route change
watch(
  () => route.fullPath,
  () => {
    isMobileMenuOpen.value = false;
  }
);

// --- Dropdown Logic (Desktop) ---
const activeMenu = ref<string | null>(null);
let closeTimeout: ReturnType<typeof setTimeout> | null = null;

const openMenu = (menu: string) => {
  if (closeTimeout) clearTimeout(closeTimeout);
  activeMenu.value = menu;
};

const closeMenu = () => {
  closeTimeout = setTimeout(() => {
    activeMenu.value = null;
  }, 150);
};

const toggleMenu = (menu: string) => {
  if (activeMenu.value === menu) {
    activeMenu.value = null;
  } else {
    openMenu(menu);
  }
};
</script>

<template>
  <header>
    <!-- Brown Top Border -->
    <div class="h-2 bg-verve-brown w-full"></div>

    <nav class="bg-white shadow-sm border-b border-verve-light relative z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-3">

        <!-- MAIN BAR LAYOUT -->
        <!-- Mobile: Flex (Space Between), Desktop: Grid (3 Cols for center logo) -->
        <div class="flex justify-between items-center md:grid md:grid-cols-3 gap-4">

          <!-- 1. LEFT SECTION -->
          <div class="flex items-center justify-start">

            <!-- Mobile Menu Toggle -->
            <button @click="isMobileMenuOpen = !isMobileMenuOpen"
              class="md:hidden p-2 -ml-2 text-verve-brown hover:bg-verve-light rounded-lg transition-colors">
              <component :is="isMobileMenuOpen ? X : Menu" class="size-6" />
            </button>

            <!-- Desktop Navigation (Hidden on Mobile) -->
            <div class="hidden md:flex items-center gap-6 text-sm font-medium text-verve-dark">
              <router-link to="/dashboard" class="hover:text-verve-brown transition-colors">
                Home
              </router-link>

              <!-- Training Dropdown -->
              <div class="relative" @mouseenter="openMenu('training')" @mouseleave="closeMenu"
                @click="toggleMenu('training')">
                <span class="cursor-pointer hover:text-verve-brown flex items-center py-2"
                  :class="{ 'text-verve-brown': activeMenu === 'training' }">
                  Training
                  <span class="ml-1 text-[10px] transition-transform duration-200"
                    :class="{ 'rotate-180': activeMenu === 'training' }">▼</span>
                </span>

                <transition enter-active-class="transition ease-out duration-100"
                  enter-from-class="opacity-0 translate-y-1" enter-to-class="opacity-100 translate-y-0"
                  leave-active-class="transition ease-in duration-75" leave-from-class="opacity-100 translate-y-0"
                  leave-to-class="opacity-0 translate-y-1">
                  <div v-show="activeMenu === 'training'"
                    class="absolute left-0 mt-0 w-40 bg-white shadow-xl rounded-xl py-2 z-50 border border-verve-medium/20">
                    <router-link to="/activities"
                      class="block px-4 py-2 hover:bg-verve-light text-verve-brown/80 hover:text-verve-brown">
                      Activities
                    </router-link>
                    <router-link to="/calendar"
                      class="block px-4 py-2 hover:bg-verve-light text-verve-brown/80 hover:text-verve-brown">
                      Calendar
                    </router-link>
                  </div>
                </transition>
              </div>

              <!-- Planning Dropdown -->
              <div class="relative" @mouseenter="openMenu('planning')" @mouseleave="closeMenu"
                @click="toggleMenu('planning')">
                <span class="cursor-pointer hover:text-verve-brown flex items-center py-2"
                  :class="{ 'text-verve-brown': activeMenu === 'planning' }">
                  Planning
                  <span class="ml-1 text-[10px] transition-transform duration-200"
                    :class="{ 'rotate-180': activeMenu === 'planning' }">▼</span>
                </span>

                <transition enter-active-class="transition ease-out duration-100"
                  enter-from-class="opacity-0 translate-y-1" enter-to-class="opacity-100 translate-y-0"
                  leave-active-class="transition ease-in duration-75" leave-from-class="opacity-100 translate-y-0"
                  leave-to-class="opacity-0 translate-y-1">
                  <div v-show="activeMenu === 'planning'"
                    class="absolute left-0 mt-0 w-40 bg-white shadow-xl rounded-xl py-2 z-50 border border-verve-medium/20">
                    <router-link to="/goals"
                      class="block px-4 py-2 hover:bg-verve-light text-verve-brown/80 hover:text-verve-brown">
                      Goals
                    </router-link>
                    <router-link to="/locations"
                      class="block px-4 py-2 hover:bg-verve-light text-verve-brown/80 hover:text-verve-brown">
                      Locations
                    </router-link>
                  </div>
                </transition>
              </div>

              <router-link to="/heatmap" class="hover:text-verve-brown">Statistik</router-link>
            </div>
          </div>

          <!-- 2. CENTER SECTION: Logo -->
          <div class="flex justify-center">
            <router-link to="/dashboard">
              <img :src="logo" alt="Verve Outdoors" class="h-8 md:h-10 w-auto" />
            </router-link>
          </div>

          <!-- 3. RIGHT SECTION: User & Search -->
          <div class="flex items-center justify-end gap-2 md:gap-4">
            <!-- Search Bar (Desktop Only) -->
            <div class="hidden lg:flex items-center bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5 w-48">
              <input type="text" placeholder="Suche..."
                class="bg-transparent border-none focus:ring-0 text-xs w-full text-verve-brown placeholder-gray-400" />
              <svg xmlns="http://www.w3.org/2000/svg" class="size-4 text-gray-400" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <!-- User Menu Dropdown -->
            <div class="relative" @mouseenter="openMenu('user')" @mouseleave="closeMenu" @click="toggleMenu('user')">
              <button
                class="flex items-center gap-2 text-verve-dark hover:text-verve-brown transition-colors focus:outline-none py-2">
                <div class="flex flex-col items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="size-6" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span class="text-[10px] font-medium hidden md:block">Profil</span>
                </div>
              </button>

              <transition enter-active-class="transition ease-out duration-100"
                enter-from-class="opacity-0 translate-y-1" enter-to-class="opacity-100 translate-y-0"
                leave-active-class="transition ease-in duration-75" leave-from-class="opacity-100 translate-y-0"
                leave-to-class="opacity-0 translate-y-1">
                <div v-show="activeMenu === 'user'"
                  class="absolute right-0 mt-0 w-48 bg-white shadow-xl rounded-xl py-2 z-50 border border-verve-medium/20">
                  <div class="px-4 py-2 border-b border-verve-light mb-1">
                    <p class="text-xs text-verve-brown/60">Signed in as</p>
                    <p class="text-sm font-bold text-verve-brown truncate">
                      {{ userStore.user_name }}
                    </p>
                  </div>

                  <router-link to="/settings"
                    class="block px-4 py-2 text-sm text-verve-brown/80 hover:bg-verve-light hover:text-verve-brown">
                    Settings
                  </router-link>
                  <router-link to="/equipment"
                    class="block px-4 py-2 text-sm text-verve-brown/80 hover:bg-verve-light hover:text-verve-brown">
                    My Gear
                  </router-link>

                  <div class="border-t border-verve-light my-1"></div>

                  <button @click="handleLogout" class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                    Logout
                  </button>
                </div>
              </transition>
            </div>
          </div>
        </div>
      </div>

      <!-- MOBILE MENU DRAWER -->
      <transition enter-active-class="transition duration-200 ease-out"
        enter-from-class="transform -translate-y-2 opacity-0" enter-to-class="transform translate-y-0 opacity-100"
        leave-active-class="transition duration-150 ease-in" leave-from-class="transform translate-y-0 opacity-100"
        leave-to-class="transform -translate-y-2 opacity-0">
        <div v-if="isMobileMenuOpen" class="md:hidden bg-white border-t border-verve-light">
          <div class="px-4 pt-2 pb-4 space-y-1">
            <router-link to="/dashboard"
              class="block px-3 py-2 rounded-md text-base font-medium text-verve-brown hover:bg-verve-light hover:text-verve-orange">
              Home
            </router-link>

            <div class="px-3 py-2 text-xs font-bold text-verve-brown/40 uppercase tracking-wider mt-2">Training</div>
            <router-link to="/activities"
              class="block pl-6 pr-3 py-2 text-sm font-medium text-verve-brown hover:bg-verve-light">Activities</router-link>
            <router-link to="/calendar"
              class="block pl-6 pr-3 py-2 text-sm font-medium text-verve-brown hover:bg-verve-light">Calendar</router-link>

            <div class="px-3 py-2 text-xs font-bold text-verve-brown/40 uppercase tracking-wider mt-2">Planning</div>
            <router-link to="/goals"
              class="block pl-6 pr-3 py-2 text-sm font-medium text-verve-brown hover:bg-verve-light">Goals</router-link>
            <router-link to="/locations"
              class="block pl-6 pr-3 py-2 text-sm font-medium text-verve-brown hover:bg-verve-light">Locations</router-link>

            <div class="px-3 py-2 text-xs font-bold text-verve-brown/40 uppercase tracking-wider mt-2">Analysis</div>
            <router-link to="/heatmap"
              class="block pl-6 pr-3 py-2 text-sm font-medium text-verve-brown hover:bg-verve-light">Statistik</router-link>
          </div>
        </div>
      </transition>
    </nav>
  </header>
</template>
