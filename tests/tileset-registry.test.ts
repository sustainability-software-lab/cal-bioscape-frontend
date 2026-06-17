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

test('TILESET_REGISTRY includes a county entry with GEOID-bearing source layer', () => {
  const county = TILESET_REGISTRY.county;
  assert.ok(county, 'county entry must exist in TILESET_REGISTRY');
  assert.ok(county.tilesetId && county.tilesetId.length > 0, 'county.tilesetId must be non-empty');
  // GeoJSON-backed counties use 'geojson:///' prefix; vector-tileset-backed ones need a sourceLayer.
  const isGeoJson = county.tilesetId.startsWith('geojson:///');
  if (!isGeoJson) {
    assert.ok(county.sourceLayer && county.sourceLayer.length > 0, 'county.sourceLayer must be non-empty for vector tilesets');
  }
  assert.equal(county.displayName, 'County Level Stats');
  assert.equal(county.category, 'feedstock');
});
