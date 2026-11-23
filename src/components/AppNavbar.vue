<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useUserStore } from '@/stores/auth';
import { useI18n } from 'vue-i18n';
import { Menu, X } from '@lucide/vue';
import logo from '@/assets/logo.svg';

const userStore = useUserStore();
const { t } = useI18n();
const router = useRouter();
const route = useRoute();

const isMobileMenuOpen = ref(false);
const accountButton = ref<HTMLButtonElement | null>(null);
const planningButton = ref<HTMLButtonElement | null>(null);

function closePlanning() {
  activeMenu.value = null;
  planningButton.value?.focus();
}

function leavePlanning(event: FocusEvent) {
  const { currentTarget, relatedTarget } = event;
  if (currentTarget instanceof HTMLElement && relatedTarget instanceof Node && currentTarget.contains(relatedTarget)) return;
  activeMenu.value = null;
}

function loadAccount() {
  void userStore.ensureCurrentUser().catch(() => undefined);
}

onMounted(loadAccount);
watch(() => userStore.token, token => {
  if (token) loadAccount();
  else void router.push({ name: 'login' });
});

function closeAccountMenu() {
  activeMenu.value = null;
  accountButton.value?.focus();
}

function handleLogout() {
  userStore.logout();
  router.push({ name: 'login' });
}

