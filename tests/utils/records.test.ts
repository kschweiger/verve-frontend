import { describe, expect, test } from 'bun:test';
import type { RecordsMetricGroup } from '../../src/services/records';
import {
  formatRecordActivityDate,
  formatRecordValue,
  getRecordMetricDefinition,
  recordMetricDefinitions,
  sortRecordGroups,
} from '../../src/utils/records';

const group = (metric: RecordsMetricGroup['metric'], ranks: number[]): RecordsMetricGroup => ({
  metric,
  records: ranks.map((rank) => ({
    activity_id: `activity-${metric}-${rank}`,
    type_id: 1,
    metric,
    scope: 'yearly',
    year: 2026,
    value: rank,
    track_id: null,
    rank,
  })),
});

describe('records utilities', () => {
  test('defines metadata for every backend records metric', () => {
    expect(recordMetricDefinitions.map((definition) => definition.metric)).toEqual([
      'duration',
      'distance',
      'elevation_change_up',
      'avg_speed',
      'max_speed',
      'avg_power',
      'max_power',
      'avg_power1min',
      'avg_power2min',
      'avg_power5min',
      'avg_power10min',
      'avg_power20min',
      'avg_power30min',
      'avg_power60min',
    ]);
    expect(getRecordMetricDefinition('avg_power20min')).toEqual({
      metric: 'avg_power20min',
      label: '20 min power',
      group: 'power',
      unit: 'watts',
    });
  });

  test('formats duration values from ISO strings and seconds', () => {
    expect(formatRecordValue('duration', 'PT1H30M15S')).toBe('1h 30m');
    expect(formatRecordValue('duration', 95)).toBe('1m 35s');
  });

  test('formats distance, elevation, speed, and power values', () => {
    expect(formatRecordValue('distance', 12.345)).toBe('12.35 km');
    expect(formatRecordValue('elevation_change_up', 123.4)).toBe('123 m');
    expect(formatRecordValue('avg_speed', 11.26)).toBe('11.3 km/h');
    expect(formatRecordValue('max_power', 320.7)).toBe('321 W');
  });

  test('sorts groups by display group, metric definition order, and record rank', () => {
    const sorted = sortRecordGroups([
      group('avg_power20min', [3, 1]),
      group('max_speed', [2, 1]),
      group('duration', [2, 1]),
      group('distance', [1]),
      group('avg_power', [1]),
    ]);

    expect(sorted.map((item) => item.metric)).toEqual([
      'duration',
      'distance',
      'max_speed',
      'avg_power',
      'avg_power20min',
    ]);
    expect(sorted[0]?.records.map((record) => record.rank)).toEqual([1, 2]);
    expect(sorted[4]?.records.map((record) => record.rank)).toEqual([1, 3]);
  });

  test('formats record activity dates and falls back to activity id', () => {
    expect(formatRecordActivityDate({ start: '2026-06-18T10:15:00Z' })).toBe('Jun 18, 2026');
    expect(formatRecordActivityDate(null, 'activity-1')).toBe('activity-1');
  });
});
