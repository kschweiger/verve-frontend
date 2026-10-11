import { describe, expect, test } from 'bun:test';
import * as edit from '../../src/utils/activityEdit';

const original = {
  name: 'Hike',
  timezone: 'America/Los_Angeles',
  type_id: 1,
  sub_type_id: null,
  distance: 1.2345,
  durationSeconds: 600.75,
};

describe('activity editor updates', () => {
  test('unchanged displayed values do not submit rounded distance or duration', () => {
    const baseline = edit.toActivityEditValues(original);
    expect(baseline.distance).toBe(1.23);
    expect(baseline.durationSeconds).toBe(600);
    expect(edit.buildActivityUpdate(baseline, { ...baseline })).toEqual({});
  });

  test('changing only timezone sends only timezone', () => {
    const baseline = edit.toActivityEditValues(original);
    expect(edit.buildActivityUpdate(baseline, { ...baseline, timezone: 'Europe/Berlin' })).toEqual({
      timezone: 'Europe/Berlin',
    });
  });

  test('combines timezone with other deliberate changes', () => {
    const baseline = edit.toActivityEditValues(original);
    expect(
      edit.buildActivityUpdate(baseline, {
        ...baseline,
        timezone: 'Asia/Tokyo',
        name: 'Renamed hike',
        distance: 2,
        durationSeconds: 900,
      })
    ).toEqual({ timezone: 'Asia/Tokyo', name: 'Renamed hike', distance: 2, duration: 'PT15M' });
  });

  test('rejects invalid timezone and changed zero duration', () => {
    const baseline = edit.toActivityEditValues(original);
    expect(() => edit.buildActivityUpdate(baseline, { ...baseline, timezone: '' })).toThrow();
    expect(() => edit.buildActivityUpdate(baseline, { ...baseline, durationSeconds: 0 })).toThrow();
  });
});
