<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { FileText, HelpCircle, Info, Rocket } from 'lucide-vue-next';
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

const geoJsonLineString = `{
  "type": "Feature",
  "geometry": {
    "type": "LineString",
    "coordinates": [
      [11.575, 48.137, 520],
      [11.576, 48.138, 522],
      [11.577, 48.139, 521]
    ]
  },
  "properties": {
    "coordTimes": [
      "2025-10-24T07:00:00Z",
      "2025-10-24T07:00:05Z",
      "2025-10-24T07:00:10Z"
    ],
    "heartRates": [140, 142, 145],
    "cadences": [80, 82, 81],
    "powers": [200, 210, 205]
  }
}`;

const geoJsonMultiLineString = `{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "segment_index": 0,
        "coordTimes": ["...", "..."]
      },
      "geometry": {
        "type": "LineString",
        "coordinates": [[...], [...]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "segment_index": 1,
        "coordTimes": ["...", "..."]
      },
      "geometry": {
        "type": "LineString",
        "coordinates": [[...], [...]]
      }
    }
  ]
}`;

const geoJsonPoints = `{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [11.575, 48.137, 520]
      },
      "properties": {
        "time": "2025-10-24T07:00:00Z",
        "hr": 140,
        "cad": 80,
        "power": 200
      }
    },
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [11.576, 48.138, 522]
      },
      "properties": {
        "time": "2025-10-24T07:00:05Z",
        "hr": 142,
        "cad": 82,
        "power": 210
      }
    }
  ]
}`;

