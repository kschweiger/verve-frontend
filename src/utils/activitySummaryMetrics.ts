import type { Activity } from '@/stores/activity';

export interface ActivitySummaryMetric {
  label: string;
  value: string;
  secondary?: string;
}

export const activitySummaryMetricListClasses = 'flex flex-wrap justify-center gap-6 text-center';

export const activitySummaryMetricCardClasses =
  'basis-[calc((100%_-_1.5rem)/2)] md:basis-[calc((100%_-_3rem)/3)] lg:basis-[calc((100%_-_6rem)/5)] p-4 bg-verve-light/20 rounded-lg';

const rounded = (value: number, digits: number): string => value.toFixed(digits);

const roundedInteger = (value: number): string => value.toFixed(0);

const metric = (
  label: string,
  value: number | null,
  formatter: (value: number) => string
): ActivitySummaryMetric | null => {
  if (value === null) return null;
  return {
    label,
    value: formatter(value),
  };
};

export function buildActivitySummaryMetrics(activity: Activity): ActivitySummaryMetric[] {
  const durationMetric: ActivitySummaryMetric = {
    label: 'Active Time',
    value: activity.effectiveDuration,
  };

  if (activity.durationSeconds !== activity.effectiveDurationSeconds) {
    durationMetric.secondary = `${activity.duration} total`;
  }

  return [
    metric('km', activity.distance, (value) => rounded(value, 2)),
    durationMetric,
    metric('m Gain', activity.elevationGain, roundedInteger),
    metric('Avg Speed', activity.avg_speed, (value) => rounded(value, 1)),
    metric('Max Speed', activity.max_speed, (value) => rounded(value, 1)),
    metric('Avg HR', activity.avg_heartrate, roundedInteger),
    metric('Max HR', activity.max_heartrate, roundedInteger),
    metric('Avg Power', activity.avg_power, roundedInteger),
    metric('Max Power', activity.max_power, roundedInteger),
  ].filter((item): item is ActivitySummaryMetric => item !== null);
}
