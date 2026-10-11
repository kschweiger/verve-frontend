import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue';
import { supportedTimezones } from '../services/timezones';

export function timezoneLabel(zone: string): string {
  return (zone.split('/').at(-1) ?? zone).replaceAll('_', ' ');
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\s_/]+/g, ' ')
    .trim();
}

export function useTimezonePicker(options: {
  value: MaybeRefOrGetter<string>;
  disabled: MaybeRefOrGetter<boolean>;
  allowEmpty: MaybeRefOrGetter<boolean>;
  suggestedTimezone: MaybeRefOrGetter<string | undefined>;
  select: (value: string) => void;
}) {
  const isOpen = ref(false);
  const query = ref('');
  const activeIndex = ref(-1);
  const results = computed(() => {
    const words = normalize(query.value).split(' ').filter(Boolean);
    const suggestion = toValue(options.suggestedTimezone);
    const zones = [...supportedTimezones].sort();
    if (!words.length && suggestion && zones.includes(suggestion)) {
      zones.splice(zones.indexOf(suggestion), 1);
      zones.unshift(suggestion);
    }
    const entries = zones.map((value) => ({
      value,
      label: timezoneLabel(value),
      suggested: value === suggestion,
    }));
    if (toValue(options.allowEmpty))
      entries.unshift({ value: '', label: 'No override', suggested: false });
    return entries.filter((entry) =>
      words.every((word) => normalize(`${entry.label} ${entry.value}`).includes(word))
    );
  });
  watch(
    query,
    () => {
      activeIndex.value = results.value.length ? 0 : -1;
    },
    { flush: 'sync' }
  );
  function close() {
    isOpen.value = false;
    query.value = '';
    activeIndex.value = -1;
  }
  function open(last = false) {
    if (toValue(options.disabled)) return;
    query.value = '';
    isOpen.value = true;
    const selected = results.value.findIndex((entry) => entry.value === toValue(options.value));
    activeIndex.value = last ? results.value.length - 1 : Math.max(0, selected);
  }
  function move(direction: number) {
    if (!results.value.length) {
      activeIndex.value = -1;
      return;
    }
    activeIndex.value = Math.max(
      0,
      Math.min(results.value.length - 1, activeIndex.value + direction)
    );
  }
  function select(value: string) {
    if (toValue(options.disabled) || !results.value.some((entry) => entry.value === value)) return;
    options.select(value);
    close();
  }
  function selectActive() {
    const entry = results.value[activeIndex.value];
    if (entry) select(entry.value);
  }
  watch(
    () => toValue(options.disabled),
    (disabled) => {
      if (disabled) close();
    }
  );
  watch(() => toValue(options.value), close);
  return { isOpen, query, activeIndex, results, open, close, move, select, selectActive };
}
