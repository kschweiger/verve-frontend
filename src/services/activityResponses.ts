import type { ApiActivity } from './api';
import type { ActivityTagPublic } from '../stores/tags';
import { isAwareTimestamp } from '../utils/datetime';
import { isSupportedTimezone } from './timezones';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);
const isInteger = (value: unknown): value is number => isNumber(value) && Number.isInteger(value);
const isNullableNumber = (value: unknown): value is number | null =>
  value === null || isNumber(value);
const isOptionalNumber = (value: unknown): value is number | null | undefined =>
  value === undefined || isNullableNumber(value);
const isDuration = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^P(?=\d|T\d)(?:\d+(?:\.\d+)?D)?(?:T(?=\d)(?:\d+(?:\.\d+)?H)?(?:\d+(?:\.\d+)?M)?(?:\d+(?:\.\d+)?S)?)?$/.test(
    value
  );
const isUuid = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

function parseTag(value: unknown): ActivityTagPublic {
  if (
    !isRecord(value) ||
    !isInteger(value.id) ||
    typeof value.name !== 'string' ||
    !(value.category_id === undefined || value.category_id === null || isInteger(value.category_id))
  ) {
    throw new Error('Invalid activity tag response.');
  }
  return { id: value.id, name: value.name, category_id: value.category_id ?? null };
}

/** Fields consumed from ActivityPublic and ActivityCorePublic, per backend_openapi.json. */
export function parseApiActivity(value: unknown): ApiActivity {
  if (
    !isRecord(value) ||
    !isUuid(value.id) ||
    !isAwareTimestamp(value.start) ||
    !isAwareTimestamp(value.created_at) ||
    !isSupportedTimezone(value.timezone) ||
    !isDuration(value.duration) ||
    !isNullableNumber(value.distance) ||
    !isInteger(value.type_id) ||
    !(value.sub_type_id === null || isInteger(value.sub_type_id)) ||
    typeof value.name !== 'string' ||
    !Array.isArray(value.tags) ||
    !(
      value.moving_duration === undefined ||
      value.moving_duration === null ||
      isDuration(value.moving_duration)
    ) ||
    !(value.meta_data === undefined || isRecord(value.meta_data)) ||
    !isOptionalNumber(value.elevation_change_up) ||
    !isOptionalNumber(value.elevation_change_down) ||
    !isOptionalNumber(value.avg_speed) ||
    !isOptionalNumber(value.max_speed) ||
    !isOptionalNumber(value.avg_heartrate) ||
    !isOptionalNumber(value.max_heartrate) ||
    !isOptionalNumber(value.avg_power) ||
    !isOptionalNumber(value.max_power)
  ) {
    throw new Error(
      'Invalid activity response. Expected an aware timestamp and assigned timezone.'
    );
  }
  return {
    id: value.id,
    start: value.start,
    created_at: value.created_at,
    timezone: value.timezone,
    duration: value.duration,
    distance: value.distance,
    type_id: value.type_id,
    sub_type_id: value.sub_type_id,
    name: value.name,
    tags: value.tags.map(parseTag),
    moving_duration: value.moving_duration,
    elevation_change_up: value.elevation_change_up,
    elevation_change_down: value.elevation_change_down,
    avg_speed: value.avg_speed,
    max_speed: value.max_speed,
    avg_heartrate: value.avg_heartrate,
    max_heartrate: value.max_heartrate,
    avg_power: value.avg_power,
    max_power: value.max_power,
    meta_data: value.meta_data,
  };
}

export function parseActivityPageData(value: unknown): unknown[] {
  if (!isRecord(value) || !Array.isArray(value.data))
    throw new Error('Invalid activities response.');
  return value.data;
}
