import test from 'node:test';
import assert from 'node:assert/strict';

import { buildCarbFeatures, CURATED_COLUMNS } from '../src/lib/carb-food-processors-build';
import { buildRecipe } from '../scripts/upload-carb-tileset';

const FIXTURE_CSV = `processing_facility_id,name,address,city,county,zip,state,latitude,longitude,geom,primary_ag_product,process_type,byproducts,quantities,processing_capacity_products,processing_capacity_ton_hr,general_source_info,source_url,CARB_facility_id,air_district,EPA_facility_id,NAICS_code,NAICS_code_description,phone_number,website,excess_food_estimate_low,excess_food_estimate_high,etl_run_id,lineage_group_id,created_at,updated_at
1,Valid Winery,123 Main St,Napa,Napa,94559,CA,38.2975,-122.2869,,Grapes,Wine Processing,"Pomace, Stems",,,,CARB 2024,,1,Bay Area,,,,,,,,1,1,2026-06-05,2026-06-05
2,Missing Coords Farm,456 Oak Ave,Fresno,Fresno,93706,CA,,,,,Almonds,Hulls,,,,CARB 2024,,2,Valley,,,,,,,,1,1,2026-06-05,2026-06-05
3,Empty Dropped Col,789 Pine St,Davis,Yolo,95616,CA,38.5449,-121.7405,,Tomatoes,Canning,Skins,,,,CARB 2024,,3,Sacramento,,,,,,,,1,1,2026-06-05,2026-06-05`;

test('buildCarbFeatures drops rows without numeric coordinates and curates properties', () => {
  const features = buildCarbFeatures(FIXTURE_CSV);

  // Only 2 rows have valid coordinates (row 1 and row 3); row 2 has empty lat/lon
  assert.equal(features.length, 2, `Expected 2 features, got ${features.length}`);

  const valid = features[0];
  assert.equal(valid.type, 'Feature');
  assert.equal(valid.geometry.type, 'Point');

  // Coordinates must be [longitude, latitude] order
  assert.deepEqual(valid.geometry.coordinates, [-122.2869, 38.2975]);

  // Curated columns must be present in properties when non-empty
  assert.equal(valid.properties!['name'], 'Valid Winery');
  assert.equal(valid.properties!['city'], 'Napa');
  assert.equal(valid.properties!['primary_ag_product'], 'Grapes');

  // Dropped columns must not appear in properties
  assert.ok(!('etl_run_id' in valid.properties!), 'etl_run_id should not be in properties');
  assert.ok(!('processing_facility_id' in valid.properties!), 'processing_facility_id should not be in properties');
  assert.ok(!('geom' in valid.properties!), 'geom should not be in properties');
});

test('CURATED_COLUMNS does not include dropped columns', () => {
  const dropped = ['processing_facility_id', 'geom', 'etl_run_id', 'lineage_group_id', 'created_at', 'updated_at', 'source_url'];
  const cols: readonly string[] = CURATED_COLUMNS;
  for (const col of dropped) {
    assert.ok(!cols.includes(col), `CURATED_COLUMNS must not include ${col}`);
  }
});

test('buildCarbFeatures omits empty string values from properties', () => {
  const features = buildCarbFeatures(FIXTURE_CSV);
  for (const f of features) {
    for (const [k, v] of Object.entries(f.properties!)) {
      assert.ok(v !== '', `Property ${k} should not have an empty string value`);
    }
  }
});

test('buildRecipe targets the canonical tileset id and source layer', () => {
  const recipe = buildRecipe() as { version: number; layers: Record<string, { source: string; minzoom: number; maxzoom: number }> };
  assert.ok('carb_food_processors' in recipe.layers, 'recipe must have carb_food_processors layer');
  const layer = recipe.layers['carb_food_processors'];
  assert.ok(layer.source.includes('sustainasoft'), 'source must reference sustainasoft account');
  assert.ok(layer.source.includes('carb_food_processors'), 'source must reference carb_food_processors');
});
