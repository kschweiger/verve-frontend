import type { CalendarDay, CalendarWeek } from '@/stores/statistics';

export function getMonthAgendaDays(weeks: readonly CalendarWeek[]): CalendarDay[] {
  return weeks.flatMap((week) => week.days.filter((day) => day.is_in_month));
}
