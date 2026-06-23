import test from 'node:test';
import assert from 'node:assert/strict';

import {
  validateCountySnapshot,
  countCountiesWithData,
  serializeCountySnapshot,
  EXPECTED_COUNTY_COUNT,
  MIN_DATA_COVERAGE_RATIO,
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

test('rejects a snapshot whose data coverage collapses below the retention floor (partial sweep)', () => {
  // 40 -> 10 is a 75% drop, below the 50% retention floor. Because the client now
  // ships empty entries as authoritative "no data", this degraded sweep must be
  // caught here rather than silently marking 30 real counties as no-data.
  const result = validateCountySnapshot(snapshotOf(10), snapshotOf(40));
  assert.equal(result.ok, false);
  assert.match(result.reason ?? '', /collapsed from 40 to 10/);
});

test('accepts a minor data-coverage fluctuation above the retention floor', () => {
  const result = validateCountySnapshot(snapshotOf(38), snapshotOf(40));
  assert.equal(result.ok, true, result.reason);
});

test('retention floor: 3 -> 2 accepted, 3 -> 1 rejected', () => {
  assert.equal(validateCountySnapshot(snapshotOf(2), snapshotOf(3)).ok, true);
  assert.equal(validateCountySnapshot(snapshotOf(1), snapshotOf(3)).ok, false);
});

test('MIN_DATA_COVERAGE_RATIO is a fraction in (0, 1]', () => {
  assert.ok(MIN_DATA_COVERAGE_RATIO > 0 && MIN_DATA_COVERAGE_RATIO <= 1);
});

test('countCountiesWithData counts only counties with at least one crop row', () => {
  assert.equal(countCountiesWithData(snapshotOf(5)), 5);
  assert.equal(countCountiesWithData(snapshotOf(0)), 0);
});

test('EXPECTED_COUNTY_COUNT matches the number of California counties', () => {
  assert.equal(EXPECTED_COUNTY_COUNT, 58);
});

test('serializeCountySnapshot emits keys sorted by geoid', () => {
  const snap: CountySnapshot = { '06099': [], '06001': [], '06047': [] };
  const keys = Object.keys(JSON.parse(serializeCountySnapshot(snap)));
  assert.deepEqual(keys, ['06001', '06047', '06099']);
});

test('serializeCountySnapshot is byte-stable regardless of input insertion order', () => {
  // Same data, different key insertion order (mimics concurrent fetch completion)
  // must serialize identically — otherwise scheduled runs commit spurious diffs.
  const a: CountySnapshot = { '06001': [crop('almonds')], '06099': [], '06047': [crop('tomatoes')] };
  const b: CountySnapshot = { '06047': [crop('tomatoes')], '06001': [crop('almonds')], '06099': [] };
  assert.equal(serializeCountySnapshot(a), serializeCountySnapshot(b));
});
