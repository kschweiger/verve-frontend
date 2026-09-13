import { describe, expect, test } from 'bun:test';
import { getAvailableTrackExtensions } from '../../src/utils/trackExtensions';

describe('getAvailableTrackExtensions', () => {
  test('returns each detected removable stream once in the product display order', () => {
    const extensions = getAvailableTrackExtensions([
      {
        id: 1,
        lat: null,
        lon: null,
        ele: null,
        time: '2026-09-13T08:00:00Z',
        dist: 0,
        hr: 140,
        cad: null,
        power: null,
      },
      {
        id: 2,
        lat: null,
        lon: null,
        ele: null,
        time: '2026-09-13T08:00:01Z',
        dist: 3,
        hr: null,
        cad: 82,
        power: null,
      },
      {
        id: 3,
        lat: null,
        lon: null,
        ele: null,
        time: '2026-09-13T08:00:02Z',
        dist: 6,
        hr: 141,
        cad: 83,
        power: null,
      },
    ]);

    expect(extensions).toEqual(['heartrate', 'cadence']);
  });

  test('does not offer a stream when every track point lacks it', () => {
    const extensions = getAvailableTrackExtensions([
      {
        id: 1,
        lat: null,
        lon: null,
        ele: null,
        time: '2026-09-13T08:00:00Z',
        dist: 0,
        hr: null,
        cad: null,
        power: null,
      },
    ]);

    expect(extensions).toEqual([]);
  });
});
