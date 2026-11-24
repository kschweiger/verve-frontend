import { germanTimeUnit } from '../helpers/intl';
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
  timezone: 'Europe/Berlin',
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
    const metrics = buildActivitySummaryMetrics(baseActivity, 'en');

    expect(metrics.map((metric) => metric.key)).toEqual(['distance', 'activeTime']);
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
    }, 'en');

    expect(metrics).toEqual([
      { key: 'activeTime', value: '1h 0m', totalDuration: '1h 10m' },
      { key: 'elevationGain', value: '342' },
      { key: 'averageSpeed', value: '26.2' },
      { key: 'maximumSpeed', value: '58.9' },
      { key: 'averageHeartRate', value: '142' },
      { key: 'maximumHeartRate', value: '178' },
      { key: 'averagePower', value: '210' },
      { key: 'maximumPower', value: '612' },
    ]);
  });

  test('uses the display locale for fixed precision and distinguishes active from total time', () => {
    const metrics = buildActivitySummaryMetrics({
      ...baseActivity,
      distance: 18.435,
      durationSeconds: 100200,
      effectiveDurationSeconds: 4200,
      elevationGain: 1425,
      avg_speed: 0,
    }, 'de');

    expect(metrics).toEqual([
      { key: 'distance', value: '18,43' },
      {
        key: 'activeTime',
        value: `1h ${germanTimeUnit(10, 'minute')}`,
        totalDuration: `27h ${germanTimeUnit(50, 'minute')}`,
      },
      { key: 'elevationGain', value: '1.425' },
      { key: 'averageSpeed', value: '0,0' },
    ]);
  });

  test('uses centered wrapping layout classes for incomplete metric rows', () => {
    expect(activitySummaryMetricListClasses).toContain('flex');
    expect(activitySummaryMetricListClasses).toContain('flex-wrap');
    expect(activitySummaryMetricListClasses).toContain('justify-center');
    expect(activitySummaryMetricCardClasses).toContain('lg:basis-[calc((100%_-_6rem)/5)]');
  });
});