const verveJsonExample = `{
  "type": "FeatureCollection",
  "properties": {
    "verveVersion": "1.0",
    "generator": "VerveBackend",
    "name": "Sunday Morning Ride",
    "description": "Easy pace through the hills.",
    "activityType": "Cycling",
    "activitySubType": "Road",
    "startTime": "2026-02-28T09:00:00Z",
    "durationSeconds": 3600.5,
    "movingDurationSeconds": 3400.0,
    "totalDistanceMeters": 25000.0,
    "totalEnergyKcal": 650,
    "elevationGain": 150.0,
    "elevationLoss": 150.0,
    "stats": {
      "heartRate": { "avg": 145, "max": 170, "min": 110 },
      "speed": { "avg": 25.5, "max": 45.0 },
      "power": { "avg": 180, "max": 400 }
    },
    "equipment": [
      {
        "name": "Tarmac SL7",
        "type": "Bike",
        "brand": "Specialized"
      }
    ],
    "metadata": { "source": "Garmin Edge" }
  },
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [11.582, 48.135, 520],
          [11.583, 48.136, 521]
        ]
      },
      "properties": {
        "coordTimes": ["2026-02-28T09:00:00Z", "2026-02-28T09:00:05Z"],
        "heartRates": [140, 142],
        "cadences": [85, 87],
        "powers": [200, 210],
        "temperatures": [18.5, 18.5]
      }
    }
  ]
}`;
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
          </div>
        </div>

        <!-- SECTION: File Formats -->
        <div v-else-if="activeTab === 'formats'" class="space-y-6 animate-fade-in">
          <h1 class="text-3xl font-bold text-verve-brown border-b border-verve-medium/20 pb-4">Verve JSON Format</h1>

          <p class="text-verve-brown/80 leading-relaxed">
            Verve supports standard <strong>GPX</strong>, <strong>FIT</strong>, and <strong>GeoJSON</strong> files.
            The following <strong>GeoJSON</strong> variants are supported:
          </p>

          <!-- Variant 1 -->
          <h2 class="text-xl font-bold text-verve-brown mt-4">LineString + Arrays</h2>
          <p class="text-verve-brown/80 leading-relaxed text-sm">
            Coordinates are stored as a LineString geometry and the time, heart rate, cadence and
            power values are stored as arrays in the properties. The arrays must be of the same length
            as the number of coordinates in the LineString.
          </p>
          <div class="bg-gray-900 rounded-xl p-4 overflow-x-auto text-xs font-mono text-gray-100 shadow-inner">
            <pre>{{ geoJsonLineString }}</pre>
          </div>

          <!-- Variant 2 -->
          <h3 class="text-lg font-bold text-verve-brown mt-4">Multiple segments</h3>
          <p class="text-verve-brown/80 leading-relaxed text-sm">
            Multiple segments can be represented as multiple features in a FeatureCollection and is only available in
            the LineString + Arrays configuration. Each feature must have a <code>segment_index</code> property that
            indicates the index
            of the segment in the track. The coordTimes, heartRates, cadences, and powers properties must be arrays of
            the
            same length as the number of coordinates in the LineString geometry of the feature.
          </p>
          <div class="bg-gray-900 rounded-xl p-4 overflow-x-auto text-xs font-mono text-gray-100 shadow-inner">
            <pre>{{ geoJsonMultiLineString }}</pre>
          </div>

          <!-- Variant 3 -->
          <h2 class="text-xl font-bold text-verve-brown mt-4">Collection of Points</h2>
          <p class="text-verve-brown/80 leading-relaxed text-sm">
            Data is fully represented by a FeatureCollection and each feature represents a single point in the track.
            The time, heart rate, cadence and power values are stored as properties of each feature. The geometry of
            each
            feature must be a Point geometry with the coordinates representing the latitude, longitude and elevation of
            the point.
          </p>
          <div class="bg-gray-900 rounded-xl p-4 overflow-x-auto text-xs font-mono text-gray-100 shadow-inner">
            <pre>{{ geoJsonPoints }}</pre>
          </div>

          <!-- Variant 4: Verve Extension -->
          <h2 class="text-xl font-bold text-verve-brown mt-4">Verve GeoJSON extension</h2>
          <p class="text-verve-brown/80 leading-relaxed text-sm">
            For advanced use cases or custom imports, you can use the <strong>Verve GeoJSON</strong> format. It is still
            a valid <strong>GeoJSON</strong> in the LineString + Arrays configuration that adds a
            <code>properties</code> attribute at the top level of the FeatureCollection.
          </p>
          <div class="bg-gray-900 rounded-xl p-4 overflow-x-auto text-xs font-mono text-gray-100 shadow-inner">
            <pre>{{ verveJsonExample }}</pre>
          </div>


          <!-- Detailed description start  -->
          <h3 class="text-lg font-bold text-verve-brown mt-6 mb-3">Top-Level Properties Reference</h3>
          <div class="overflow-x-auto border border-verve-medium/30 rounded-xl">
            <table class="w-full text-sm text-left bg-white">
              <thead class="text-xs text-verve-brown/60 uppercase bg-verve-light/50 border-b border-verve-medium/30">
                <tr>
                  <th class="px-4 py-3">Property</th>
                  <th class="px-4 py-3">Type</th>
                  <th class="px-4 py-3 text-center">Required</th>
                  <th class="px-4 py-3">Description</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-verve-medium/10">
                <tr class="bg-verve-light/10">
                  <td colspan="4" class="px-4 py-2 font-bold text-verve-brown text-xs uppercase tracking-wider">Metadata
                  </td>
                </tr>
                <tr>
                  <td class="px-4 py-2 font-mono text-xs">verveVersion</td>
                  <td class="px-4 py-2 text-xs">"1.0"</td>
                  <td class="px-4 py-2 text-xs text-center text-verve-orange font-bold">Yes</td>
                  <td class="px-4 py-2 text-xs text-verve-brown/60">The schema version.</td>
                </tr>
                <tr>
                  <td class="px-4 py-2 font-mono text-xs">generator</td>
                  <td class="px-4 py-2 text-xs">String</td>
                  <td class="px-4 py-2 text-xs text-center text-verve-orange font-bold">Yes</td>
                  <td class="px-4 py-2 text-xs text-verve-brown/60">Name of the application generating the file.</td>
                </tr>
                <tr>
                  <td class="px-4 py-2 font-mono text-xs">name</td>
                  <td class="px-4 py-2 text-xs">String</td>
                  <td class="px-4 py-2 text-xs text-center text-verve-orange font-bold">Yes</td>
                  <td class="px-4 py-2 text-xs text-verve-brown/60">Display title of the activity.</td>
                </tr>
                <tr>
                  <td class="px-4 py-2 font-mono text-xs">description</td>
                  <td class="px-4 py-2 text-xs">String</td>
                  <td class="px-4 py-2 text-xs text-center text-verve-brown/40">No</td>
                  <td class="px-4 py-2 text-xs text-verve-brown/60">Notes or details.</td>
                </tr>
                <tr>
                  <td class="px-4 py-2 font-mono text-xs">activityType</td>
                  <td class="px-4 py-2 text-xs">String</td>
                  <td class="px-4 py-2 text-xs text-center text-verve-orange font-bold">Yes</td>
                  <td class="px-4 py-2 text-xs text-verve-brown/60">Main category (e.g. "Cycling").</td>
                </tr>
                <tr>
                  <td class="px-4 py-2 font-mono text-xs">activitySubType</td>
                  <td class="px-4 py-2 text-xs">String</td>
                  <td class="px-4 py-2 text-xs text-center text-verve-brown/40">No</td>
                  <td class="px-4 py-2 text-xs text-verve-brown/60">Sub category (e.g. "Road").</td>
                </tr>
                <tr>
                  <td class="px-4 py-2 font-mono text-xs">startTime</td>
                  <td class="px-4 py-2 text-xs">String</td>
                  <td class="px-4 py-2 text-xs text-center text-verve-orange font-bold">Yes</td>
                  <td class="px-4 py-2 text-xs text-verve-brown/60">ISO 8601 Timestamp.</td>
                </tr>

                <tr class="bg-verve-light/10">
                  <td colspan="4" class="px-4 py-2 font-bold text-verve-brown text-xs uppercase tracking-wider">Metrics
                  </td>
                </tr>
                <tr>
                  <td class="px-4 py-2 font-mono text-xs">durationSeconds</td>
                  <td class="px-4 py-2 text-xs">Float</td>
                  <td class="px-4 py-2 text-xs text-center text-verve-orange font-bold">Yes</td>
                  <td class="px-4 py-2 text-xs text-verve-brown/60">Total duration in seconds.</td>
                </tr>
                <tr>
                  <td class="px-4 py-2 font-mono text-xs">movingDurationSeconds</td>
                  <td class="px-4 py-2 text-xs">Float</td>
                  <td class="px-4 py-2 text-xs text-center text-verve-brown/40">No</td>
                  <td class="px-4 py-2 text-xs text-verve-brown/60">Moving duration in seconds.</td>
                </tr>
                <tr>
                  <td class="px-4 py-2 font-mono text-xs">totalDistanceMeters</td>
                  <td class="px-4 py-2 text-xs">Float</td>
                  <td class="px-4 py-2 text-xs text-center text-verve-brown/40">No</td>
                  <td class="px-4 py-2 text-xs text-verve-brown/60">Total distance in meters.</td>
                </tr>
                <tr>
                  <td class="px-4 py-2 font-mono text-xs">totalEnergyKcal</td>
                  <td class="px-4 py-2 text-xs">Float</td>
                  <td class="px-4 py-2 text-xs text-center text-verve-brown/40">No</td>
                  <td class="px-4 py-2 text-xs text-verve-brown/60">Energy in kcal.</td>
                </tr>
                <tr>
                  <td class="px-4 py-2 font-mono text-xs">elevationGain</td>
                  <td class="px-4 py-2 text-xs">Float</td>
                  <td class="px-4 py-2 text-xs text-center text-verve-brown/40">No</td>
                  <td class="px-4 py-2 text-xs text-verve-brown/60">Total ascent in meters.</td>
                </tr>
                <tr>
                  <td class="px-4 py-2 font-mono text-xs">elevationLoss</td>
                  <td class="px-4 py-2 text-xs">Float</td>
                  <td class="px-4 py-2 text-xs text-center text-verve-brown/40">No</td>
                  <td class="px-4 py-2 text-xs text-verve-brown/60">Total descent in meters.</td>
                </tr>
                <tr>
                  <td class="px-4 py-2 font-mono text-xs">stats</td>
                  <td class="px-4 py-2 text-xs">Object</td>
                  <td class="px-4 py-2 text-xs text-center text-verve-brown/40">No</td>
                  <td class="px-4 py-2 text-xs text-verve-brown/60">
                    Aggregates for <code>heartRate</code>, <code>speed</code>, <code>power</code>, <code>cadence</code>.
                  </td>
                </tr>

                <tr class="bg-verve-light/10">
                  <td colspan="4" class="px-4 py-2 font-bold text-verve-brown text-xs uppercase tracking-wider">Context
                  </td>
                </tr>
                <tr>
                  <td class="px-4 py-2 font-mono text-xs">equipment</td>
                  <td class="px-4 py-2 text-xs">Array</td>
                  <td class="px-4 py-2 text-xs text-center text-verve-brown/40">No</td>
                  <td class="px-4 py-2 text-xs text-verve-brown/60">List of equipment objects (name, type, brand).</td>
                </tr>
                <tr>
                  <td class="px-4 py-2 font-mono text-xs">metadata</td>
                  <td class="px-4 py-2 text-xs">Object</td>
                  <td class="px-4 py-2 text-xs text-center text-verve-brown/40">No</td>
                  <td class="px-4 py-2 text-xs text-verve-brown/60">Arbitrary key-value store for extra data.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 class="text-lg font-bold text-verve-brown mt-6 mb-3">Statistics Object Structure</h3>
          <p class="text-verve-brown/80 leading-relaxed text-sm mb-2">
            The <code>stats</code> object contains grouped metrics. Each key below is optional and maps to a
            <code>MetricSummary</code> object.
          </p>
          <div class="overflow-x-auto border border-verve-medium/30 rounded-xl">
            <table class="w-full text-sm text-left bg-white">
              <thead class="text-xs text-verve-brown/60 uppercase bg-verve-light/50 border-b border-verve-medium/30">
                <tr>
                  <th class="px-4 py-3">Property</th>
                  <th class="px-4 py-3">Type</th>
                  <th class="px-4 py-3 text-center">Required</th>
                  <th class="px-4 py-3">Description</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-verve-medium/10">
                <tr class="bg-verve-light/10">
                  <td colspan="4" class="px-4 py-2 font-bold text-verve-brown text-xs uppercase tracking-wider">
                    Available Metric Keys</td>
                </tr>
                <tr>
                  <td class="px-4 py-2 font-mono text-xs">speed</td>
                  <td class="px-4 py-2 text-xs">MetricSummary</td>
                  <td class="px-4 py-2 text-xs text-center text-verve-brown/40">No</td>
                  <td class="px-4 py-2 text-xs text-verve-brown/60">Speed metrics.</td>
                </tr>
                <tr>
                  <td class="px-4 py-2 font-mono text-xs">heartRate</td>
                  <td class="px-4 py-2 text-xs">MetricSummary</td>
                  <td class="px-4 py-2 text-xs text-center text-verve-brown/40">No</td>
                  <td class="px-4 py-2 text-xs text-verve-brown/60">Heart rate metrics.</td>
                </tr>
                <tr>
                  <td class="px-4 py-2 font-mono text-xs">power</td>
                  <td class="px-4 py-2 text-xs">MetricSummary</td>
                  <td class="px-4 py-2 text-xs text-center text-verve-brown/40">No</td>
                  <td class="px-4 py-2 text-xs text-verve-brown/60">Power metrics.</td>
                </tr>
                <tr>
                  <td class="px-4 py-2 font-mono text-xs">cadence</td>
                  <td class="px-4 py-2 text-xs">MetricSummary</td>
                  <td class="px-4 py-2 text-xs text-center text-verve-brown/40">No</td>
                  <td class="px-4 py-2 text-xs text-verve-brown/60">Cadence metrics.</td>
                </tr>

                <tr class="bg-verve-light/10">
                  <td colspan="4" class="px-4 py-2 font-bold text-verve-brown text-xs uppercase tracking-wider">
                    MetricSummary Properties</td>
                </tr>
                <tr>
                  <td class="px-4 py-2 font-mono text-xs">avg</td>
                  <td class="px-4 py-2 text-xs">Float</td>
                  <td class="px-4 py-2 text-xs text-center text-verve-brown/40">No</td>
                  <td class="px-4 py-2 text-xs text-verve-brown/60">Average value.</td>
                </tr>
                <tr>
                  <td class="px-4 py-2 font-mono text-xs">max</td>
                  <td class="px-4 py-2 text-xs">Float</td>
                  <td class="px-4 py-2 text-xs text-center text-verve-brown/40">No</td>
                  <td class="px-4 py-2 text-xs text-verve-brown/60">Maximum value.</td>
                </tr>
                <tr>
                  <td class="px-4 py-2 font-mono text-xs">min</td>
                  <td class="px-4 py-2 text-xs">Float</td>
                  <td class="px-4 py-2 text-xs text-center text-verve-brown/40">No</td>
                  <td class="px-4 py-2 text-xs text-verve-brown/60">Minimum value.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 class="text-lg font-bold text-verve-brown mt-6 mb-3">Feature Properties (Track Data)</h3>
          <p class="text-verve-brown/80 leading-relaxed text-sm mb-2">
            These arrays must be the same length as the <code>geometry.coordinates</code>.
          </p>
          <div class="overflow-x-auto border border-verve-medium/30 rounded-xl">
            <table class="w-full text-sm text-left bg-white">
              <thead class="text-xs text-verve-brown/60 uppercase bg-verve-light/50 border-b border-verve-medium/30">
                <tr>
                  <th class="px-4 py-3">Property</th>
                  <th class="px-4 py-3">Type</th>
                  <th class="px-4 py-3 text-center">Required</th>
                  <th class="px-4 py-3">Description</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-verve-medium/10">
                <tr>
                  <td class="px-4 py-2 font-mono text-xs">coordTimes</td>
                  <td class="px-4 py-2 text-xs">Array[String]</td>
                  <td class="px-4 py-2 text-xs text-center text-verve-orange font-bold">Yes</td>
                  <td class="px-4 py-2 text-xs text-verve-brown/60">List of ISO 8601 Timestamps.</td>
                </tr>
                <tr>
                  <td class="px-4 py-2 font-mono text-xs">heartRates</td>
                  <td class="px-4 py-2 text-xs">Array[Int]</td>
                  <td class="px-4 py-2 text-xs text-center text-verve-brown/40">No</td>
                  <td class="px-4 py-2 text-xs text-verve-brown/60">BPM values.</td>
                </tr>
                <tr>
                  <td class="px-4 py-2 font-mono text-xs">powers</td>
                  <td class="px-4 py-2 text-xs">Array[Float]</td>
                  <td class="px-4 py-2 text-xs text-center text-verve-brown/40">No</td>
                  <td class="px-4 py-2 text-xs text-verve-brown/60">Watts.</td>
                </tr>
                <tr>
                  <td class="px-4 py-2 font-mono text-xs">cadences</td>
                  <td class="px-4 py-2 text-xs">Array[Int]</td>
                  <td class="px-4 py-2 text-xs text-center text-verve-brown/40">No</td>
                  <td class="px-4 py-2 text-xs text-verve-brown/60">RPM.</td>
                </tr>
                <tr>
                  <td class="px-4 py-2 font-mono text-xs">temperatures</td>
                  <td class="px-4 py-2 text-xs">Array[Float]</td>
                  <td class="px-4 py-2 text-xs text-center text-verve-brown/40">No</td>
                  <td class="px-4 py-2 text-xs text-verve-brown/60">Degrees Celsius.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <!-- Detailed description end  -->
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
