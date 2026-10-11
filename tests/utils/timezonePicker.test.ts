import { expect, test } from 'bun:test';
import { effectScope, nextTick, ref } from 'vue';
import { timezoneLabel, useTimezonePicker } from '../../src/composables/useTimezonePicker';

function setup(allowEmpty = false) {
  const scope = effectScope();
  const value = ref('Europe/Berlin');
  const disabled = ref(false);
  const picker = scope.run(() =>
    useTimezonePicker({
      value,
      disabled,
      allowEmpty,
      suggestedTimezone: 'Europe/Berlin',
      select: (selected) => {
        value.value = selected;
      },
    })
  )!;
  return { picker, value, disabled, stop: () => scope.stop() };
}

test('labels preserve identifiers without cities', () => {
  expect(timezoneLabel('America/New_York')).toBe('New York');
  expect(timezoneLabel('UTC')).toBe('UTC');
});
test('search matches normalized multiword identifiers and retains aliases', () => {
  const { picker, stop } = setup();
  picker.open();
  picker.query.value = 'AMERICA new york';
  expect(picker.results.value.map((entry) => entry.value)).toEqual(['America/New_York']);
  picker.query.value = 'us eastern';
  expect(picker.results.value.some((entry) => entry.value === 'US/Eastern')).toBe(true);
  picker.query.value = 'unfindable';
  expect(picker.results.value).toHaveLength(0);
  expect(picker.activeIndex.value).toBe(-1);
  stop();
});
test('empty search pins the suggestion without duplicating it', () => {
  const { picker, stop } = setup();
  expect(picker.results.value[0]?.value).toBe('Europe/Berlin');
  expect(picker.results.value.filter((entry) => entry.value === 'Europe/Berlin')).toHaveLength(1);
  stop();
});
test('typing and cancelling preserve the committed selection', () => {
  const { picker, value, stop } = setup();
  picker.open();
  picker.query.value = 'tokyo';
  expect(value.value).toBe('Europe/Berlin');
  picker.close();
  expect(value.value).toBe('Europe/Berlin');
  expect(picker.query.value).toBe('');
  picker.open();
  picker.query.value = 'tokyo';
  picker.selectActive();
  expect(value.value).toBe('Asia/Tokyo');
  expect(picker.isOpen.value).toBe(false);
  stop();
});
test('navigation clamps to results and optional empty value can be committed', () => {
  const { picker, value, stop } = setup(true);
  picker.open(true);
  expect(picker.activeIndex.value).toBe(picker.results.value.length - 1);
  picker.move(1);
  expect(picker.activeIndex.value).toBe(picker.results.value.length - 1);
  picker.move(-10000);
  expect(picker.activeIndex.value).toBe(0);
  picker.selectActive();
  expect(value.value).toBe('');
  stop();
});
test('disabled and externally updated values close the picker', async () => {
  const { picker, value, disabled, stop } = setup();
  picker.open();
  value.value = 'UTC';
  await nextTick();
  expect(picker.isOpen.value).toBe(false);
  picker.open();
  disabled.value = true;
  await nextTick();
  expect(picker.isOpen.value).toBe(false);
  picker.open();
  picker.select('Europe/Berlin');
  expect(picker.isOpen.value).toBe(false);
  expect(value.value).toBe('UTC');
  stop();
});
