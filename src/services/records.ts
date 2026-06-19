import { useUserStore } from '../stores/auth';

export type HighlightMetric =
  | 'duration'
  | 'distance'
  | 'elevation_change_up'
  | 'avg_speed'
  | 'avg_power'
  | 'max_speed'
  | 'max_power'
  | 'avg_power1min'
  | 'avg_power2min'
  | 'avg_power5min'
  | 'avg_power10min'
  | 'avg_power20min'
  | 'avg_power30min'
  | 'avg_power60min';

export type HighlightTimeScope = 'yearly' | 'lifetime';

export interface ActivityHighlight {
  activity_id: string;
  type_id: number;
  metric: HighlightMetric;
  scope: HighlightTimeScope;
  year: number | null;
  value: number | string;
  track_id: number | null;
  rank: number;
}

export interface RecordsMetricGroup {
  metric: HighlightMetric;
  records: ActivityHighlight[];
}

export interface RecordsQueryParams {
  year?: number | null;
  typeId?: number | null;
}

const highlightMetrics = [
  'duration',
  'distance',
  'elevation_change_up',
  'avg_speed',
  'avg_power',
  'max_speed',
  'max_power',
  'avg_power1min',
  'avg_power2min',
  'avg_power5min',
  'avg_power10min',
  'avg_power20min',
  'avg_power30min',
  'avg_power60min',
] as const;

const highlightScopes = ['yearly', 'lifetime'] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isHighlightMetric = (value: unknown): value is HighlightMetric =>
  typeof value === 'string' && highlightMetrics.includes(value as HighlightMetric);

const isHighlightScope = (value: unknown): value is HighlightTimeScope =>
  typeof value === 'string' && highlightScopes.includes(value as HighlightTimeScope);

const isOptionalNumber = (value: unknown): value is number | null | undefined =>
  value === undefined || value === null || typeof value === 'number';

const getAuthHeaders = (): HeadersInit => {
  const userStore = useUserStore();
  if (!userStore.token) throw new Error('Not authenticated');
  return { Authorization: `Bearer ${userStore.token}` };
};

export function buildRecordsQuery(params: RecordsQueryParams): string {
  const query = new URLSearchParams();

  if (params.year != null) query.set('year', params.year.toString());
  if (params.typeId != null) query.set('type_id', params.typeId.toString());

  return query.toString();
}

export function parseActivityHighlight(value: unknown): ActivityHighlight {
  if (!isRecord(value)) throw new Error('Invalid activity highlight.');

  if (
    typeof value.activity_id !== 'string' ||
    typeof value.type_id !== 'number' ||
    !isHighlightMetric(value.metric) ||
    !isHighlightScope(value.scope) ||
    !isOptionalNumber(value.year) ||
    !isOptionalNumber(value.track_id) ||
    typeof value.rank !== 'number' ||
    value.rank < 1 ||
    !Number.isInteger(value.rank) ||
    (typeof value.value !== 'number' && typeof value.value !== 'string')
  ) {
    throw new Error('Invalid activity highlight.');
  }

  return {
    activity_id: value.activity_id,
    type_id: value.type_id,
    metric: value.metric,
    scope: value.scope,
    year: value.year ?? null,
    value: value.value,
    track_id: value.track_id ?? null,
    rank: value.rank,
  };
}

export function parseHighlightsByMetricResponse(value: unknown): RecordsMetricGroup[] {
  if (!isRecord(value) || !isRecord(value.data) || Array.isArray(value.data)) {
    throw new Error('Invalid records response.');
  }

  return Object.entries(value.data).map(([metricKey, recordsValue]) => {
    if (!isHighlightMetric(metricKey)) {
      throw new Error(`Unknown records metric: ${metricKey}`);
    }
    if (!Array.isArray(recordsValue)) {
      throw new Error('Invalid records response.');
    }

    const records = recordsValue.map(parseActivityHighlight);
    if (records.some((record) => record.metric !== metricKey)) {
      throw new Error('Record metric does not match group metric.');
    }

    return {
      metric: metricKey,
      records: [...records].sort((a, b) => a.rank - b.rank),
    };
  });
}

export async function fetchRecordsOverview(params: RecordsQueryParams): Promise<RecordsMetricGroup[]> {
  const query = buildRecordsQuery(params);
  const url = `${import.meta.env.VITE_API_BASE_URL}/highlights/${query ? `?${query}` : ''}`;

  const response = await fetch(url, { headers: getAuthHeaders() });
  if (!response.ok) throw new Error('Failed to fetch records.');

  const responseData: unknown = await response.json();
  return parseHighlightsByMetricResponse(responseData);
}
