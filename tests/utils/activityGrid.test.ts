import { describe, expect, test } from 'bun:test';
import type { GridDay, GridWeek } from '../../src/stores/statistics';
import {
  formatActivityGridCellDetails,
  formatActivityGridDuration,
  formatLastActiveDay,
  formatWeekActivityStreak,
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
    expect(formatActivityGridDuration(0)).toBe('0m');
    expect(formatActivityGridDuration(1800)).toBe('30m');
    expect(formatActivityGridDuration(5400)).toBe('1h 30m');
    expect(formatActivityGridDuration(7200)).toBe('2h');
  });

  test('formats cell details with singular activity count', () => {
    const day: GridDay = {
      date: '2026-06-15',
      activity_count: 1,
      duration_seconds: 3600,
      effective_duration_seconds: 2700,
    };

    expect(formatActivityGridCellDetails(day)).toBe('2026-06-15 · 1 activity · 45m active · 1h total');
  });

  test('formats cell details with plural activity count and matching effective and total duration', () => {
    const day: GridDay = {
      date: '2026-06-16',
      activity_count: 3,
      duration_seconds: 5400,
      effective_duration_seconds: 5400,
    };

    expect(formatActivityGridCellDetails(day)).toBe('2026-06-16 · 3 activities · 1h 30m active');
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

  test('formats last active day relative to a pinned date', () => {
    const today = new Date(2026, 5, 15);

    expect(formatLastActiveDay('2026-06-15', today)).toBe('Today');
    expect(formatLastActiveDay('2026-06-14', today)).toBe('Yesterday');
    expect(formatLastActiveDay('2026-06-12', today)).toBe('3 days ago');
    expect(formatLastActiveDay(null, today)).toBe('No activity');
  });

  test('formats older last active days as compact dates', () => {
    const today = new Date(2026, 5, 15);

    expect(formatLastActiveDay('2026-05-01', today)).toBe('May 1');
  });

  test('formats week activity streaks', () => {
    expect(formatWeekActivityStreak(0)).toBe('0 weeks');
    expect(formatWeekActivityStreak(1)).toBe('1 week');
    expect(formatWeekActivityStreak(4)).toBe('4 weeks');
  });

  test('returns Monday-first weekday labels', () => {
    expect(getWeekdayLabels()).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  });

  test('formats numeric month labels', () => {
    expect(monthLabel(1)).toBe('Jan');
    expect(monthLabel(6)).toBe('Jun');
    expect(monthLabel(null)).toBe('');
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
