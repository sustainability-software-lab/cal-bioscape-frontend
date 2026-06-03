import test from 'node:test';
import assert from 'node:assert/strict';

import { COMPOSITION_FALLBACKS } from '../src/lib/composition-fallbacks';
import {
  COMPOSITION_FILTER_BOUNDS,
  DEFAULT_COMPOSITION_FILTERS,
} from '../src/lib/composition-filters';

// Wet feedstocks specifically called out in issue #46

test('strawberries ash content is below 10% (dry basis)', () => {
  const ash = COMPOSITION_FALLBACKS['Strawberries']?.ash ?? Infinity;
  assert.ok(ash < 10, `Expected Strawberries ash < 10%, got ${ash}%`);
});

test('cole crops ash content is below 10% (dry basis)', () => {
  const ash = COMPOSITION_FALLBACKS['Cole Crops']?.ash ?? Infinity;
  assert.ok(ash < 10, `Expected Cole Crops ash < 10%, got ${ash}%`);
});

test('lettuce/leafy greens ash content is below 10% (dry basis)', () => {
  const ash = COMPOSITION_FALLBACKS['Lettuce/Leafy Greens']?.ash ?? Infinity;
  assert.ok(ash < 10, `Expected Lettuce/Leafy Greens ash < 10%, got ${ash}%`);
});

test('no wet vegetable feedstock has higher ash than rice straw (14%)', () => {
  const wetVegetables = [
    'Strawberries', 'Cole Crops', 'Lettuce/Leafy Greens',
    'Carrots', 'Melons, Squash and Cucumbers', 'Miscellaneous Truck Crops',
    'Peppers', 'Potatoes', 'Sweet Potatoes', 'Greenhouse',
  ];
  const riceAsh = COMPOSITION_FALLBACKS['Rice']?.ash ?? 14;
  for (const crop of wetVegetables) {
    const ash = COMPOSITION_FALLBACKS[crop]?.ash ?? 0;
    assert.ok(
      ash <= riceAsh,
      `${crop} ash (${ash}%) should not exceed rice straw ash (${riceAsh}%)`
    );
  }
});

// Slider cap — issue #46 asks for max 15% instead of 30%

test('ash filter bound maximum is 15%', () => {
  assert.equal(COMPOSITION_FILTER_BOUNDS.ash[1], 15);
});

test('default ash filter maximum is 15%', () => {
  assert.equal(DEFAULT_COMPOSITION_FILTERS.ash[1], 15);
});

test('all fallback ash values fit within the 0–15% slider range', () => {
  const [min, max] = COMPOSITION_FILTER_BOUNDS.ash;
  for (const [crop, comp] of Object.entries(COMPOSITION_FALLBACKS)) {
    if (comp.ash === undefined) continue;
    // Rice straw at 14% is the only known high-ash entry; ensure nothing exceeds the cap
    assert.ok(
      comp.ash <= max,
      `${crop} ash (${comp.ash}%) exceeds slider max (${max}%)`
    );
    assert.ok(comp.ash >= min, `${crop} ash (${comp.ash}%) is below slider min (${min}%)`);
  }
});
