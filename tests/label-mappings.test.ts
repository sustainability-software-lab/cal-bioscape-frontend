import test from 'node:test';
import assert from 'node:assert/strict';

import { layerLabelMappings } from '../src/lib/labelMappings.js';

// Every layer listed in Map.js interactiveLayers must have an entry here so
// popups (callout boxes) show human-readable labels instead of raw field names.
const EXPECTED_LAYER_KEYS = [
  'renewable-diesel',
  'saf-plants',
  'cement-plants',
  'mrf',
  'rail-lines',
  'anaerobic-digester',
  'biorefineries',
  'biodiesel-plants',
  'landfill-lfg',
  'wastewater-treatment',
  'food-processors',
  'carb-food-processors',
  'food-retailers',
  'power-plants',
  'food-banks',
  'farmers-markets',
  // These were missing — their popups showed raw field names:
  'waste-to-energy',
  'combustion-plants',
  'district-energy-systems',
  'freight-terminals',
  'freight-routes',
  'petroleum-pipelines',
  'crude-oil-pipelines',
  'natural-gas-pipelines',
];

for (const layerKey of EXPECTED_LAYER_KEYS) {
  test(`layerLabelMappings has an entry for '${layerKey}'`, () => {
    assert.ok(
      Object.prototype.hasOwnProperty.call(layerLabelMappings, layerKey),
      `Missing label mapping for layer '${layerKey}' — its popup will show raw field names`
    );
  });
}

const LAT_LON_KEYS = new Set([
  'lat', 'lon', 'latitude', 'longitude',
  'LATITUDE', 'LONGITUDE', 'Latitude', 'Longitude',
]);

for (const [layerKey, mapping] of Object.entries(layerLabelMappings)) {
  const keys = Object.keys(mapping as Record<string, string>);
  const latLonIndices = keys.map((k, i) => LAT_LON_KEYS.has(k) ? i : -1).filter(i => i >= 0);

  if (latLonIndices.length === 0) continue;

  test(`'${layerKey}': lat/lon keys appear after all other fields`, () => {
    const nonLatLonIndices = keys.map((k, i) => LAT_LON_KEYS.has(k) ? -1 : i).filter(i => i >= 0);
    const firstLatLon = Math.min(...latLonIndices);
    const lastNonLatLon = nonLatLonIndices.length > 0 ? Math.max(...nonLatLonIndices) : -1;
    assert.ok(
      firstLatLon > lastNonLatLon,
      `Layer '${layerKey}': lat/lon key(s) at index ${firstLatLon} but non-lat/lon key at index ${lastNonLatLon} — lat/lon must be last`
    );
  });

  if (latLonIndices.length === 2) {
    test(`'${layerKey}': lat and lon keys are adjacent`, () => {
      const [a, b] = latLonIndices;
      assert.equal(
        Math.abs(a - b),
        1,
        `Layer '${layerKey}': lat/lon keys at indices ${a} and ${b} are not adjacent`
      );
    });
  }
}
