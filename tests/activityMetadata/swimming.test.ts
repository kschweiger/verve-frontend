import { describe, expect, test } from 'bun:test';
import swimmingVerveFile from '../fixtures/swimming_verve_file.json';
import {
  extractSwimmingMetadataFromVerveFile,
  parseSwimmingMetadata,
} from '../../src/activityMetadata/swimming';

const backendSwimmingMetadata = {
  target: 'SwimmingMetaData',
  pool_length_meters: 50,
  total_stroke_count: 337,
  avg_swofl: 97.1,
  lap_count: 10,
  set_count: 2,
  styles: ['breaststroke', 'freestyle'],
  sets: [
    {
      index: 1,
      durations: 'PT119.887904S',
      lap_start_index: 2,
      lap_end_index: 3,
      lap_count: 2,
      distance_meters: 100,
      style: 'breaststroke',
      stroke_count: 56,
      avg_swofl: 85.898,
      rest_after: 'PT54.548284S',
    },
    {
      index: 0,
      durations: 'PT120.322319S',
      lap_start_index: 0,
      lap_end_index: 1,
      lap_count: 2,
      distance_meters: 100,
      style: 'breaststroke',
      stroke_count: 53,
      avg_swofl: 83.651,
      rest_after: 'PT109.150303S',
    },
  ],
};

describe('parseSwimmingMetadata', () => {
  test('normalizes backend swimming metadata general fields and sets', () => {
    const metadata = parseSwimmingMetadata(backendSwimmingMetadata);

    expect(metadata).not.toBeNull();
    expect(metadata?.poolLengthMeters).toBe(50);
    expect(metadata?.totalStrokeCount).toBe(337);
    expect(metadata?.averageSwolf).toBe(97.1);
    expect(metadata?.lapCount).toBe(10);
    expect(metadata?.setCount).toBe(2);
    expect(metadata?.styles).toEqual(['breaststroke', 'freestyle']);
    expect(metadata?.sets.map((set) => set.index)).toEqual([0, 1]);
    expect(metadata?.sets[0]).toEqual({
      index: 0,
      durationSeconds: 120.322319,
      lapStartIndex: 0,
      lapEndIndex: 1,
      lapCount: 2,
      distanceMeters: 100,
      style: 'breaststroke',
      strokeCount: 53,
      averageSwolf: 83.651,
      restAfterSeconds: 109.150303,
    });
  });

  test('returns null for non-swim metadata', () => {
    expect(parseSwimmingMetadata({ target: 'CyclingMetaData', sets: [] })).toBeNull();
  });

  test('returns null for empty swim metadata', () => {
    expect(parseSwimmingMetadata({ target: 'SwimmingMetaData', sets: [] })).toBeNull();
  });

  test('ignores malformed set entries without crashing', () => {
    const metadata = parseSwimmingMetadata({
      target: 'SwimmingMetaData',
      set_count: 2,
      sets: [
        { index: 0, distance_meters: 100 },
        { distance_meters: 50 },
        null,
        'not a set',
      ],
    });

    expect(metadata).not.toBeNull();
    expect(metadata?.sets).toEqual([
      {
        index: 0,
        distanceMeters: 100,
      },
    ]);
  });
});

describe('extractSwimmingMetadataFromVerveFile', () => {
  test('normalizes supplied Verve file swimming envelope for fixture parity', () => {
    const metadata = extractSwimmingMetadataFromVerveFile(swimmingVerveFile);

    expect(metadata).not.toBeNull();
    expect(metadata?.poolLengthMeters).toBe(50);
    expect(metadata?.totalStrokeCount).toBe(476);
    expect(metadata?.averageSwolf).toBe(91.06040330976248);
    expect(metadata?.lapCount).toBe(16);
    expect(metadata?.setCount).toBe(10);
    expect(metadata?.styles).toEqual(['backstroke', 'breaststroke', 'freestyle']);
    expect(metadata?.sets).toHaveLength(10);
    expect(metadata?.sets[0]).toMatchObject({
      index: 0,
      distanceMeters: 100,
      durationSeconds: 120.32231903076172,
      lapCount: 2,
      style: 'breaststroke',
      strokeCount: 53,
      averageSwolf: 83.65062963962555,
      restAfterSeconds: 109.15030324459076,
    });
  });
});
