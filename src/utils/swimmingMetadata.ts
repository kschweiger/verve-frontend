import { parseISODuration } from './datetime';

export interface SwimmingSetMeta {
  index: number;
  durationSeconds?: number;
  lapStartIndex?: number;
  lapEndIndex?: number;
  lapCount?: number;
  distanceMeters?: number;
  style?: string;
  strokeCount?: number;
  averageSwolf?: number;
  restAfterSeconds?: number;
}

export interface SwimmingMetaData {
  target: 'SwimmingMetaData';
  poolLengthMeters?: number;
  totalStrokeCount?: number;
  averageSwolf?: number;
  lapCount?: number;
  setCount?: number;
  styles: string[];
  sets: SwimmingSetMeta[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const toString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const toStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const toDurationSeconds = (value: unknown): number | undefined => {
  if (typeof value !== 'string') return undefined;
  return parseISODuration(value);
};

const hasDefinedValue = (value: unknown): boolean => value !== undefined;

const mapBackendSet = (value: unknown): SwimmingSetMeta | null => {
  if (!isRecord(value)) return null;

  const index = toNumber(value.index);
  if (index === undefined) return null;

  const set: SwimmingSetMeta = { index };
  const durationSeconds = toDurationSeconds(value.durations);
  const lapStartIndex = toNumber(value.lap_start_index);
  const lapEndIndex = toNumber(value.lap_end_index);
  const lapCount = toNumber(value.lap_count);
  const distanceMeters = toNumber(value.distance_meters);
  const style = toString(value.style);
  const strokeCount = toNumber(value.stroke_count);
  const averageSwolf = toNumber(value.avg_swofl);
  const restAfterSeconds = toDurationSeconds(value.rest_after);

  if (durationSeconds !== undefined) set.durationSeconds = durationSeconds;
  if (lapStartIndex !== undefined) set.lapStartIndex = lapStartIndex;
  if (lapEndIndex !== undefined) set.lapEndIndex = lapEndIndex;
  if (lapCount !== undefined) set.lapCount = lapCount;
  if (distanceMeters !== undefined) set.distanceMeters = distanceMeters;
  if (style !== undefined) set.style = style;
  if (strokeCount !== undefined) set.strokeCount = strokeCount;
  if (averageSwolf !== undefined) set.averageSwolf = averageSwolf;
  if (restAfterSeconds !== undefined) set.restAfterSeconds = restAfterSeconds;

  return set;
};

const mapEnvelopeSet = (value: unknown): SwimmingSetMeta | null => {
  if (!isRecord(value)) return null;

  const index = toNumber(value.index);
  if (index === undefined) return null;

  const set: SwimmingSetMeta = { index };
  const durationSeconds = toNumber(value.durationSeconds);
  const lapStartIndex = toNumber(value.lapStartIndex);
  const lapEndIndex = toNumber(value.lapEndIndex);
  const lapCount = toNumber(value.lapCount);
  const distanceMeters = toNumber(value.distanceMeters);
  const style = toString(value.strokeStyle);
  const strokeCount = toNumber(value.strokeCount);
  const averageSwolf = toNumber(value.averageSwolf);
  const restAfterSeconds = toNumber(value.restAfterSeconds);

  if (durationSeconds !== undefined) set.durationSeconds = durationSeconds;
  if (lapStartIndex !== undefined) set.lapStartIndex = lapStartIndex;
  if (lapEndIndex !== undefined) set.lapEndIndex = lapEndIndex;
  if (lapCount !== undefined) set.lapCount = lapCount;
  if (distanceMeters !== undefined) set.distanceMeters = distanceMeters;
  if (style !== undefined) set.style = style;
  if (strokeCount !== undefined) set.strokeCount = strokeCount;
  if (averageSwolf !== undefined) set.averageSwolf = averageSwolf;
  if (restAfterSeconds !== undefined) set.restAfterSeconds = restAfterSeconds;

  return set;
};

const sortedSets = (sets: SwimmingSetMeta[]): SwimmingSetMeta[] =>
  [...sets].sort((left, right) => left.index - right.index);

const hasMeaningfulSwimmingFields = (metadata: SwimmingMetaData): boolean =>
  [
    metadata.poolLengthMeters,
    metadata.totalStrokeCount,
    metadata.averageSwolf,
    metadata.lapCount,
    metadata.setCount,
  ].some(hasDefinedValue) ||
  metadata.styles.length > 0 ||
  metadata.sets.length > 0;

export const parseSwimmingMetadata = (value: unknown): SwimmingMetaData | null => {
  if (!isRecord(value) || value.target !== 'SwimmingMetaData') return null;

  const metadata: SwimmingMetaData = {
    target: 'SwimmingMetaData',
    styles: toStringArray(value.styles),
    sets: Array.isArray(value.sets)
      ? sortedSets(value.sets.map(mapBackendSet).filter((set): set is SwimmingSetMeta => set !== null))
      : [],
  };

  const poolLengthMeters = toNumber(value.pool_length_meters);
  const totalStrokeCount = toNumber(value.total_stroke_count);
  const averageSwolf = toNumber(value.avg_swofl);
  const lapCount = toNumber(value.lap_count);
  const setCount = toNumber(value.set_count);

  if (poolLengthMeters !== undefined) metadata.poolLengthMeters = poolLengthMeters;
  if (totalStrokeCount !== undefined) metadata.totalStrokeCount = totalStrokeCount;
  if (averageSwolf !== undefined) metadata.averageSwolf = averageSwolf;
  if (lapCount !== undefined) metadata.lapCount = lapCount;
  if (setCount !== undefined) metadata.setCount = setCount;

  return hasMeaningfulSwimmingFields(metadata) ? metadata : null;
};

export const extractSwimmingMetadataFromVerveFile = (value: unknown): SwimmingMetaData | null => {
  if (!isRecord(value) || !isRecord(value.properties) || !isRecord(value.properties.metadata)) {
    return null;
  }

  const envelope = value.properties.metadata;
  if (envelope.target !== 'SwimmingMetaData' || !isRecord(envelope.data)) return null;

  const data = envelope.data;
  const metadata: SwimmingMetaData = {
    target: 'SwimmingMetaData',
    styles: toStringArray(data.strokeStyles),
    sets: Array.isArray(data.sets)
      ? sortedSets(data.sets.map(mapEnvelopeSet).filter((set): set is SwimmingSetMeta => set !== null))
      : [],
  };

  const poolLengthMeters = toNumber(data.poolLengthMeters);
  const totalStrokeCount = toNumber(data.totalStrokeCount);
  const averageSwolf = toNumber(data.averageSwolf);
  const lapCount = toNumber(data.lapCount);
  const setCount = toNumber(data.setCount);

  if (poolLengthMeters !== undefined) metadata.poolLengthMeters = poolLengthMeters;
  if (totalStrokeCount !== undefined) metadata.totalStrokeCount = totalStrokeCount;
  if (averageSwolf !== undefined) metadata.averageSwolf = averageSwolf;
  if (lapCount !== undefined) metadata.lapCount = lapCount;
  if (setCount !== undefined) metadata.setCount = setCount;

  return hasMeaningfulSwimmingFields(metadata) ? metadata : null;
};
