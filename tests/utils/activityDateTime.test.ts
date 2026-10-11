import { describe, expect, test } from 'bun:test';
import * as datetime from '../../src/utils/datetime';
import cases from '../fixtures/timezones/cases.json';

describe('activity local timestamps', () => {
  test.each(cases.cases)('$id displays the backend expected local start', ({ expected }) => {
    const result = datetime.formatActivityTimestamp(
      expected.start,
      expected.timezone,
      { dateStyle: 'short', timeStyle: 'medium' },
      'sv-SE'
    );
    expect(result.text).toBe(expected.local_start.replace('T', ' '));
    expect(result.isLocalTimeAvailable).toBe(true);
  });

  test('equivalent offset and UTC timestamps format identically', () => {
    const options = { dateStyle: 'short', timeStyle: 'medium' } as const;
    const utc = datetime.formatActivityTimestamp(
      '2026-08-10T08:00:00Z',
      'Europe/Berlin',
      options,
      'sv-SE'
    );
    const offset = datetime.formatActivityTimestamp(
      '2026-08-10T10:00:00+02:00',
      'Europe/Berlin',
      options,
      'sv-SE'
    );
    expect(utc.text).toBe('2026-08-10 10:00:00');
    expect(offset).toEqual(utc);
  });

  test('an unavailable browser timezone is explicit and retains the instant and zone', () => {
    const result = datetime.formatActivityTimestamp('2026-08-10T08:00:00Z', 'Factory');
    expect(result.isLocalTimeAvailable).toBe(false);
    expect(result.text).toContain('Local time unavailable');
    expect(result.text).toContain('2026-08-10T08:00:00Z');
    expect(result.text).toContain('Factory');
  });
});

describe('elapsed time between instants', () => {
  test.each(cases.cases)('$id retains plot positions through timezone changes', ({ expected }) => {
    expect(
      expected.point_times.map((time) =>
        datetime.elapsedSecondsBetweenInstants(expected.start, time)
      )
    ).toEqual(expected.elapsed_seconds);
    expect(
      datetime.elapsedSecondsBetweenInstants(expected.point_times[0]!, expected.point_times[2]!)
    ).toBe(expected.duration_seconds);
  });

  test('offset timestamps measure five minutes across the repeated DST hour', () => {
    expect(
      datetime.elapsedSecondsBetweenInstants(
        '2026-10-25T02:55:00+02:00',
        '2026-10-25T02:00:00+01:00'
      )
    ).toBe(300);
  });

  test('offsetless and invalid timestamps cannot supply browser-dependent elapsed time', () => {
    expect(
      datetime.elapsedSecondsBetweenInstants('2026-08-10T08:00:00', '2026-08-10T08:05:00Z')
    ).toBeNull();
    expect(datetime.elapsedSecondsBetweenInstants('invalid', '2026-08-10T08:05:00Z')).toBeNull();
  });
});
