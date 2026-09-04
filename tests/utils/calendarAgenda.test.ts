import { describe, expect, test } from 'bun:test';
import type { CalendarDay, CalendarWeek } from '../../src/stores/statistics';
import { getMonthAgendaDays } from '../../src/utils/calendarAgenda';

function calendarDay(date: string, isInMonth: boolean): CalendarDay {
  return {
    date,
    is_in_month: isInMonth,
    items: [],
    active_type_ids: [],
    total: { count: 0, distance: 0, duration: 0, effective_duration: 0, elevation_gain: 0 },
  };
}

describe('calendar agenda helpers', () => {
  test('returns only selected-month days in calendar order', () => {
    const weeks: CalendarWeek[] = [
      {
        days: [
          calendarDay('2026-05-31', false),
          calendarDay('2026-06-01', true),
          calendarDay('2026-06-02', true),
        ],
        week_summary: { count: 0, distance: 0, duration: 0, effective_duration: 0, elevation_gain: 0 },
      },
      {
        days: [calendarDay('2026-06-30', true), calendarDay('2026-07-01', false)],
        week_summary: { count: 0, distance: 0, duration: 0, effective_duration: 0, elevation_gain: 0 },
      },
    ];

    expect(getMonthAgendaDays(weeks).map((day) => day.date)).toEqual([
      '2026-06-01',
      '2026-06-02',
      '2026-06-30',
    ]);
  });
});
