import type { ActivityHighlight, HighlightMetric, RecordsMetricGroup } from '../services/records';
import { formatDuration, parseISODuration } from './datetime';

export type RecordMetricGroupId = 'endurance' | 'speed' | 'power';

export interface RecordMetricDefinition {
  metric: HighlightMetric;
  group: RecordMetricGroupId;
  unit: 'duration' | 'kilometers' | 'meters' | 'speed' | 'watts';
}

export const recordMetricDefinitions: RecordMetricDefinition[] = [
  { metric: 'duration', group: 'endurance', unit: 'duration' },
  { metric: 'distance', group: 'endurance', unit: 'kilometers' },
  { metric: 'elevation_change_up', group: 'endurance', unit: 'meters' },
  { metric: 'avg_speed', group: 'speed', unit: 'speed' },
  { metric: 'max_speed', group: 'speed', unit: 'speed' },
  { metric: 'avg_power', group: 'power', unit: 'watts' },
  { metric: 'max_power', group: 'power', unit: 'watts' },
  { metric: 'avg_power1min', group: 'power', unit: 'watts' },
  { metric: 'avg_power2min', group: 'power', unit: 'watts' },
  { metric: 'avg_power5min', group: 'power', unit: 'watts' },
  { metric: 'avg_power10min', group: 'power', unit: 'watts' },
  { metric: 'avg_power20min', group: 'power', unit: 'watts' },
  { metric: 'avg_power30min', group: 'power', unit: 'watts' },
  { metric: 'avg_power60min', group: 'power', unit: 'watts' },
];

const numericUnits = {
  kilometers: { fractionDigits: 2, suffix: 'km' },
  meters: { fractionDigits: 0, suffix: 'm' },
  speed: { fractionDigits: 1, suffix: 'km/h' },
  watts: { fractionDigits: 0, suffix: 'W' },
};

const groupOrder: Record<RecordMetricGroupId, number> = {
  endurance: 0,
  speed: 1,
  power: 2,
};

export function getRecordMetricDefinition(metric: HighlightMetric): RecordMetricDefinition {
  const definition = recordMetricDefinitions.find((item) => item.metric === metric);
  if (!definition) throw new Error(`Unknown records metric: ${metric}`);
  return definition;
}

export function formatRecordValue(
  metric: HighlightMetric,
  value: ActivityHighlight['value'],
  locale = 'en'
): string {
  const { unit } = getRecordMetricDefinition(metric);

  if (unit === 'duration') {
    const seconds = typeof value === 'string' ? parseISODuration(value) : value;
    return formatDuration(seconds, locale);
  }

  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return value.toString();

  const { fractionDigits, suffix } = numericUnits[unit];
  const rounded = fractionDigits === 0
    ? Math.round(numberValue) || 0
    : Number(numberValue.toFixed(fractionDigits));
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(rounded);
  return `${formatted} ${suffix}`;
}

export function sortRecordGroups(groups: RecordsMetricGroup[]): RecordsMetricGroup[] {
  return groups
    .map((group) => ({
      ...group,
      records: [...group.records].sort((a, b) => a.rank - b.rank),
    }))
    .sort((a, b) => {
      const definitionA = getRecordMetricDefinition(a.metric);
      const definitionB = getRecordMetricDefinition(b.metric);
      const groupDifference = groupOrder[definitionA.group] - groupOrder[definitionB.group];
      if (groupDifference !== 0) return groupDifference;

      return (
        recordMetricDefinitions.findIndex((definition) => definition.metric === a.metric) -
        recordMetricDefinitions.findIndex((definition) => definition.metric === b.metric)
      );
    });
}

export function formatRecordActivityDate(
  activity: { start?: string | null } | null | undefined,
  fallback = '',
  locale = 'en'
): string {
  if (!activity?.start) return fallback;

  const date = new Date(activity.start);
  if (Number.isNaN(date.getTime())) return fallback;

  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}
