<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { ExternalLink, FileText, HelpCircle, Info, Rocket } from '@lucide/vue';
const appVersion = import.meta.env.VITE_APP_VERSION;
const route = useRoute();
const activeTab = ref(route.hash.replace('#', '') || 'faq');

const tabs = [
  { id: 'start', label: 'Getting Started', icon: Rocket },
  { id: 'faq', label: 'FAQ', icon: HelpCircle },
  { id: 'formats', label: 'File Formats', icon: FileText },
  { id: 'about', label: 'About', icon: Info },
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
        <nav class="bg-white rounded-xl shadow-sm border border-verve-medium/30 overflow-hidden sticky top-6">
          <div class="p-4 border-b border-verve-medium/20 bg-verve-light/30">
            <h2 class="font-bold text-verve-brown text-lg">Help Center</h2>
          </div>
          <ul class="flex flex-col">
            <li v-for="tab in tabs" :key="tab.id">
              <button @click="activeTab = tab.id"
                class="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-l-4"
                :class="activeTab === tab.id
                  ? 'bg-verve-light/50 text-verve-brown border-verve-orange'
                  : 'text-verve-brown/60 hover:bg-verve-light/30 hover:text-verve-brown border-transparent'
                  ">
                <component :is="tab.icon" class="size-4" />
                {{ tab.label }}
              </button>
            </li>
          </ul>
        </nav>
      </aside>

      <!-- Main Content -->
      <main class="md:col-span-3 bg-white rounded-xl shadow-sm border border-verve-medium/30 p-8 min-h-[500px]">

        <!-- SECTION: FAQ -->
        <div v-if="activeTab === 'faq'" class="space-y-8 animate-fade-in">
          <h1 class="text-3xl font-bold text-verve-brown mb-6">Frequently Asked Questions</h1>

          <div class="space-y-4">
            <details
              class="group bg-verve-light/10 rounded-xl border border-verve-medium/20 open:bg-verve-light/20 transition-colors">
              <summary
                class="flex justify-between items-center cursor-pointer p-4 font-bold text-verve-brown list-none">
                <span>How do I delete an activity?</span>
                <span class="transition group-open:rotate-180">▼</span>
              </summary>
              <div class="px-4 pb-4 text-verve-brown/80 text-sm leading-relaxed">
                Go to the activity detail page. In the top right corner, click the red trash icon. You will be asked to
                confirm the deletion.
              </div>
            </details>

            <details
              class="group bg-verve-light/10 rounded-xl border border-verve-medium/20 open:bg-verve-light/20 transition-colors">
              <summary
                class="flex justify-between items-center cursor-pointer p-4 font-bold text-verve-brown list-none">
                <span>Can I track equipment usage?</span>
                <span class="transition group-open:rotate-180">▼</span>
              </summary>
              <div class="px-4 pb-4 text-verve-brown/80 text-sm leading-relaxed">
                Yes! Go to the "My Gear" section to define your shoes, bikes, etc. You can then assign them to
                activities either manually or by setting up default equipment sets for specific activity types.
              </div>
            </details>

            <details
              class="group bg-verve-light/10 rounded-xl border border-verve-medium/20 open:bg-verve-light/20 transition-colors">
              <summary
                class="flex justify-between items-center cursor-pointer p-4 font-bold text-verve-brown list-none">
                <span>How does the Heatmap work?</span>
                <span class="transition group-open:rotate-180">▼</span>
              </summary>
              <div class="px-4 pb-4 text-verve-brown/80 text-sm leading-relaxed">
                The heatmap aggregates all GPS points from your activities. You can filter which years or activity types
                are included in the settings or directly on the heatmap view.
              </div>
            </details>

            <details
              class="group bg-verve-light/10 rounded-xl border border-verve-medium/20 open:bg-verve-light/20 transition-colors">
              <summary
                class="flex justify-between items-center cursor-pointer p-4 font-bold text-verve-brown list-none">
                <span>What swimming metadata does Verve support?</span>
                <span class="transition group-open:rotate-180">▼</span>
              </summary>
              <div class="px-4 pb-4 text-verve-brown/80 text-sm leading-relaxed space-y-3">
                <p>
                  Verve files can include source-neutral swimming metadata under
                  <code class="font-mono text-xs bg-white/70 px-1.5 py-0.5 rounded">metadata.target =
                    "SwimmingMetaData"</code>.
                  This can describe pool length, total stroke count, average SWOLF, lap count, set count, stroke
                  styles, laps, and sets.
                </p>
                <p>
                  Laps are the smallest exported swim records, usually one pool length. Sets group one or more laps,
                  such as a 100 m breaststroke set made from two 50 m laps. Activity detail can show the general swim
                  summary and set table when meaningful swim metadata is available.
                </p>
                <p>
                  Pool length is optional, so open-water swims or incomplete exports can still be valid. Swimming
                  location type belongs to the activity type and subtype, not inside the swim metadata itself.
                </p>
              </div>
            </details>

            <details
              class="group bg-verve-light/10 rounded-xl border border-verve-medium/20 open:bg-verve-light/20 transition-colors">
              <summary
                class="flex justify-between items-center cursor-pointer p-4 font-bold text-verve-brown list-none">
                <span>What is SWOLF?</span>
                <span class="transition group-open:rotate-180">▼</span>
              </summary>
              <div class="px-4 pb-4 text-verve-brown/80 text-sm leading-relaxed">
                SWOLF means swim golf. For a pool length, it is the length duration in seconds plus the stroke count.
                For example, a 50 m length completed in 54 seconds with 26 strokes has a SWOLF score of 80. Lower
                values are better when comparing the same pool length.
              </div>
            </details>
          </div>
        </div>

        <!-- SECTION: File Formats -->
        <div v-else-if="activeTab === 'formats'" class="space-y-6 animate-fade-in">
          <h1 class="text-3xl font-bold text-verve-brown border-b border-verve-medium/20 pb-4">File Formats</h1>

          <p class="text-verve-brown/80 leading-relaxed">
            Verve supports <strong>GPX</strong>, <strong>FIT</strong>, and <strong>GeoJSON</strong> files.
          </p>
          <p class="text-verve-brown/80 leading-relaxed">
            Building an integration or creating custom activity files? The Verve file format definition and
            examples are available in the developer documentation.
          </p>
          <a href="https://verve-active.github.io/geojson/" target="_blank" rel="noopener noreferrer"
            class="inline-flex items-center gap-2 rounded-sm font-semibold text-verve-brown underline underline-offset-4 hover:text-verve-orange focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-verve-dark">
            Verve file format documentation
            <span class="sr-only">(opens in a new tab)</span>
            <ExternalLink class="size-4" aria-hidden="true" />
          </a>
        </div>
        <!-- SECTION: Getting Started -->
        <div v-else-if="activeTab === 'start'" class="space-y-6 animate-fade-in">
          <h1 class="text-3xl font-bold text-verve-brown">Getting Started</h1>
          <p class="text-verve-brown/80">
            Welcome to Verve Outdoors! Here is how to set up your profile and start tracking.
          </p>
          <div class="grid gap-4">
            <div class="p-4 border border-verve-medium/30 rounded-xl bg-verve-light/10">
              <h3 class="font-bold text-verve-brown mb-1">1. Configure your Profile</h3>
              <p class="text-sm text-verve-brown/70">Set your default activity types in Settings to speed up uploads.
              </p>
            </div>
            <div class="p-4 border border-verve-medium/30 rounded-xl bg-verve-light/10">
              <h3 class="font-bold text-verve-brown mb-1">2. Upload Activities</h3>
              <p class="text-sm text-verve-brown/70">Use the dashboard widget to upload GPX files from your watch or
                phone.</p>
            </div>
            <div class="p-4 border border-verve-medium/30 rounded-xl bg-verve-light/10">
              <h3 class="font-bold text-verve-brown mb-1">3. Define Goals</h3>
              <p class="text-sm text-verve-brown/70">Set weekly or monthly distance goals to stay motivated.</p>
            </div>
          </div>
        </div>

        <!-- SECTION: About -->
        <div v-else-if="activeTab === 'about'" class="space-y-6 animate-fade-in text-center py-12">
          <img src="@/assets/logo.svg" alt="Verve" class="h-16 mx-auto mb-4 opacity-80" />
          <h1 class="text-3xl font-bold text-verve-brown">Verve Outdoors</h1>
          <p class="text-verve-brown/60 max-w-lg mx-auto">
            A privacy-focused, self-hosted activity tracker designed for outdoor enthusiasts who want full control over
            their data.
          </p>
          <p class="text-xs text-verve-brown/40 font-mono">
            Version {{ appVersion }}
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
