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
