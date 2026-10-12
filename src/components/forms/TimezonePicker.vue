<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { ChevronDown, Check, Search } from '@lucide/vue';
import { timezoneLabel, useTimezonePicker } from '@/composables/useTimezonePicker';

const props = withDefaults(
  defineProps<{
    modelValue: string;
    id: string;
    label: string;
    disabled?: boolean;
    describedBy?: string;
    allowEmpty?: boolean;
    suggestedTimezone?: string;
  }>(),
  { disabled: false, allowEmpty: false }
);
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
const root = ref<HTMLElement | null>(null);
const trigger = ref<HTMLButtonElement | null>(null);
const search = ref<HTMLInputElement | null>(null);
const list = ref<HTMLElement | null>(null);
const picker = useTimezonePicker({
  value: () => props.modelValue,
  disabled: () => props.disabled,
  allowEmpty: () => props.allowEmpty,
  suggestedTimezone: () => props.suggestedTimezone,
  select: (value) => emit('update:modelValue', value),
});
const { isOpen, query, results, activeIndex } = picker;
const selectedLabel = computed(() =>
  props.modelValue
    ? timezoneLabel(props.modelValue)
    : props.allowEmpty
      ? 'No override'
      : 'Select timezone'
);
const activeId = computed(() =>
  results.value[activeIndex.value] ? `${props.id}-option-${activeIndex.value}` : undefined
);
watch(isOpen, async (open, wasOpen) => {
  if (open || !wasOpen || !search.value || document.activeElement !== search.value) return;
  await nextTick();
  // Restore focus after an external update removes the focused input, without
  // interrupting Tab navigation or moving focus away from another control.
  if (!props.disabled && document.activeElement === document.body) trigger.value?.focus();
});
async function open(last = false) {
  picker.open(last);
  if (!isOpen.value) return;
  await nextTick();
  search.value?.focus();
  scrollActive();
}
function scrollActive() {
  const option = list.value?.children.item(activeIndex.value);
  if (option instanceof HTMLElement) option.scrollIntoView({ block: 'nearest' });
}
watch([activeIndex, results], async () => {
  await nextTick();
  scrollActive();
});
function cancel() {
  picker.close();
  trigger.value?.focus();
}
function select(value: string) {
  picker.select(value);
  trigger.value?.focus();
}
function handleKey(event: KeyboardEvent) {
  if (event.key === 'Tab') {
    picker.close();
    return;
  }
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', 'Escape'].includes(event.key)) return;
  event.preventDefault();
  if (event.key === 'Escape') cancel();
  else if (event.key === 'ArrowDown') picker.move(1);
  else if (event.key === 'ArrowUp') picker.move(-1);
  else if (event.key === 'Home') activeIndex.value = results.value.length ? 0 : -1;
  else if (event.key === 'End') activeIndex.value = results.value.length - 1;
  else if (event.key === 'Enter' && results.value[activeIndex.value])
    select(results.value[activeIndex.value]!.value);
}
function handleFocusOut(event: FocusEvent) {
  if (!(event.relatedTarget instanceof Node) || !root.value?.contains(event.relatedTarget))
    picker.close();
}
</script>

<template>
  <div ref="root" @focusout="handleFocusOut">
    <label
      :id="`${id}-label`"
      :for="id"
      class="block text-xs font-bold text-verve-brown/60 uppercase mb-1"
      >{{ label }}</label
    >
    <button
      :id="id"
      ref="trigger"
      type="button"
      :disabled="disabled"
      :aria-expanded="isOpen"
      :aria-controls="`${id}-panel`"
      :aria-describedby="describedBy"
      :aria-labelledby="`${id}-label ${id}-selection`"
      class="flex w-full items-center justify-between gap-3 rounded-xl border border-verve-medium bg-white px-3 py-2 text-left text-sm text-verve-brown focus-visible:outline-2 focus-visible:outline-verve-dark disabled:opacity-50"
      @click="isOpen ? cancel() : open()"
      @keydown.down.prevent="open()"
      @keydown.up.prevent="open(true)"
    >
      <span :id="`${id}-selection`" class="min-w-0">
        <span class="block truncate font-medium">{{ selectedLabel }}</span>
        <span v-if="modelValue" class="block truncate text-xs text-verve-brown/60">{{
          modelValue
        }}</span>
      </span>
      <ChevronDown class="size-4 shrink-0" aria-hidden="true" />
    </button>
    <div
      v-if="isOpen"
      :id="`${id}-panel`"
      class="mt-2 rounded-xl border border-verve-medium/40 bg-white"
    >
      <div class="relative p-2">
        <Search
          class="pointer-events-none absolute left-5 top-1/2 size-4 -translate-y-1/2 text-verve-brown/50"
          aria-hidden="true"
        />
        <input
          :id="`${id}-search`"
          ref="search"
          v-model="query"
          type="search"
          role="combobox"
          :aria-label="`Search ${label.toLowerCase()}`"
          aria-autocomplete="list"
          aria-expanded="true"
          :aria-controls="`${id}-list`"
          :aria-activedescendant="activeId"
          :aria-describedby="describedBy"
          autocomplete="off"
          placeholder="Search city or timezone…"
          class="w-full rounded-lg border border-verve-medium bg-white py-2 pl-9 pr-3 text-sm text-verve-brown focus-visible:outline-2 focus-visible:outline-verve-dark"
          @keydown="handleKey"
        />
      </div>
      <ul
        :id="`${id}-list`"
        ref="list"
        role="listbox"
        :aria-label="label"
        class="max-h-64 overflow-y-auto p-1"
      >
        <li
          v-for="(entry, index) in results"
          :id="`${id}-option-${index}`"
          :key="entry.value"
          role="option"
          :aria-selected="entry.value === modelValue"
          class="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm text-verve-brown hover:bg-verve-light"
          :class="index === activeIndex ? 'bg-verve-light' : ''"
          @pointerdown.prevent
          @click="select(entry.value)"
        >
          <span class="min-w-0">
            <span class="block font-medium"
              >{{ entry.label }}
              <span v-if="entry.suggested" class="text-xs font-normal text-verve-brown/60"
                >· Your timezone</span
              ></span
            >
            <span v-if="entry.value" class="block break-all text-xs text-verve-brown/60">{{
              entry.value
            }}</span>
          </span>
          <Check v-if="entry.value === modelValue" class="size-4 shrink-0" aria-hidden="true" />
        </li>
      </ul>
      <p v-if="!results.length" role="status" class="px-3 py-3 text-sm text-verve-brown/60">
        No matching timezones
      </p>
    </div>
  </div>
</template>
