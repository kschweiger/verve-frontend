import type { ActivityHighlight, HighlightMetric, RecordsMetricGroup } from '../services/records';
import { formatDuration, parseISODuration } from './datetime';

export type RecordMetricGroupId = 'endurance' | 'speed' | 'power';

export interface RecordMetricDefinition {
  metric: HighlightMetric;
  label: string;
  group: RecordMetricGroupId;
  unit: 'duration' | 'kilometers' | 'meters' | 'speed' | 'watts';
}

export const recordMetricDefinitions: RecordMetricDefinition[] = [
  { metric: 'duration', label: 'Duration', group: 'endurance', unit: 'duration' },
  { metric: 'distance', label: 'Distance', group: 'endurance', unit: 'kilometers' },
  { metric: 'elevation_change_up', label: 'Elevation gain', group: 'endurance', unit: 'meters' },
  { metric: 'avg_speed', label: 'Average speed', group: 'speed', unit: 'speed' },
  { metric: 'max_speed', label: 'Max speed', group: 'speed', unit: 'speed' },
  { metric: 'avg_power', label: 'Average power', group: 'power', unit: 'watts' },
  { metric: 'max_power', label: 'Max power', group: 'power', unit: 'watts' },
  { metric: 'avg_power1min', label: '1 min power', group: 'power', unit: 'watts' },
  { metric: 'avg_power2min', label: '2 min power', group: 'power', unit: 'watts' },
  { metric: 'avg_power5min', label: '5 min power', group: 'power', unit: 'watts' },
  { metric: 'avg_power10min', label: '10 min power', group: 'power', unit: 'watts' },
  { metric: 'avg_power20min', label: '20 min power', group: 'power', unit: 'watts' },
  { metric: 'avg_power30min', label: '30 min power', group: 'power', unit: 'watts' },
  { metric: 'avg_power60min', label: '60 min power', group: 'power', unit: 'watts' },
];

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

export function formatRecordValue(metric: HighlightMetric, value: ActivityHighlight['value']): string {
  const definition = getRecordMetricDefinition(metric);
  const numberValue = typeof value === 'number' ? value : Number(value);

  if (definition.unit === 'duration') {
    const seconds = typeof value === 'string' ? parseISODuration(value) : value;
    return formatDuration(seconds);
  }
  if (!Number.isFinite(numberValue)) return value.toString();

  if (definition.unit === 'kilometers') return `${numberValue.toFixed(2)} km`;
  if (definition.unit === 'meters') return `${Math.round(numberValue)} m`;
  if (definition.unit === 'speed') return `${numberValue.toFixed(1)} km/h`;
  return `${Math.round(numberValue)} W`;
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
  fallback = ''
): string {
  if (!activity?.start) return fallback;

  const date = new Date(activity.start);
  if (Number.isNaN(date.getTime())) return fallback;

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}
