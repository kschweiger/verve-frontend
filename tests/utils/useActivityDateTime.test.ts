import { describe, expect, test } from 'bun:test';
import { ref } from 'vue';
import { useActivityDateTime } from '../../src/composables/useActivityDateTime';

describe('reactive activity date display', () => {
  test('updates the displayed date when activity or assigned timezone changes', () => {
    const activity = ref({ start: '2026-08-11T06:30:00Z', timezone: 'America/Los_Angeles' });
    const display = useActivityDateTime(activity, 'sv-SE');
    expect(display.value.date).toBe('2026-08-10');
    expect(display.value.time).toContain('23:30');
    activity.value.timezone = 'Europe/Berlin';
    expect(display.value.date).toBe('2026-08-11');
    expect(display.value.time).toContain('08:30');
    expect(activity.value.start).toBe('2026-08-11T06:30:00Z');
  });

  test('an unnamed or unavailable-zone activity still has a date display', () => {
    const display = useActivityDateTime(() => ({
      start: '2026-08-10T08:00:00Z',
      timezone: 'Factory',
    }));
    expect(display.value.dateTime).toContain('Local time unavailable');
    expect(display.value.date).toContain('Factory');
    expect(display.value.time).toBe('');
  });
});
