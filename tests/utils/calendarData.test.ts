import { describe, expect, test } from 'bun:test';
import type { CalendarResponse } from '../../src/stores/statistics';
import { isCalendarDataForMonth } from '../../src/utils/calendarData';

function calendarData(year: number, month: number): CalendarResponse {
  return { year, month, weeks: [] };
}

describe('calendar data helpers', () => {
  test('accepts only data returned for the selected month', () => {
    expect(isCalendarDataForMonth(calendarData(2026, 6), 2026, 6)).toBe(true);
    expect(isCalendarDataForMonth(calendarData(2026, 5), 2026, 6)).toBe(false);
    expect(isCalendarDataForMonth(calendarData(2025, 6), 2026, 6)).toBe(false);
    expect(isCalendarDataForMonth(null, 2026, 6)).toBe(false);
  });
});
