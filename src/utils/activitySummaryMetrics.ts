import type { Activity } from '@/stores/activity';
import { formatDuration } from './datetime';

export type ActivitySummaryMetricKey =
  | 'distance'
  | 'activeTime'
  | 'elevationGain'
  | 'averageSpeed'
  | 'maximumSpeed'
  | 'averageHeartRate'
  | 'maximumHeartRate'
  | 'averagePower'
  | 'maximumPower';

export interface ActivitySummaryMetric {
  key: ActivitySummaryMetricKey;
  value: string;
  totalDuration?: string;
}

export const activitySummaryMetricListClasses = 'flex flex-wrap justify-center gap-6 text-center';

export const activitySummaryMetricCardClasses =
  'basis-[calc((100%_-_1.5rem)/2)] md:basis-[calc((100%_-_3rem)/3)] lg:basis-[calc((100%_-_6rem)/5)] p-4 bg-verve-light/20 rounded-lg';

function fixedPrecision(locale: string, digits: number) {
  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  // Keep the summary's existing rounding while localizing separators.
  return (value: number) => formatter.format(Number(value.toFixed(digits)));
}

const metric = (
  key: ActivitySummaryMetricKey,
  value: number | null,
  formatter: (value: number) => string
): ActivitySummaryMetric | null => {
  if (value === null) return null;
  return {
    key,
    value: formatter(value),
  };
};

export function buildActivitySummaryMetrics(activity: Activity, locale: string): ActivitySummaryMetric[] {
  const formatInteger = fixedPrecision(locale, 0);
  const formatSpeed = fixedPrecision(locale, 1);
  const durationMetric: ActivitySummaryMetric = {
    key: 'activeTime',
    value: formatDuration(activity.effectiveDurationSeconds, locale),
  };

  if (activity.durationSeconds !== activity.effectiveDurationSeconds) {
    durationMetric.totalDuration = formatDuration(activity.durationSeconds, locale);
  }

  return [
    metric('distance', activity.distance, fixedPrecision(locale, 2)),
    durationMetric,
    metric('elevationGain', activity.elevationGain, formatInteger),
    metric('averageSpeed', activity.avg_speed, formatSpeed),
    metric('maximumSpeed', activity.max_speed, formatSpeed),
    metric('averageHeartRate', activity.avg_heartrate, formatInteger),
    metric('maximumHeartRate', activity.max_heartrate, formatInteger),
    metric('averagePower', activity.avg_power, formatInteger),
    metric('maximumPower', activity.max_power, formatInteger),
  ].filter((item): item is ActivitySummaryMetric => item !== null);
}
