<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, useId, watch } from "vue";
import { ChevronDown, Download, LoaderCircle } from "@lucide/vue";
import { fetchActivityExport, type ActivityExportFormat } from "@/services/api";
import { useAccountSession } from "@/composables/useAccountSession";

const props = defineProps<{ activityId: string }>();
const menuId = useId();
const root = ref<HTMLElement | null>(null);
const toggle = ref<HTMLButtonElement | null>(null);
const menu = ref<HTMLElement | null>(null);
const open = ref(false);
const busy = ref(false);
const error = ref<string | null>(null);
let generation = 0;
let active = true;
function reset() {
  generation++;
  open.value = false;
  busy.value = false;
  error.value = null;
}
useAccountSession(reset);
watch(() => props.activityId, reset, { flush: "sync" });
function close(restoreFocus = false) {
  open.value = false;
  if (restoreFocus) toggle.value?.focus();
}
async function showMenu(last = false) {
  if (busy.value) return;
  open.value = true;
  await nextTick();
  const items = menu.value?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
  items?.[last ? items.length - 1 : 0]?.focus();
}
function handleMenuKey(event: KeyboardEvent) {
  if (event.key === "Escape") {
    event.preventDefault();
    close(true);
    return;
  }
  const items = Array.from(
    menu.value?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [],
  );
  const current = items.indexOf(document.activeElement as HTMLButtonElement);
  let target: number;
  switch (event.key) {
    case "ArrowDown":
      target = (current + 1) % items.length;
      break;
    case "ArrowUp":
      target = (current - 1 + items.length) % items.length;
      break;
    case "Home":
      target = 0;
      break;
    case "End":
      target = items.length - 1;
      break;
    default:
      return;
  }
  event.preventDefault();
  items[target]?.focus();
}
function outside(event: PointerEvent) {
  if (event.target instanceof Node && !root.value?.contains(event.target)) close();
}
function focusLeft(event: FocusEvent) {
  if (!(event.relatedTarget instanceof Node) || !root.value?.contains(event.relatedTarget)) close();
}
async function download(format: ActivityExportFormat, fromMenu = false) {
  if (busy.value) return;
  close(fromMenu);
  const request = ++generation;
  const id = props.activityId;
  busy.value = true;
  error.value = null;
  try {
    const blob = await fetchActivityExport(id, format);
    if (!active || request !== generation) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    try {
      link.href = url;
      link.download = `activity-${id}.${format}`;
      document.body.append(link);
      link.click();
    } finally {
      link.remove();
      // Let the browser consume the URL before releasing the downloaded file.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  } catch (cause: unknown) {
    if (active && request === generation) {
      error.value = cause instanceof Error ? cause.message : "Failed to export activity.";
    }
  } finally {
    if (active && request === generation) {
      busy.value = false;
      if (fromMenu) {
        await nextTick();
        if (active && request === generation) toggle.value?.focus();
      }
    }
  }
}
onMounted(() => document.addEventListener("pointerdown", outside));
onUnmounted(() => {
  active = false;
  reset();
  document.removeEventListener("pointerdown", outside);
});
</script>

<template>
  <div ref="root" class="relative" @focusout="focusLeft">
    <div class="inline-flex rounded-xl border border-verve-medium text-sm font-semibold text-verve-brown"
      :aria-busy="busy">
      <button type="button"
        class="flex items-center gap-2 rounded-l-xl px-4 py-2 transition-colors hover:bg-verve-light focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-50"
        :disabled="busy" @click="download('geojson')">
        <LoaderCircle v-if="busy" class="size-4 animate-spin" aria-hidden="true" />
        <Download v-else class="size-4" aria-hidden="true" />
        {{ busy ? "Exporting…" : "Export" }}
      </button>
      <button ref="toggle" type="button"
        class="rounded-r-xl border-l border-verve-medium px-3 py-2 transition-colors hover:bg-verve-light focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-50"
        aria-label="Choose export format" aria-haspopup="menu" :aria-expanded="open" :aria-controls="menuId"
        :disabled="busy" @click="open ? close() : showMenu()" @keydown.down.prevent="showMenu()"
        @keydown.up.prevent="showMenu(true)" @keydown.esc.prevent="close(true)">
        <ChevronDown class="size-4" aria-hidden="true" />
      </button>
    </div>
    <div v-if="open" :id="menuId" ref="menu" role="menu" aria-label="Export format"
      class="absolute right-0 z-20 mt-2 min-w-56 rounded-xl border border-verve-medium bg-white p-1 shadow-lg"
      @keydown="handleMenuKey">
      <button type="button" role="menuitem" tabindex="-1"
        class="block w-full rounded-lg px-3 py-2 text-left text-sm text-verve-brown hover:bg-verve-light focus:bg-verve-light focus-visible:outline-2"
        @click="download('geojson', true)">
        Verve GeoJSON (.geojson)
      </button>
      <button type="button" role="menuitem" tabindex="-1"
        class="block w-full rounded-lg px-3 py-2 text-left text-sm text-verve-brown hover:bg-verve-light focus:bg-verve-light focus-visible:outline-2"
        @click="download('gpx', true)">
        GPX (.gpx)
      </button>
    </div>
    <span role="status" class="sr-only">{{ busy ? "Exporting activity…" : "" }}</span>
    <p v-if="error" role="alert" class="mt-2 max-w-64 text-sm text-red-600">{{ error }}</p>
  </div>
</template>
