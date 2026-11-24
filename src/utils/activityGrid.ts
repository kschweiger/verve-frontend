import type { GridDay, GridWeek } from '@/stores/statistics';
import { formatDurationUnit } from './datetime';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MONDAY_UTC = Date.UTC(2026, 0, 5);

export function getActivityGridIntensity(value: number, scaleMax: number): number {
  if (scaleMax <= 0) return 0;
  return Math.min(Math.max(value / scaleMax, 0), 1);
}

export function getRecentGridWeeks(weeks: readonly GridWeek[], limit: number): GridWeek[] {
  if (limit <= 0) return [];
  return weeks.slice(-limit);
}

export function getWeekdayLabels(locale: string): string[] {
  const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' });
  return Array.from({ length: 7 }, (_, index) => formatter.format(MONDAY_UTC + index * MS_PER_DAY));
}

export function monthLabel(month: number | null, locale: string): string {
  if (month === null || month < 1 || month > 12) return '';
  return new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }).format(
    Date.UTC(2026, month - 1)
  );
}

export function formatActivityGridDuration(totalSeconds: number, locale: string): string {
  const seconds = Math.max(0, totalSeconds);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);

  if (hours === 0) return formatDurationUnit(minutes, 'minute', locale);
  const hourLabel = formatDurationUnit(hours, 'hour', locale);
  return minutes === 0 ? hourLabel : `${hourLabel} ${formatDurationUnit(minutes, 'minute', locale)}`;
}

export function formatActivityGridDate(
  date: string,
  locale: string,
  options?: Intl.DateTimeFormatOptions
): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(locale, { ...options, timeZone: 'UTC' });
}

export function getActivityGridDayOffset(date: string, today: Date): number {
  const currentDay = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return (currentDay - Date.parse(`${date}T00:00:00Z`)) / MS_PER_DAY;
}

export function hasActivityGridCellDetails(day: GridDay | null): day is GridDay {
  return day !== null && day.activity_count > 0;
}
