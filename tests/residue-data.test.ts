import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseResidueRecords,
  shouldIncludeResidueInTotals,
} from '../src/lib/residue-data';
import type { ResidueFactors } from '../src/lib/residue-data';

// A record shaped like the live GitHub Pages resource_info.json (Title Case headers,
// real JSON booleans for the flags, string yields).
function liveAlmondRecords(): Array<Record<string, unknown>> {
  return [
    { 'Residue Type': 'Ag Residue', 'Resource': 'Almond Branches', 'LandIQ Crop Name': 'Almonds',
      'Include In Totals': true, 'Collected?': false, 'From Month': '11', 'To Month': '2',
      'Residue Yield (Wet Ton/Ac)': '1.7', 'Moisture Content': '15%', 'Residue Yield (Dry Ton/Ac)': '1.5' },
    { 'Residue Type': 'Processing Waste', 'Resource': 'Almond Hulls', 'LandIQ Crop Name': 'Almonds ',
      'Include In Totals': true, 'Collected?': true, 'From Month': '8', 'To Month': '10',
      'Residue Yield (Wet Ton/Ac)': null, 'Moisture Content': '', 'Residue Yield (Dry Ton/Ac)': null },
    { 'Residue Type': 'Processing Waste', 'Resource': 'Almond Shells and Hulls mix', 'LandIQ Crop Name': 'Almonds',
      'Include In Totals': false, 'Collected?': true, 'From Month': '8', 'To Month': '10',
      'Residue Yield (Wet Ton/Ac)': null, 'Moisture Content': '', 'Residue Yield (Dry Ton/Ac)': null },
  ];
}

test('parseResidueRecords reads Title Case headers from the live JSON shape', () => {
  const { byCrop, byResource } = parseResidueRecords(liveAlmondRecords());

  // Crop names are trimmed, so the trailing-space "Almonds " merges with "Almonds".
  assert.ok(byCrop['Almonds'], 'expected an "Almonds" crop entry');
  assert.equal(byCrop['Almonds'].length, 3);

  const branches = byResource['almond branches'];
  assert.ok(branches, 'expected the resource index keyed by lowercased resource name');
  assert.equal(branches.resourceName, 'Almond Branches');
  assert.equal(branches.dryTonsPerAcre, 1.5);
  assert.equal(branches.wetTonsPerAcre, 1.7);
  assert.equal(branches.moistureContent, 0.15);
  assert.equal(branches.residueType, 'Ag Residue');
  assert.equal(branches.collected, false);
  assert.equal(branches.includeInTotals, true);
  assert.equal(branches.fromMonth, 11);
  assert.equal(branches.toMonth, 2);
});

test('parseResidueRecords still reads legacy snake_case keys (back-compat)', () => {
  const { byResource } = parseResidueRecords([
    { resource: 'Rice straw', landiq_crop_name: 'Rice (R1)', residue_type: 'Ag Residue',
      collected: 'FALSE', include_in_totals: 'TRUE', from_month: '9', to_month: '11',
      residue_yield_wet_ton_per_ac: '2.0', moisture_content: '25%', residue_yield_dry_ton_per_ac: '1.5' },
  ]);
  const straw = byResource['rice straw'];
  assert.ok(straw);
  assert.equal(straw.dryTonsPerAcre, 1.5);
  assert.equal(straw.collected, false);
  assert.equal(straw.includeInTotals, true);
});

test('parseResidueRecords parses include_in_totals from boolean and "TRUE", missing → false', () => {
  const { byResource } = parseResidueRecords([
    { 'Resource': 'A', 'LandIQ Crop Name': 'Crop A', 'Include In Totals': true, 'Collected?': false,
      'Residue Yield (Dry Ton/Ac)': '1', 'Residue Yield (Wet Ton/Ac)': '1', 'From Month': '1', 'To Month': '2' },
    { 'Resource': 'B', 'LandIQ Crop Name': 'Crop B', 'Include In Totals': false, 'Collected?': false,
      'Residue Yield (Dry Ton/Ac)': '1', 'Residue Yield (Wet Ton/Ac)': '1', 'From Month': '1', 'To Month': '2' },
    // No Include In Totals key at all → must default to false (excluded).
    { 'Resource': 'C', 'LandIQ Crop Name': 'Crop C', 'Collected?': false,
      'Residue Yield (Dry Ton/Ac)': '1', 'Residue Yield (Wet Ton/Ac)': '1', 'From Month': '1', 'To Month': '2' },
  ]);
  assert.equal(byResource['a'].includeInTotals, true);
  assert.equal(byResource['b'].includeInTotals, false);
  assert.equal(byResource['c'].includeInTotals, false);
});

function factor(overrides: Partial<ResidueFactors>): ResidueFactors {
  return {
    resourceName: 'x',
    wetTonsPerAcre: 1,
    dryTonsPerAcre: 1,
    moistureContent: 0.1,
    seasonalAvailability: {},
    residueType: 'Ag Residue',
    collected: false,
    includeInTotals: true,
    ...overrides,
  };
}

test('shouldIncludeResidueInTotals: true only when includeInTotals===true AND collected===false', () => {
  assert.equal(shouldIncludeResidueInTotals(factor({})), true);
  assert.equal(shouldIncludeResidueInTotals(factor({ includeInTotals: false })), false);
  assert.equal(shouldIncludeResidueInTotals(factor({ collected: true })), false);
  assert.equal(shouldIncludeResidueInTotals(factor({ includeInTotals: false, collected: true })), false);
  // Missing/undefined flag (e.g. a record stripped of the key) is excluded.
  assert.equal(shouldIncludeResidueInTotals(factor({ includeInTotals: undefined })), false);
});

test('almond records de-duplicate: included set drops the "mix" combo and collected hulls', () => {
  const { byCrop } = parseResidueRecords(liveAlmondRecords());
  const included = byCrop['Almonds'].filter(shouldIncludeResidueInTotals);
  const names = included.map(f => f.resourceName);
  assert.deepEqual(names, ['Almond Branches']);
  // The overlapping "Shells and Hulls mix" (include=false) and collected hulls are excluded.
  assert.ok(!names.includes('Almond Shells and Hulls mix'));
  assert.ok(!names.includes('Almond Hulls'));
});
