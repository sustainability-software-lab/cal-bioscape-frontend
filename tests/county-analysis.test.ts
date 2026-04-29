import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CountyCropStat,
  getCountyMetric,
  getDisplaySources,
} from '../src/lib/county-analysis';

const tomatoStat: CountyCropStat = {
  landiqName: 'Tomatoes',
  resource: 'tomato pomace',
  source: 'mixed',
  parameters: [
    { parameter: 'area in production', value: 1, unit: 'operations', source: 'census' },
    { parameter: 'sales', value: 1, unit: 'operations', source: 'census' },
    { parameter: 'area harvested', value: 25956, unit: 'acres', source: 'census' },
    { parameter: 'area harvested', value: 75, unit: 'operations', source: 'census' },
    { parameter: 'area harvested', value: 13000, unit: 'acres', source: 'survey' },
    { parameter: 'production', value: 706300, unit: 'tons', source: 'survey' },
  ],
};

test('county production metric ignores operation counts and falls through to survey production', () => {
  const production = getCountyMetric(tomatoStat, 'production');

  assert.deepEqual(production, {
    parameter: 'production',
    value: 706300,
    unit: 'tons',
    source: 'survey',
  });
});

test('county acres metric uses harvested acres, not harvested operation counts', () => {
  const acres = getCountyMetric(tomatoStat, 'acres');

  assert.deepEqual(acres, {
    parameter: 'area harvested',
    value: 25956,
    unit: 'acres',
    source: 'census',
  });
});

test('display sources reflect only the selected visible metrics', () => {
  const acres = getCountyMetric(tomatoStat, 'acres');
  const production = getCountyMetric(tomatoStat, 'production');

  assert.deepEqual(getDisplaySources(acres, production), ['census', 'survey']);
});
