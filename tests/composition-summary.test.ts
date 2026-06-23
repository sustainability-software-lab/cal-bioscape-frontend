import test from 'node:test';
import assert from 'node:assert/strict';

import { summarizeLeadComposition } from '../src/lib/composition-filters';
import type { AnalysisListResponse } from '../src/lib/api-types';

// Mirrors the real analysis API shape for "almond shells": many lab samples per
// parameter, real-world param names ("ash solids", "volatile solids"), and a
// resource ("almond woodchips") that returns no data at all.
function resp(data: Array<{ parameter: string; value: number | null; unit: string }>): AnalysisListResponse {
  return { resource: 'x', geoid: '06000', data } as unknown as AnalysisListResponse;
}

test('summarizeLeadComposition averages samples per headline parameter', () => {
  const stats = summarizeLeadComposition(
    resp([
      { parameter: 'moisture', value: 11.66, unit: '% total weight' },
      { parameter: 'moisture', value: 11.73, unit: '% total weight' },
      { parameter: 'moisture', value: 11.58, unit: '% total weight' },
      { parameter: 'lignin', value: 29.0, unit: '% dry weight' },
      { parameter: 'lignin', value: 29.28, unit: '% dry weight' },
      { parameter: 'ash solids', value: 4.37, unit: '% total weight' },
      { parameter: 'ash solids', value: 4.51, unit: '% total weight' },
      { parameter: 'volatile solids', value: 84.0, unit: '% total weight' },
      { parameter: 'nitrogen', value: 0.7, unit: 'pc' },
      { parameter: 'ca', value: 69647, unit: 'ppm' }, // not a lead param — excluded
    ])
  );

  const byKey = Object.fromEntries(stats.map(s => [s.key, s]));

  // moisture averaged across the 3 samples
  assert.ok(Math.abs(byKey.moisture.value - 11.6566) < 0.01, 'moisture should be the mean of its samples');
  assert.equal(byKey.moisture.n, 3);
  // "ash solids" and "volatile solids" must be matched (exact findParam would miss these)
  assert.ok(byKey.ash, 'ash should match "ash solids"');
  assert.ok(byKey.volatileSolids, 'volatile solids should be matched');
  assert.ok(Math.abs(byKey.lignin.value - 29.14) < 0.01, 'lignin averaged');
  // elemental params are not surfaced as lead stats
  assert.equal(stats.find(s => s.key === 'ca'), undefined);
  assert.equal(stats.find(s => s.label === 'Ca'), undefined);
});

test('summarizeLeadComposition returns empty array for a resource with no data', () => {
  assert.deepEqual(summarizeLeadComposition(resp([])), []);
  assert.deepEqual(summarizeLeadComposition(null), []);
});

test('summarizeLeadComposition ignores null sample values', () => {
  const stats = summarizeLeadComposition(
    resp([
      { parameter: 'moisture', value: null, unit: '%' },
      { parameter: 'moisture', value: 10, unit: '%' },
    ])
  );
  assert.equal(stats[0].value, 10, 'null values must not drag the average toward zero');
  assert.equal(stats[0].n, 1);
});