// Close mobile menu on route change
watch(
  () => route.fullPath,
  () => {
    isMobileMenuOpen.value = false;
    activeMenu.value = null;
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
            <button type="button" :aria-label="t('navigation.menu')" aria-controls="mobile-menu" :aria-expanded="isMobileMenuOpen" @click="isMobileMenuOpen = !isMobileMenuOpen"
              class="md:hidden p-2 -ml-2 text-verve-brown hover:bg-verve-light rounded-lg transition-colors">
              <component :is="isMobileMenuOpen ? X : Menu" class="size-6" />
            </button>

            <!-- Desktop Navigation (Hidden on Mobile) -->
            <div class="hidden md:flex items-center gap-6 text-sm font-medium text-verve-dark">
              <router-link to="/dashboard" class="hover:text-verve-brown transition-colors">
                {{ t('navigation.home') }}
              </router-link>

              <!-- Training Dropdown -->
              <div class="relative" @mouseenter="openMenu('training')" @mouseleave="closeMenu"
                @click="toggleMenu('training')">
                <span class="cursor-pointer hover:text-verve-brown flex items-center py-2"
                  :class="{ 'text-verve-brown': activeMenu === 'training' }">
                  {{ t('navigation.training') }}
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
                      {{ t('navigation.activities') }}
                    </router-link>
                    <router-link to="/collections"
                      class="block px-4 py-2 hover:bg-verve-light text-verve-brown/80 hover:text-verve-brown">
                      {{ t('navigation.collections') }}
                    </router-link>
                    <router-link to="/calendar"
                      class="block px-4 py-2 hover:bg-verve-light text-verve-brown/80 hover:text-verve-brown">
                      {{ t('navigation.calendar') }}
                    </router-link>
                  </div>
                </transition>
              </div>

              <!-- Planning Dropdown -->
              <div class="relative" @focusout="leavePlanning" @keydown.esc="closePlanning">
                <button ref="planningButton" type="button" :aria-expanded="activeMenu === 'planning'" aria-controls="planning-menu" @click="toggleMenu('planning')" class="cursor-pointer hover:text-verve-brown flex items-center py-2 focus-visible:outline-2 focus-visible:outline-verve-orange"
                  :class="{ 'text-verve-brown': activeMenu === 'planning' }">
                  {{ t('navigation.planning') }}
                  <span class="ml-1 text-[10px] transition-transform duration-200"
                    :class="{ 'rotate-180': activeMenu === 'planning' }">▼</span>
                </button>

                <transition enter-active-class="transition ease-out duration-100"
                  enter-from-class="opacity-0 translate-y-1" enter-to-class="opacity-100 translate-y-0"
                  leave-active-class="transition ease-in duration-75" leave-from-class="opacity-100 translate-y-0"
                  leave-to-class="opacity-0 translate-y-1">
                  <div id="planning-menu" v-show="activeMenu === 'planning'"
                    class="absolute left-0 mt-0 w-40 bg-white shadow-xl rounded-xl py-2 z-50 border border-verve-medium/20">
                    <router-link to="/workout-plans"
                      class="block px-4 py-2 hover:bg-verve-light text-verve-brown/80 hover:text-verve-brown">
                      {{ t('navigation.workoutPlans') }}
                    </router-link>
                    <router-link to="/goals"
                      class="block px-4 py-2 hover:bg-verve-light text-verve-brown/80 hover:text-verve-brown">
                      {{ t('navigation.goals') }}
                    </router-link>
                    <router-link to="/locations"
                      class="block px-4 py-2 hover:bg-verve-light text-verve-brown/80 hover:text-verve-brown">
                      {{ t('navigation.locations') }}
                    </router-link>
                  </div>
                </transition>
              </div>

              <!-- Statistics Dropdown -->
              <div class="relative" @mouseenter="openMenu('statistics')" @mouseleave="closeMenu"
                @click="toggleMenu('statistics')">
                <span class="cursor-pointer hover:text-verve-brown flex items-center py-2"
                  :class="{ 'text-verve-brown': activeMenu === 'statistics' }">
                  {{ t('navigation.statistics') }}
                  <span class="ml-1 text-[10px] transition-transform duration-200"
                    :class="{ 'rotate-180': activeMenu === 'statistics' }">▼</span>
                </span>

                <transition enter-active-class="transition ease-out duration-100"
                  enter-from-class="opacity-0 translate-y-1" enter-to-class="opacity-100 translate-y-0"
                  leave-active-class="transition ease-in duration-75" leave-from-class="opacity-100 translate-y-0"
                  leave-to-class="opacity-0 translate-y-1">
                  <div v-show="activeMenu === 'statistics'"
                    class="absolute left-0 mt-0 w-40 bg-white shadow-xl rounded-xl py-2 z-50 border border-verve-medium/20">
                    <router-link to="/records"
                      class="block px-4 py-2 hover:bg-verve-light text-verve-brown/80 hover:text-verve-brown">
                      {{ t('navigation.records') }}
                    </router-link>
                    <router-link to="/heatmap"
                      class="block px-4 py-2 hover:bg-verve-light text-verve-brown/80 hover:text-verve-brown">
                      {{ t('navigation.heatmap') }}
                    </router-link>
                  </div>
                </transition>
              </div>
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
              <input type="text" :placeholder="t('navigation.searchPlaceholder')" :aria-label="t('navigation.searchPlaceholder')"
                class="bg-transparent border-none focus:ring-0 text-xs w-full text-verve-brown placeholder-gray-400" />
              <svg xmlns="http://www.w3.org/2000/svg" class="size-4 text-gray-400" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <!-- User Menu Dropdown -->
            <div class="relative" @mouseenter="openMenu('user')" @mouseleave="closeMenu" @keydown.esc="closeAccountMenu">
              <button ref="accountButton" type="button" :aria-label="t('navigation.accountMenu')" aria-controls="account-menu"
                :aria-expanded="activeMenu === 'user'" @click="toggleMenu('user')"
                class="flex items-center gap-2 text-verve-dark hover:text-verve-brown transition-colors focus-visible:outline-2 focus-visible:outline-verve-orange focus-visible:outline-offset-2 rounded-lg py-2">
                <div class="flex flex-col items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="size-6" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span class="text-[10px] font-medium hidden md:block">{{ t('navigation.profile') }}</span>
                </div>
              </button>

              <transition enter-active-class="transition ease-out duration-100"
                enter-from-class="opacity-0 translate-y-1" enter-to-class="opacity-100 translate-y-0"
                leave-active-class="transition ease-in duration-75" leave-from-class="opacity-100 translate-y-0"
                leave-to-class="opacity-0 translate-y-1">
                <div id="account-menu" v-show="activeMenu === 'user'"
                  class="absolute right-0 mt-0 w-48 bg-white shadow-xl rounded-xl py-2 z-50 border border-verve-medium/20">
                  <div class="px-4 py-2 border-b border-verve-light mb-1">
                    <p class="text-xs text-verve-brown/60">{{ t('navigation.signedInAs') }}</p>
                    <p class="text-sm font-bold text-verve-brown truncate">
                      {{ userStore.user_name }}
                    </p>
                  </div>

                  <div v-if="userStore.currentUserError" class="px-4 py-2 text-xs text-red-600" role="alert">
                    {{ t('navigation.accountLoadFailed') }}
                    <button type="button" :disabled="userStore.isLoadingCurrentUser" @click="loadAccount"
                      class="block mt-1 underline focus-visible:outline-2 focus-visible:outline-verve-orange">
                      {{ t('navigation.retryAccountLoading') }}
                    </button>
                  </div>

                  <router-link to="/settings"
                    class="block px-4 py-2 text-sm text-verve-brown/80 hover:bg-verve-light hover:text-verve-brown">
                    {{ t('navigation.settings') }}
                  </router-link>
                  <router-link to="/equipment"
                    class="block px-4 py-2 text-sm text-verve-brown/80 hover:bg-verve-light hover:text-verve-brown">
                    {{ t('navigation.myGear') }}
                  </router-link>
                  <router-link to="/tags"
                    class="block px-4 py-2 text-sm text-verve-brown/80 hover:bg-verve-light hover:text-verve-brown">
                    {{ t('navigation.tagsCategories') }}
                  </router-link>
                  <router-link v-if="userStore.isAdmin" :to="{ name: 'admin' }"
                    class="block px-4 py-2 text-sm text-verve-brown/80 hover:bg-verve-light hover:text-verve-brown focus-visible:outline-2 focus-visible:outline-verve-orange focus-visible:outline-offset-[-2px]">
                    {{ t('navigation.admin') }}
                  </router-link>

                  <div class="border-t border-verve-light my-1"></div>

                  <button @click="handleLogout" class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                    {{ t('navigation.logout') }}
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
        <div v-if="isMobileMenuOpen" id="mobile-menu" class="md:hidden bg-white border-t border-verve-light">
          <div class="px-4 pt-2 pb-4 space-y-1">
            <router-link to="/dashboard"
              class="block px-3 py-2 rounded-md text-base font-medium text-verve-brown hover:bg-verve-light hover:text-verve-orange">
              {{ t('navigation.home') }}
            </router-link>

            <div class="px-3 py-2 text-xs font-bold text-verve-brown/40 uppercase tracking-wider mt-2">{{ t('navigation.training') }}</div>
            <router-link to="/activities"
              class="block pl-6 pr-3 py-2 text-sm font-medium text-verve-brown hover:bg-verve-light">{{ t('navigation.activities') }}</router-link>
            <router-link to="/collections"
              class="block pl-6 pr-3 py-2 text-sm font-medium text-verve-brown hover:bg-verve-light">{{ t('navigation.collections') }}</router-link>
            <router-link to="/calendar"
              class="block pl-6 pr-3 py-2 text-sm font-medium text-verve-brown hover:bg-verve-light">{{ t('navigation.calendar') }}</router-link>

            <div class="px-3 py-2 text-xs font-bold text-verve-brown/40 uppercase tracking-wider mt-2">{{ t('navigation.planning') }}</div>
            <router-link to="/workout-plans" @click="isMobileMenuOpen = false"
              class="block pl-6 pr-3 py-2 text-sm font-medium text-verve-brown hover:bg-verve-light">{{ t('navigation.workoutPlans') }}</router-link>
            <router-link to="/goals"
              class="block pl-6 pr-3 py-2 text-sm font-medium text-verve-brown hover:bg-verve-light">{{ t('navigation.goals') }}</router-link>
            <router-link to="/locations"
              class="block pl-6 pr-3 py-2 text-sm font-medium text-verve-brown hover:bg-verve-light">{{ t('navigation.locations') }}</router-link>

            <div class="px-3 py-2 text-xs font-bold text-verve-brown/40 uppercase tracking-wider mt-2">{{ t('navigation.statistics') }}</div>
            <router-link to="/records"
              class="block pl-6 pr-3 py-2 text-sm font-medium text-verve-brown hover:bg-verve-light">{{ t('navigation.records') }}</router-link>
            <router-link to="/heatmap"
              class="block pl-6 pr-3 py-2 text-sm font-medium text-verve-brown hover:bg-verve-light">{{ t('navigation.heatmap') }}</router-link>
          </div>
        </div>
      </transition>
    </nav>
  </header>
</template>
