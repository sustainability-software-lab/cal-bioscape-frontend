import test from 'node:test';
import assert from 'node:assert/strict';

import { TILESET_REGISTRY } from '../src/lib/tileset-registry';

test('safPlants displayName is Biorefineries, not SAF Plants', () => {
  assert.equal(TILESET_REGISTRY.safPlants.displayName, 'Biorefineries');
});

test('safPlants displayName does not contain SAF', () => {
  assert.ok(
    !TILESET_REGISTRY.safPlants.displayName.includes('SAF'),
    `Expected displayName not to contain 'SAF', got: ${TILESET_REGISTRY.safPlants.displayName}`
  );
});
