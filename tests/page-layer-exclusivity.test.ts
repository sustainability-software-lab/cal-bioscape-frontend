import test from 'node:test';
import assert from 'node:assert/strict';

import { applyLayerMutualExclusivity } from '../src/lib/layer-utils';

test('applyLayerMutualExclusivity hides feedstock when county is enabled', () => {
  const visibility = { feedstock: true, county: false };
  const result = applyLayerMutualExclusivity(visibility, 'county', true);
  assert.equal(result.county, true);
  assert.equal(result.feedstock, false);
});

test('applyLayerMutualExclusivity hides county when feedstock is enabled', () => {
  const visibility = { feedstock: false, county: true };
  const result = applyLayerMutualExclusivity(visibility, 'feedstock', true);
  assert.equal(result.feedstock, true);
  assert.equal(result.county, false);
});

test('applyLayerMutualExclusivity toggling a layer off leaves the other unchanged', () => {
  const visibility = { feedstock: false, county: true };
  const result = applyLayerMutualExclusivity(visibility, 'county', false);
  assert.equal(result.county, false);
  assert.equal(result.feedstock, false);
});

test('applyLayerMutualExclusivity does not affect unrelated layers', () => {
  const visibility = { feedstock: true, county: false, railLines: true };
  const result = applyLayerMutualExclusivity(visibility, 'county', true);
  assert.equal(result.railLines, true);
});
