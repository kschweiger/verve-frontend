import { describe, expect, test } from 'bun:test';
import type { GridDay } from '../../src/stores/statistics';
import {
  formatActivityGridCellDetails,
  formatActivityGridDuration,
  formatLastActiveDay,
  formatWeekActivityStreak,
  getActivityGridIntensity,
  getWeekdayLabels,
  hasActivityGridCellDetails,
  monthLabel,
} from '../../src/utils/activityGrid';

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
    };

    expect(formatActivityGridCellDetails(day)).toBe('2026-06-15 · 1 activity · 1h');
  });

  test('formats cell details with plural activity count and duration', () => {
    const day: GridDay = {
      date: '2026-06-16',
      activity_count: 3,
      duration_seconds: 5400,
    };

    expect(formatActivityGridCellDetails(day)).toBe('2026-06-16 · 3 activities · 1h 30m');
  });

  test('only days with activities have cell details', () => {
    const activeDay: GridDay = {
      date: '2026-06-15',
      activity_count: 1,
      duration_seconds: 1800,
    };
    const inactiveDay: GridDay = {
      date: '2026-06-16',
      activity_count: 0,
      duration_seconds: 0,
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
});
