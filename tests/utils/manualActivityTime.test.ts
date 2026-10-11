import { expect, test } from 'bun:test';
import {
  localActivityTimeToInstant,
  currentActivityLocalTime,
} from '../../src/utils/manualActivityTime';

test.each([
  ['2026-07-01T10:00', 'Europe/Berlin', '2026-07-01T08:00:00.000Z'],
  ['2026-01-01T10:00', 'Europe/Berlin', '2026-01-01T09:00:00.000Z'],
  ['2026-07-01T10:00', 'America/Los_Angeles', '2026-07-01T17:00:00.000Z'],
  ['2026-07-01T10:00', 'Asia/Kolkata', '2026-07-01T04:30:00.000Z'],
  ['2026-10-25T02:30', 'Europe/Berlin', '2026-10-25T00:30:00.000Z'],
  ['2026-03-29T02:30', 'Europe/Berlin', '2026-03-29T01:30:00.000Z'],
  ['2026-10-04T02:15', 'Australia/Lord_Howe', '2026-10-03T15:45:00.000Z'],
])('converts %s in %s', (local, zone, expected) => {
  expect(localActivityTimeToInstant(local, zone)).toBe(expected);
});

test('initializes the input in its timezone', () => {
  expect(currentActivityLocalTime('America/Los_Angeles', new Date('2026-07-01T01:30:00Z'))).toBe(
    '2026-06-30T18:30'
  );
});

test('rejects invalid local dates and unsupported zones', () => {
  expect(() => localActivityTimeToInstant('2026-02-30T10:00', 'Europe/Berlin')).toThrow();
  expect(() => localActivityTimeToInstant('2026-07-01T10:00', 'Mars/Olympus')).toThrow();
});

test('reports browser-unavailable zones without substituting a timezone', () => {
  expect(() => localActivityTimeToInstant('2026-07-01T10:00', 'Factory')).toThrow('Your browser cannot process Factory');
});
