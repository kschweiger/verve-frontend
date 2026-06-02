import { describe, expect, test } from 'bun:test';
import { parseActivityMetadata } from '../../src/activityMetadata/registry';

describe('parseActivityMetadata', () => {
  test('dispatches swimming metadata by target', () => {
    const parsed = parseActivityMetadata({
      target: 'SwimmingMetaData',
      pool_length_meters: 50,
      set_count: 1,
    });

    expect(parsed?.target).toBe('SwimmingMetaData');
    expect(parsed?.kind).toBe('swimming');
    expect(parsed?.data).toMatchObject({ poolLengthMeters: 50, setCount: 1 });
  });

  test('returns null for unknown metadata targets', () => {
    expect(parseActivityMetadata({ target: 'UnknownMetaData', value: 1 })).toBeNull();
  });

  test('returns null when target is missing', () => {
    expect(parseActivityMetadata({ pool_length_meters: 50 })).toBeNull();
  });
});
