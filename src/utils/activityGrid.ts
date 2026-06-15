import type { GridDay } from '@/stores/statistics';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export function getActivityGridIntensity(value: number, scaleMax: number): number {
  if (scaleMax <= 0) return 0;
  return Math.min(Math.max(value / scaleMax, 0), 1);
}

export function getWeekdayLabels(): string[] {
  return [...WEEKDAY_LABELS];
}

export function monthLabel(month: number | null): string {
  if (month === null) return '';
  return MONTH_LABELS[month - 1] ?? '';
}

export function formatActivityGridDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return '0m';

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.round((totalSeconds % 3600) / 60);

  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function formatActivityGridCellDetails(day: GridDay): string {
  const activityLabel = day.activity_count === 1 ? 'activity' : 'activities';
  return `${day.date} · ${day.activity_count} ${activityLabel} · ${formatActivityGridDuration(day.duration_seconds)}`;
}

export function hasActivityGridCellDetails(day: GridDay | null): day is GridDay {
  return day !== null && day.activity_count > 0;
}

export function formatAverageDuration(totalSeconds: number, activeDays: number): string {
  if (activeDays <= 0) return '-';
  return `${formatActivityGridDuration(Math.round(totalSeconds / activeDays))}/day`;
}
