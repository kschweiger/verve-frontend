// Backend response shapes from backend_openapi.json.
// Timezone names remain strings; supported input choices live in services/timezones.ts.

export interface ListResponse<T> {
  data: T[];
}

export interface ActivityPublic {
  start: string;
  duration: string;
  distance: number | null;
  moving_duration?: string | null;
  elevation_change_up?: number | null;
  elevation_change_down?: number | null;
  energy?: number | null;
  avg_speed?: number | null;
  avg_heartrate?: number | null;
  avg_power?: number | null;
  max_speed?: number | null;
  max_heartrate?: number | null;
  max_power?: number | null;
  type_id: number;
  sub_type_id: number | null;
  name: string;
  meta_data?: Record<string, unknown>;
  timezone: string;
  id: string;
  created_at: string;
  tags: Array<ActivityTagPublic>;
}

export interface ActivityTagPublic {
  name: string;
  category_id?: number | null;
  id: number;
}

export interface TrackPointResponse {
  id: number;
  segment_id: number;
  latitude: number | null;
  longitude: number | null;
  time: string;
  elevation: number | null;
  diff_time: number | null;
  diff_distance: number | null;
  cum_distance: number | null;
  speed: number | null;
  heartrate: number | null;
  cadence: number | null;
  power: number | null;
  add_extensions?: Record<string, number> | null;
}

export interface SegmentStatisticsResponse {
  segment_set_id: string;
  name: string;
  segments: Array<SegmentResponse>;
  cuts: Array<number>;
  display_metadata: SegmentDisplayMetadata;
}

export interface SegmentResponse {
  distance_m: number | null;
  duration_s: number;
  elevation_gain: number | null;
  elevation_loss: number | null;
  speed?: SegmentMetrics | null;
  heartrate?: SegmentMetrics | null;
  power?: SegmentMetrics | null;
  cadence?: SegmentMetrics | null;
  pace?: SegmentMetrics | null;
}

export interface SegmentMetrics {
  avg: number;
  min: number | null;
  max: number | null;
}

export interface SegmentDisplayMetadata {
  primary_metric: SegmentMetric;
  display_metrics: Array<SegmentMetric>;
  speed_unit?: 'm/s' | 'km/h' | 'miles/h';
  pace_unit?: 's/km' | 's/mile' | 'min/km' | 'min/mile';
}

export type SegmentMetric = 'pace' | 'heartrate' | 'power' | 'speed' | 'cadence';

export interface SegmentSetPublic {
  id: string;
  name: string;
  activity_id: string;
}

export interface CollectionOverview {
  id: string;
  activity_ids: Array<string>;
  name: string;
  description?: string | null;
  count: number;
  distance: number | null;
  moving_duration: string | null;
  duration: string;
  start: string;
  end: string;
  elevation_change_up?: number | null;
  elevation_change_down?: number | null;
}

export interface CollectionDetailResponse {
  id: string;
  name: string;
  description?: string | null;
  activities: Array<ActivityPublic>;
  total_distance: number | null;
  total_duration: string;
  total_moving_duration: string | null;
  total_elevation_change_up: number | null;
  total_elevation_change_down: number | null;
}

export interface CollectionTrackPointResponse extends TrackPointResponse {
  activity_id: string;
  activity_index: number;
  collection_cum_distance: number | null;
}

export interface ActivityCollectionPublic {
  name: string;
  description?: string | null;
  id: string;
  created_at: string;
  activity_ids: Array<string>;
}

export interface UserSettingsCollection {
  settings: UserSettingsPublic;
}

export interface UserSettingsPublic {
  default_type_id: number;
  defautl_sub_type_id: number | null;
  locale?: SupportedLocale;
  heatmap_settings?: HeatmapSettings;
  records_settings?: RecordsSettings;
  timezone?: string;
}

export type SupportedLocale = 'de' | 'en';

export interface HeatmapSettings {
  excluded_activity_types?: Array<[number, number | null]>;
}

export interface RecordsSettings {
  default_activity_type?: number;
}

export interface UserPublic {
  name: string;
  email: string;
  full_name?: string | null;
  id: string;
}

export interface UserMe extends UserPublic {
  is_admin: boolean;
}

export interface ActivityHighlightPublic {
  activity_id: string;
  type_id: number;
  metric: HighlightMetric;
  scope: HighlightTimeScope;
  year?: number | null;
  value: number | string;
  track_id?: number | null;
  rank: number;
}

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

export interface EquipmentPublic {
  name: string;
  equipment_type: EquipmentType;
  brand?: string | null;
  model?: string | null;
  description?: string | null;
  purchase_date?: string | null;
  id: string;
}

export type EquipmentType = 'bike' | 'shoes' | 'skis' | 'snowboard' | 'hometrainer';

export interface EquipmentCreate {
  name: string;
  equipment_type: EquipmentType;
  brand?: string | null;
  model?: string | null;
  description?: string | null;
  purchase_date?: string | null;
}

export interface EquipmentUpdate {
  name?: string | null;
  equipment_type?: EquipmentType | null;
  brand?: string | null;
  model?: string | null;
  description?: string | null;
  purchase_date?: string | null;
}

export interface EquipmentSetPublic {
  name: string;
  id: string;
  items: Array<string>;
}

export interface HeatMapResponse {
  points: Array<[number, number, number]>;
  center: [number, number] | null;
}

export interface ActivityCalendarItem {
  id: string;
  name: string | null;
  type_id: number;
  sub_type_id?: number | null;
  distance: number | null;
  duration: number;
  effective_duration: number;
  elevation_gain: number | null;
}
