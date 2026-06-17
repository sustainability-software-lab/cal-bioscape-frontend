import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CountyCropStat,
  getCountyPanelSelectionForResponse,
  getCountyMetric,
  getDisplaySources,
  computeCountyAggregates,
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

test('latest county response with data selects a panel', () => {
  assert.deepEqual(
    getCountyPanelSelectionForResponse({
      requestId: 2,
      activeRequestId: 2,
      countyName: 'San Joaquin',
      geoid: '06077',
      stats: [tomatoStat],
    }),
    {
      name: 'San Joaquin',
      geoid: '06077',
      stats: [tomatoStat],
    }
  );
});

test('empty county response keeps the panel hidden', () => {
  assert.equal(
    getCountyPanelSelectionForResponse({
      requestId: 2,
      activeRequestId: 2,
      countyName: 'Stanislaus',
      geoid: '06099',
      stats: [],
    }),
    null
  );
});

test('stale county response cannot select a panel', () => {
  assert.equal(
    getCountyPanelSelectionForResponse({
      requestId: 1,
      activeRequestId: 2,
      countyName: 'San Joaquin',
      geoid: '06077',
      stats: [tomatoStat],
    }),
    null
  );
});

test('county response cannot reopen a panel after close increments request id', () => {
  assert.equal(
    getCountyPanelSelectionForResponse({
      requestId: 3,
      activeRequestId: 4,
      countyName: 'San Joaquin',
      geoid: '06077',
      stats: [tomatoStat],
    }),
    null
  );
});

// WS2: computeCountyAggregates tests
const cornStat: CountyCropStat = {
  landiqName: 'Corn',
  resource: 'corn stover',
  source: 'census',
  parameters: [
    { parameter: 'area harvested', value: 10000, unit: 'acres', source: 'census' },
    { parameter: 'production', value: 50000, unit: 'tons', source: 'census' },
  ],
};

const wheatStat: CountyCropStat = {
  landiqName: 'Wheat',
  resource: 'wheat straw',
  source: 'census',
  parameters: [
    { parameter: 'area harvested', value: 5000, unit: 'acres', source: 'census' },
    { parameter: 'production', value: 20000, unit: 'tons', source: 'census' },
  ],
};

const stubResidueFactors: Record<string, number> = {
  'Corn': 1.5,
  'Wheat': 2.0,
};
const stubCellulose: Record<string, number> = {
  'Corn': 40,
  'Wheat': 35,
};

test('computeCountyAggregates sums acreage/production and residue-weights cellulose', () => {
  const result = computeCountyAggregates(
    [cornStat, wheatStat],
    stubResidueFactors,
    stubCellulose
  );
  // total acreage: 10000 + 5000 = 15000
  assert.equal(result.totalCropAcreage, 15000);
  // total production: 50000 + 20000 = 70000
  assert.equal(result.totalCropProduction, 70000);
  // residue tons: corn 10000*1.5=15000, wheat 5000*2.0=10000, total 25000
  assert.equal(result.totalResidueTons, 25000);
  // weighted avg cellulose: (15000*40 + 10000*35) / 25000 = (600000+350000)/25000 = 38
  assert.equal(result.avgCelluloseContent, 38);
  assert.equal(result.cropsCounted, 2);
});

test('computeCountyAggregates excludes crops missing cellulose from the average only', () => {
  const result = computeCountyAggregates(
    [cornStat, wheatStat],
    stubResidueFactors,
    { 'Corn': 40 } // Wheat has no cellulose value
  );
  // residue tons still counted for wheat (10000) even with no cellulose
  assert.equal(result.totalResidueTons, 25000);
  // avg cellulose uses only corn (only crop with cellulose data)
  // corn residue tons = 15000, cellulose = 40 -> avg = 40
  assert.equal(result.avgCelluloseContent, 40);
});

test('computeCountyAggregates handles crops with missing residue factors (contributes 0, not NaN)', () => {
  const result = computeCountyAggregates(
    [cornStat, wheatStat],
    { 'Corn': 1.5 }, // Wheat has no residue factor
    stubCellulose
  );
  // wheat residue tons = 0, not NaN
  assert.equal(result.totalResidueTons, 15000);
  assert.ok(!isNaN(result.avgCelluloseContent), 'avgCelluloseContent must not be NaN');
});
