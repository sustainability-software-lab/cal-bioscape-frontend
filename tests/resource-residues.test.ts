import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseFeatureResources,
  getResidueFactorsByResourceNames,
} from '../src/lib/resource-residues';
import type { ResidueFactors } from '../src/lib/residue-data';

function makeFactor(resourceName: string, dry = 1, wet = 2): ResidueFactors {
  return {
    resourceName,
    wetTonsPerAcre: wet,
    dryTonsPerAcre: dry,
    moistureContent: 0.1,
    seasonalAvailability: {},
    residueType: 'Ag Residue',
    collected: true,
  };
}

test('parseFeatureResources splits a pipe-delimited string into trimmed names', () => {
  const result = parseFeatureResources({ resources: 'almond hulls|almond shells|almond branches' });
  assert.deepEqual(result, ['almond hulls', 'almond shells', 'almond branches']);
});

test('parseFeatureResources returns [] when the property is missing or null', () => {
  assert.deepEqual(parseFeatureResources({}), []);
  assert.deepEqual(parseFeatureResources({ resources: null }), []);
  assert.deepEqual(parseFeatureResources(null), []);
});

test('parseFeatureResources returns [] for an empty or whitespace-only string and drops empty segments', () => {
  assert.deepEqual(parseFeatureResources({ resources: '' }), []);
  assert.deepEqual(parseFeatureResources({ resources: '   ' }), []);
  assert.deepEqual(parseFeatureResources({ resources: 'rice straw||  |rice hulls' }), ['rice straw', 'rice hulls']);
});

test('getResidueFactorsByResourceNames returns null for an empty array', () => {
  assert.equal(getResidueFactorsByResourceNames([], () => makeFactor('x')), null);
});

test('getResidueFactorsByResourceNames resolves names to factors with source "api"', () => {
  const resolve = (name: string) => makeFactor(name, 0.5, 1.5);
  const result = getResidueFactorsByResourceNames(['almond hulls', 'almond shells'], resolve);
  assert.ok(result);
  assert.equal(result!.source, 'api');
  assert.equal(result!.factors.length, 2);
  assert.equal(result!.factors[0].resourceName, 'almond hulls');
  assert.equal(result!.factors[0].dryTonsPerAcre, 0.5);
});

test('getResidueFactorsByResourceNames returns null when no name resolves (triggers fallback)', () => {
  const result = getResidueFactorsByResourceNames(['nonexistent residue'], () => null);
  assert.equal(result, null);
});

test('getResidueFactorsByResourceNames skips zero-yield factors and keeps only resolvable ones', () => {
  const resolve = (name: string) =>
    name === 'has yield' ? makeFactor(name, 1, 1) : makeFactor(name, 0, 0);
  const result = getResidueFactorsByResourceNames(['has yield', 'no yield'], resolve);
  assert.ok(result);
  assert.equal(result!.factors.length, 1);
  assert.equal(result!.factors[0].resourceName, 'has yield');
});
