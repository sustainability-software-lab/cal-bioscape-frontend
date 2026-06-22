import test from 'node:test';
import assert from 'node:assert/strict';

import {
  validateCountySnapshot,
  countCountiesWithData,
  EXPECTED_COUNTY_COUNT,
  type CountySnapshot,
} from '../src/lib/county-snapshot-guard';
import type { CountyCropStat } from '../src/lib/county-analysis';

const crop = (resource: string): CountyCropStat => ({
  landiqName: resource,
  resource,
  parameters: [{ parameter: 'area harvested', value: 1, unit: 'ACRES', source: 'census' }],
  source: 'census',
});

/** Build a snapshot of `total` counties, the first `countiesWithData` of which carry a crop row. */
function snapshotOf(countiesWithData: number, total = EXPECTED_COUNTY_COUNT): CountySnapshot {
  const snap: CountySnapshot = {};
  for (let i = 0; i < total; i++) {
    const geoid = `060${String(i).padStart(2, '0')}`;
    snap[geoid] = i < countiesWithData ? [crop('almonds')] : [];
  }
  return snap;
}

test('accepts a full 58-county snapshot with crop data', () => {
  const result = validateCountySnapshot(snapshotOf(3), snapshotOf(3));
  assert.equal(result.ok, true, result.reason);
});

test('rejects a snapshot missing counties (< 58)', () => {
  const result = validateCountySnapshot(snapshotOf(3, 40), snapshotOf(3));
  assert.equal(result.ok, false);
  assert.match(result.reason ?? '', /40/);
});

test('rejects an all-empty snapshot when the previous had data (degraded sweep)', () => {
  const result = validateCountySnapshot(snapshotOf(0), snapshotOf(3));
  assert.equal(result.ok, false);
  assert.match(result.reason ?? '', /0 counties with data/);
});

test('accepts an all-empty snapshot when there is no previous snapshot (first build)', () => {
  const result = validateCountySnapshot(snapshotOf(0), null);
  assert.equal(result.ok, true, result.reason);
});

test('accepts an all-empty snapshot when the previous was also all-empty', () => {
  const result = validateCountySnapshot(snapshotOf(0), snapshotOf(0));
  assert.equal(result.ok, true, result.reason);
});

test('countCountiesWithData counts only counties with at least one crop row', () => {
  assert.equal(countCountiesWithData(snapshotOf(5)), 5);
  assert.equal(countCountiesWithData(snapshotOf(0)), 0);
});

test('EXPECTED_COUNTY_COUNT matches the number of California counties', () => {
  assert.equal(EXPECTED_COUNTY_COUNT, 58);
});
