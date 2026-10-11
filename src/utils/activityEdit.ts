import type { ActivityUpdatePayload } from '../stores/activity';
import { isSupportedTimezone } from '../services/timezones';
import { toISODuration } from './datetime';

export interface ActivityEditValues {
  name: string;
  timezone: string;
  type_id: number | null;
  sub_type_id: number | null;
  distance: number | null;
  durationSeconds: number;
}

/** Compare against displayed values so unrelated edits preserve backend precision. */
export function toActivityEditValues(
  activity: Omit<ActivityEditValues, 'name'> & { name: string | null }
): ActivityEditValues {
  return {
    name: activity.name ?? '',
    timezone: activity.timezone,
    type_id: activity.type_id,
    sub_type_id: activity.sub_type_id,
    distance: activity.distance === null ? null : Number(activity.distance.toFixed(2)),
    durationSeconds: Math.floor(activity.durationSeconds),
  };
}

export function buildActivityUpdate(
  original: ActivityEditValues,
  draft: ActivityEditValues
): ActivityUpdatePayload {
  if (!isSupportedTimezone(draft.timezone)) throw new Error('Select a supported timezone.');
  const payload: ActivityUpdatePayload = {};
  if (draft.timezone !== original.timezone) payload.timezone = draft.timezone;
  if (draft.name !== original.name) payload.name = draft.name;
  if (draft.type_id !== original.type_id) payload.type_id = draft.type_id;
  if (draft.sub_type_id !== original.sub_type_id) payload.sub_type_id = draft.sub_type_id;
  if (draft.distance !== original.distance) payload.distance = draft.distance;
  if (draft.durationSeconds !== original.durationSeconds) {
    if (!Number.isInteger(draft.durationSeconds) || draft.durationSeconds <= 0) {
      throw new Error('Duration must be greater than zero.');
    }
    payload.duration = toISODuration(
      Math.floor(draft.durationSeconds / 3600),
      Math.floor((draft.durationSeconds % 3600) / 60),
      draft.durationSeconds % 60
    );
  }
  return payload;
}
