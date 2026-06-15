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
const MS_PER_DAY = 24 * 60 * 60 * 1000;

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

function isoDateToUtcDay(value: string): number | null {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return Date.UTC(year, month - 1, day) / MS_PER_DAY;
}

function dateToUtcDay(value: Date): number {
  return Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()) / MS_PER_DAY;
}

export function formatLastActiveDay(lastActiveDay: string | null, today = new Date()): string {
  if (lastActiveDay === null) return 'No activity';

  const activeDay = isoDateToUtcDay(lastActiveDay);
  if (activeDay === null) return lastActiveDay;

  const dayDiff = dateToUtcDay(today) - activeDay;
  if (dayDiff === 0) return 'Today';
  if (dayDiff === 1) return 'Yesterday';
  if (dayDiff > 1 && dayDiff < 30) return `${dayDiff} days ago`;

  const [year, month, day] = lastActiveDay.split('-').map(Number);
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: year === today.getFullYear() ? undefined : 'numeric',
  }).format(new Date(year, month - 1, day));
}

export function formatWeekActivityStreak(streak: number): string {
  return `${streak} ${streak === 1 ? 'week' : 'weeks'}`;
}

export function hasActivityGridCellDetails(day: GridDay | null): day is GridDay {
  return day !== null && day.activity_count > 0;
}
