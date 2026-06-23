import test from 'node:test';
import assert from 'node:assert/strict';

import { buildEpaFeatures, CURATED_COLUMNS, CA_BBOX } from '../src/lib/epa-food-processors-build';
import { buildRecipe } from '../scripts/upload-epa-tileset';

// Columns mirror src/data/epa_food_processors_ca.csv (raw EPA CA extract + geocode output).
const HEADER =
  'name,naics_description,naics_code,address,city,state,county,zip,phone,website,excess_food_low,excess_food_high,unique_id,data_source,latitude,longitude,geocode_status';

const FIXTURE_CSV = [
  HEADER,
  // 1: valid CA facility (San Francisco) — kept
  '001 Vintners,Wineries,312130,451 Jackson St,San Francisco,CA,San Francisco,94111,,,19.8961205,63.817745,FMP29939,EPA 2023,37.796455,-122.402762,success',
  // 2: missing coordinates — dropped
  'No Coords Bakery,Retail Bakeries,311811,1 Nowhere St,Nowhere,CA,Nowhere,00000,,,1.0,2.0,FMP0001,EPA 2023,,,success',
  // 3: geocode failed — dropped
  'Failed Geocode Co,Distilleries,312140,2 Unknown Rd,Somewhere,CA,Somewhere,99999,,,5.0,9.0,FMP0002,EPA 2023,,,No_Match',
  // 4: success but OUTSIDE the CA bbox (Texas) — dropped by the build-lib bbox guard
  'Out Of State Meats,Meat Processing,311612,99 Main St,Dallas,CA,Dallas,75201,,,3.0,7.0,FMP0003,EPA 2023,32.776272,-96.796856,success',
].join('\n');

test('buildEpaFeatures keeps only in-CA geocoded rows', () => {
  const features = buildEpaFeatures(FIXTURE_CSV);
  // Only row 1 survives: row 2 (no coords), row 3 (geocode failed), row 4 (outside CA bbox).
  assert.equal(features.length, 1, `Expected 1 feature, got ${features.length}`);

  const f = features[0];
  assert.equal(f.type, 'Feature');
  assert.equal(f.geometry.type, 'Point');
  // [longitude, latitude] order
  assert.deepEqual(f.geometry.coordinates, [-122.402762, 37.796455]);
  assert.equal(f.properties!['name'], '001 Vintners');
  assert.equal(f.properties!['naics_description'], 'Wineries');
  assert.equal(f.properties!['naics_code'], '312130');
});

test('buildEpaFeatures drops every feature outside the California bounding box', () => {
  const features = buildEpaFeatures(FIXTURE_CSV);
  for (const f of features) {
    const [lon, lat] = f.geometry.coordinates;
    assert.ok(lon >= CA_BBOX.minLon && lon <= CA_BBOX.maxLon, `lon ${lon} outside CA bbox`);
    assert.ok(lat >= CA_BBOX.minLat && lat <= CA_BBOX.maxLat, `lat ${lat} outside CA bbox`);
  }
});

test('buildEpaFeatures rounds excess-food estimates to 1 decimal and lat/lon to 6', () => {
  const f = buildEpaFeatures(FIXTURE_CSV)[0];
  assert.equal(f.properties!['excess_food_low'], '19.9');
  assert.equal(f.properties!['excess_food_high'], '63.8');
  assert.equal(f.properties!['latitude'], '37.796455');
  assert.equal(f.properties!['longitude'], '-122.402762');
});

test('CURATED_COLUMNS excludes provenance/non-display columns', () => {
  const dropped = ['unique_id', 'geocode_status', 'geom'];
  const cols: readonly string[] = CURATED_COLUMNS;
  for (const col of dropped) {
    assert.ok(!cols.includes(col), `CURATED_COLUMNS must not include ${col}`);
  }
  const f = buildEpaFeatures(FIXTURE_CSV)[0];
  assert.ok(!('unique_id' in f.properties!), 'unique_id should not be in properties');
  assert.ok(!('geocode_status' in f.properties!), 'geocode_status should not be in properties');
});

test('buildRecipe targets the canonical EPA tileset source layer', () => {
  const recipe = buildRecipe() as { version: number; layers: Record<string, { source: string; minzoom: number; maxzoom: number }> };
  assert.ok('epa_food_processors' in recipe.layers, 'recipe must have epa_food_processors layer');
  const layer = recipe.layers['epa_food_processors'];
  assert.ok(layer.source.includes('sustainasoft'), 'source must reference sustainasoft account');
  assert.ok(layer.source.includes('epa_food_processors'), 'source must reference epa_food_processors');
});
