import { describe, expect, test } from 'bun:test';
import {
  activitySummaryMetricCardClasses,
  activitySummaryMetricListClasses,
  buildActivitySummaryMetrics,
} from '../../src/utils/activitySummaryMetrics';
import type { Activity } from '../../src/stores/activity';

const baseActivity: Activity = {
  id: 'activity-1',
  start: '2026-06-01T08:00:00Z',
  duration: '1h 0m',
  distance: 10,
  durationSeconds: 3600,
  movingDuration: null,
  movingDurationSeconds: null,
  effectiveDuration: '1h 0m',
  effectiveDurationSeconds: 3600,
  elevationGain: null,
  elevationLoss: null,
  type_id: 1,
  sub_type_id: null,
  name: 'Morning ride',
  avg_speed: null,
  max_speed: null,
  avg_heartrate: null,
  max_heartrate: null,
  avg_power: null,
  max_power: null,
  metaData: null,
  tags: [],
};

describe('activity summary metrics', () => {
  test('only includes activity metrics with available values', () => {
    const metrics = buildActivitySummaryMetrics(baseActivity);

    expect(metrics.map((metric) => metric.label)).toEqual(['km', 'Active Time']);
    expect(metrics.map((metric) => metric.value)).toEqual(['10.00', '1h 0m']);
  });

  test('includes additional average and max metrics when available', () => {
    const metrics = buildActivitySummaryMetrics({
      ...baseActivity,
      distance: null,
      duration: '1h 10m',
      effectiveDuration: '1h 0m',
      effectiveDurationSeconds: 3600,
      durationSeconds: 4200,
      elevationGain: 342.2,
      avg_speed: 26.24,
      max_speed: 58.87,
      avg_heartrate: 142,
      max_heartrate: 178,
      avg_power: 210,
      max_power: 612,
    });

    expect(metrics).toEqual([
      { label: 'Active Time', value: '1h 0m', secondary: '1h 10m total' },
      { label: 'm Gain', value: '342' },
      { label: 'Avg Speed', value: '26.2' },
      { label: 'Max Speed', value: '58.9' },
      { label: 'Avg HR', value: '142' },
      { label: 'Max HR', value: '178' },
      { label: 'Avg Power', value: '210' },
      { label: 'Max Power', value: '612' },
    ]);
  });

  test('uses centered wrapping layout classes for incomplete metric rows', () => {
    expect(activitySummaryMetricListClasses).toContain('flex');
    expect(activitySummaryMetricListClasses).toContain('flex-wrap');
    expect(activitySummaryMetricListClasses).toContain('justify-center');
    expect(activitySummaryMetricCardClasses).toContain('lg:basis-[calc((100%_-_6rem)/5)]');
  });
});
