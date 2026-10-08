import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDailyDeltaStats } from './deadlines.js';

test('buildDailyDeltaStats converts daily snapshots into day-over-day increments', () => {
  const stats = [
    { date: '2026-07-01T00:00:00.000Z', validCount: 2, emptyCount: 1, needsReplacementCount: 0, neutralCount: 7 },
    { date: '2026-07-02T00:00:00.000Z', validCount: 3, emptyCount: 1, needsReplacementCount: 1, neutralCount: 6 },
    { date: '2026-07-03T00:00:00.000Z', validCount: 4, emptyCount: 1, needsReplacementCount: 1, neutralCount: 5 }
  ];

  const result = buildDailyDeltaStats(stats);

  assert.deepEqual(result, [
    { date: '2026-07-01T00:00:00.000Z', validCount: 2, emptyCount: 1, needsReplacementCount: 0, neutralCount: 7 },
    { date: '2026-07-02T00:00:00.000Z', validCount: 1, emptyCount: 0, needsReplacementCount: 1, neutralCount: 0 },
    { date: '2026-07-03T00:00:00.000Z', validCount: 1, emptyCount: 0, needsReplacementCount: 0, neutralCount: 0 }
  ]);
});
