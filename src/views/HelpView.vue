<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ExternalLink, FileText, HelpCircle, Info, Rocket } from '@lucide/vue';
const appVersion = import.meta.env.VITE_APP_VERSION;
const route = useRoute();
const { t } = useI18n();
const activeTab = ref(route.hash.replace('#', '') || 'faq');

const tabs = [
  { id: 'start', icon: Rocket },
  { id: 'faq', icon: HelpCircle },
  { id: 'formats', icon: FileText },
  { id: 'about', icon: Info },
];

watch(
  () => route.hash,
  (newHash) => {
    const target = newHash.replace('#', '');
    // Only switch if it's a valid tab, otherwise keep current
    if (target && tabs.some(t => t.id === target)) {
      activeTab.value = target;
      // Optional: Scroll to top of content when switching via footer link
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
);

</script>

<template>
  <div class="p-4 sm:p-6 lg:p-8 bg-verve-medium min-h-[calc(100vh-64px)]">
    <div class="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6">

      <!-- Sidebar Navigation -->
      <aside class="md:col-span-1">
        <nav :aria-label="t('help.center')" class="bg-white rounded-xl shadow-sm border border-verve-medium/30 overflow-hidden sticky top-6">
          <div class="p-4 border-b border-verve-medium/20 bg-verve-light/30">
            <h2 class="font-bold text-verve-brown text-lg">{{ t('help.center') }}</h2>
          </div>
          <ul class="flex flex-col">
            <li v-for="tab in tabs" :key="tab.id">
              <button type="button" @click="activeTab = tab.id" :aria-pressed="activeTab === tab.id"
                class="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-l-4"
                :class="activeTab === tab.id
                  ? 'bg-verve-light/50 text-verve-brown border-verve-orange'
                  : 'text-verve-brown/60 hover:bg-verve-light/30 hover:text-verve-brown border-transparent'
                  ">
                <component :is="tab.icon" class="size-4" aria-hidden="true" />
                {{ t(`help.tabs.${tab.id}`) }}
              </button>
            </li>
          </ul>
        </nav>
      </aside>

      <!-- Main Content -->
      <main class="md:col-span-3 bg-white rounded-xl shadow-sm border border-verve-medium/30 p-8 min-h-[500px]">

        <!-- SECTION: FAQ -->
        <div v-if="activeTab === 'faq'" class="space-y-8 animate-fade-in">
          <h1 class="text-3xl font-bold text-verve-brown mb-6">{{ t('help.faq.title') }}</h1>

          <div class="space-y-4">
            <details
              class="group bg-verve-light/10 rounded-xl border border-verve-medium/20 open:bg-verve-light/20 transition-colors">
              <summary
                class="flex justify-between items-center cursor-pointer p-4 font-bold text-verve-brown list-none">
                <span>{{ t('help.faq.delete.question') }}</span>
                <span aria-hidden="true" class="transition group-open:rotate-180">▼</span>
              </summary>
              <div class="px-4 pb-4 text-verve-brown/80 text-sm leading-relaxed">
                {{ t('help.faq.delete.answer') }}
              </div>
            </details>

            <details
              class="group bg-verve-light/10 rounded-xl border border-verve-medium/20 open:bg-verve-light/20 transition-colors">
              <summary
                class="flex justify-between items-center cursor-pointer p-4 font-bold text-verve-brown list-none">
                <span>{{ t('help.faq.gear.question') }}</span>
                <span aria-hidden="true" class="transition group-open:rotate-180">▼</span>
              </summary>
              <div class="px-4 pb-4 text-verve-brown/80 text-sm leading-relaxed">
                {{ t('help.faq.gear.answer') }}
              </div>
            </details>

            <details
              class="group bg-verve-light/10 rounded-xl border border-verve-medium/20 open:bg-verve-light/20 transition-colors">
              <summary
                class="flex justify-between items-center cursor-pointer p-4 font-bold text-verve-brown list-none">
                <span>{{ t('help.faq.heatmap.question') }}</span>
                <span aria-hidden="true" class="transition group-open:rotate-180">▼</span>
              </summary>
              <div class="px-4 pb-4 text-verve-brown/80 text-sm leading-relaxed">
                {{ t('help.faq.heatmap.answer') }}
              </div>
            </details>

            <details
              class="group bg-verve-light/10 rounded-xl border border-verve-medium/20 open:bg-verve-light/20 transition-colors">
              <summary
                class="flex justify-between items-center cursor-pointer p-4 font-bold text-verve-brown list-none">
                <span>{{ t('help.faq.swimming.question') }}</span>
                <span aria-hidden="true" class="transition group-open:rotate-180">▼</span>
              </summary>
              <div class="px-4 pb-4 text-verve-brown/80 text-sm leading-relaxed space-y-3">
                <i18n-t keypath="help.faq.swimming.metadata" tag="p" scope="global">
                  <template #target>
                    <code class="font-mono text-xs bg-white/70 px-1.5 py-0.5 rounded">metadata.target = "SwimmingMetaData"</code>
                  </template>
                </i18n-t>
                <p>
                  {{ t('help.faq.swimming.laps') }}
                </p>
                <p>
                  {{ t('help.faq.swimming.pool') }}
                </p>
              </div>
            </details>

            <details
              class="group bg-verve-light/10 rounded-xl border border-verve-medium/20 open:bg-verve-light/20 transition-colors">
              <summary
                class="flex justify-between items-center cursor-pointer p-4 font-bold text-verve-brown list-none">
                <span>{{ t('help.faq.swolf.question') }}</span>
                <span aria-hidden="true" class="transition group-open:rotate-180">▼</span>
              </summary>
              <div class="px-4 pb-4 text-verve-brown/80 text-sm leading-relaxed">
                {{ t('help.faq.swolf.answer') }}
              </div>
            </details>
          </div>
        </div>

        <!-- SECTION: File Formats -->
        <div v-else-if="activeTab === 'formats'" class="space-y-6 animate-fade-in">
          <h1 class="text-3xl font-bold text-verve-brown border-b border-verve-medium/20 pb-4">{{ t('help.tabs.formats') }}</h1>

          <i18n-t keypath="help.formats.supported" tag="p" scope="global" class="text-verve-brown/80 leading-relaxed">
            <template #gpx><strong>GPX</strong></template>
            <template #fit><strong>FIT</strong></template>
            <template #geojson><strong>GeoJSON</strong></template>
          </i18n-t>
          <p class="text-verve-brown/80 leading-relaxed">
            {{ t('help.formats.developer') }}
          </p>
          <a href="https://verve-active.github.io/geojson/" target="_blank" rel="noopener noreferrer"
            class="inline-flex items-center gap-2 rounded-sm font-semibold text-verve-brown underline underline-offset-4 hover:text-verve-orange focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-verve-dark">
            {{ t('help.formats.link') }}
            <span class="sr-only">{{ t('help.formats.newTab') }}</span>
            <ExternalLink class="size-4" aria-hidden="true" />
          </a>
        </div>
        <!-- SECTION: Getting Started -->
        <div v-else-if="activeTab === 'start'" class="space-y-6 animate-fade-in">
          <h1 class="text-3xl font-bold text-verve-brown">{{ t('help.tabs.start') }}</h1>
          <p class="text-verve-brown/80">
            {{ t('help.start.introduction') }}
          </p>
          <div class="grid gap-4">
            <div class="p-4 border border-verve-medium/30 rounded-xl bg-verve-light/10">
              <h3 class="font-bold text-verve-brown mb-1">{{ t('help.start.profile') }}</h3>
              <p class="text-sm text-verve-brown/70">{{ t('help.start.profileDescription') }}
              </p>
            </div>
            <div class="p-4 border border-verve-medium/30 rounded-xl bg-verve-light/10">
              <h3 class="font-bold text-verve-brown mb-1">{{ t('help.start.upload') }}</h3>
              <p class="text-sm text-verve-brown/70">{{ t('help.start.uploadDescription') }}</p>
            </div>
            <div class="p-4 border border-verve-medium/30 rounded-xl bg-verve-light/10">
              <h3 class="font-bold text-verve-brown mb-1">{{ t('help.start.goals') }}</h3>
              <p class="text-sm text-verve-brown/70">{{ t('help.start.goalsDescription') }}</p>
            </div>
          </div>
        </div>

        <!-- SECTION: About -->
        <div v-else-if="activeTab === 'about'" class="space-y-6 animate-fade-in text-center py-12">
          <img src="@/assets/logo.svg" alt="Verve" class="h-16 mx-auto mb-4 opacity-80" />
          <h1 class="text-3xl font-bold text-verve-brown">Verve Outdoors</h1>
          <p class="text-verve-brown/60 max-w-lg mx-auto">
            {{ t('help.about.description') }}
          </p>
          <p class="text-xs text-verve-brown/40 font-mono">
            {{ t('help.about.version', { value: appVersion }) }}
          </p>
        </div>

      </main>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fade-in 0.3s ease-out forwards;
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(5px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
