import type { ActivityHighlightPublic, HighlightMetric } from '../types/api';
import { useUserStore } from '../stores/auth';

export type { HighlightMetric, HighlightTimeScope } from '../types/api';
export type ActivityHighlight = Omit<ActivityHighlightPublic, 'year' | 'track_id'> & {
  year: number | null;
  track_id: number | null;
};

export interface RecordsMetricGroup {
  metric: HighlightMetric;
  records: ActivityHighlight[];
}

export interface RecordsQueryParams {
  year?: number | null;
  typeId?: number | null;
}

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

export function mapActivityHighlight(value: ActivityHighlightPublic): ActivityHighlight {
  return { ...value, year: value.year ?? null, track_id: value.track_id ?? null };
}

export function mapHighlightsByMetricResponse(value: {
  data: Partial<Record<HighlightMetric, ActivityHighlightPublic[]>>;
}): RecordsMetricGroup[] {
  return (Object.entries(value.data) as [HighlightMetric, ActivityHighlightPublic[]][]).map(
    ([metric, records]) => ({
      metric,
      records: records.map(mapActivityHighlight).sort((a, b) => a.rank - b.rank),
    })
  );
}

export async function fetchRecordsOverview(
  params: RecordsQueryParams
): Promise<RecordsMetricGroup[]> {
  const query = buildRecordsQuery(params);
  const url = `${import.meta.env.VITE_API_BASE_URL}/highlights/${query ? `?${query}` : ''}`;

  const response = await fetch(url, { headers: getAuthHeaders() });
  if (!response.ok) throw new Error('Failed to fetch records.');

  const responseData: { data: Partial<Record<HighlightMetric, ActivityHighlightPublic[]>> } =
    await response.json();
  return mapHighlightsByMetricResponse(responseData);
}
