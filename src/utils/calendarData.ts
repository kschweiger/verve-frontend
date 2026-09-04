import type { CalendarResponse } from '@/stores/statistics';

export function isCalendarDataForMonth(
  calendarData: CalendarResponse | null,
  year: number,
  month: number
): boolean {
  return calendarData?.year === year && calendarData.month === month;
}
