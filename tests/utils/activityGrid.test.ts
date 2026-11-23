import { describe, expect, test } from 'bun:test';
import type { GridDay, GridWeek } from '../../src/stores/statistics';
import {
  formatActivityGridDate,
  formatActivityGridDuration,
  getActivityGridDayOffset,
  getActivityGridIntensity,
  getRecentGridWeeks,
  getWeekdayLabels,
  hasActivityGridCellDetails,
  monthLabel,
} from '../../src/utils/activityGrid';

function gridWeek(startDate: string): GridWeek {
  return { start_date: startDate, month: null, days: [] };
}

describe('activity grid helpers', () => {
  test('scales duration values against scale max', () => {
    expect(getActivityGridIntensity(0, 7200)).toBe(0);
    expect(getActivityGridIntensity(1800, 7200)).toBe(0.25);
    expect(getActivityGridIntensity(7200, 7200)).toBe(1);
    expect(getActivityGridIntensity(9000, 7200)).toBe(1);
  });

  test('returns zero intensity when scale max is zero', () => {
    expect(getActivityGridIntensity(3600, 0)).toBe(0);
  });

  test('formats compact durations', () => {
    expect(formatActivityGridDuration(0, 'en')).toBe('0m');
    expect(formatActivityGridDuration(1800, 'en')).toBe('30m');
    expect(formatActivityGridDuration(5400, 'en')).toBe('1h 30m');
    expect(formatActivityGridDuration(7200, 'en')).toBe('2h');
    expect(formatActivityGridDuration(5400, 'de')).toBe('1h 30min');
  });

  test('formats a grid date without shifting the calendar day', () => {
    expect(formatActivityGridDate('2026-06-15', 'en')).toBe('6/15/2026');
    expect(formatActivityGridDate('2026-06-15', 'de')).toBe('15.6.2026');
  });

  test('only days with activities have cell details', () => {
    const activeDay: GridDay = {
      date: '2026-06-15',
      activity_count: 1,
      duration_seconds: 1800,
      effective_duration_seconds: 1200,
    };
    const inactiveDay: GridDay = {
      date: '2026-06-16',
      activity_count: 0,
      duration_seconds: 0,
      effective_duration_seconds: 0,
    };

    expect(hasActivityGridCellDetails(activeDay)).toBe(true);
    expect(hasActivityGridCellDetails(inactiveDay)).toBe(false);
    expect(hasActivityGridCellDetails(null)).toBe(false);
  });

  test('counts days back from browser-local today without treating the grid dates as instants', () => {
    const today = new Date(2026, 5, 15);

    expect(getActivityGridDayOffset('2026-06-15', today)).toBe(0);
    expect(getActivityGridDayOffset('2026-06-14', today)).toBe(1);
    expect(getActivityGridDayOffset('2026-06-12', today)).toBe(3);
  });

  test('returns Monday-first weekday labels', () => {
    expect(getWeekdayLabels('en')).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    expect(getWeekdayLabels('de')).toEqual(['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']);
  });

  test('formats numeric month labels', () => {
    expect(monthLabel(1, 'en')).toBe('Jan');
    expect(monthLabel(6, 'en')).toBe('Jun');
    expect(monthLabel(12, 'de')).toBe('Dez');
    expect(monthLabel(null, 'de')).toBe('');
  });

  test('keeps the newest grid weeks in chronological order', () => {
    const weeks = [
      gridWeek('2026-01-05'),
      gridWeek('2026-01-12'),
      gridWeek('2026-01-19'),
      gridWeek('2026-01-26'),
    ];

    expect(getRecentGridWeeks(weeks, 2).map((week) => week.start_date)).toEqual([
      '2026-01-19',
      '2026-01-26',
    ]);
  });

  test('returns all available grid weeks when the limit exceeds the response', () => {
    const weeks = [gridWeek('2026-01-05'), gridWeek('2026-01-12')];

    expect(getRecentGridWeeks(weeks, 12)).toEqual(weeks);
  });
});
