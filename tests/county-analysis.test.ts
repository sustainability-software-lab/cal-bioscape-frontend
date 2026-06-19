import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CountyCropStat,
  getCountyPanelSelectionForResponse,
  getCountyMetric,
  getCountyMetricOperations,
  getCountyMetricYield,
  getCountyMetricAreaPlanted,
  getCountyMetricSales,
  getCountyMetricBearing,
  getDisplaySources,
  computeCountyAggregates,
  throttledSettled,
} from '../src/lib/county-analysis';

// ---------------------------------------------------------------------------
// throttledSettled — concurrency-limiting Promise.allSettled wrapper
// ---------------------------------------------------------------------------

test('throttledSettled returns all settled results', async () => {
  const tasks = [1, 2, 3, 4, 5].map(n => () => Promise.resolve(n));
  const results = await throttledSettled(tasks, 2);
  assert.equal(results.length, 5);
  const values = results.map(r => (r as PromiseFulfilledResult<number>).value);
  assert.deepEqual(values, [1, 2, 3, 4, 5]);
});

test('throttledSettled preserves result order regardless of task completion timing', async () => {
  const order: number[] = [];
  const tasks = [30, 10, 20].map((delay, idx) => () =>
    new Promise<number>(resolve => setTimeout(() => {
      order.push(idx);
      resolve(delay);
    }, delay))
  );
  const results = await throttledSettled(tasks, 3);
  const values = results.map(r => (r as PromiseFulfilledResult<number>).value);
  // results should be in task-submission order, not completion order
  assert.deepEqual(values, [30, 10, 20]);
});

test('throttledSettled limits max concurrent tasks to the concurrency cap', async () => {
  let running = 0;
  let maxObserved = 0;
  const tasks = Array.from({ length: 10 }, () => () =>
    new Promise<void>(resolve => {
      running++;
      if (running > maxObserved) maxObserved = running;
      setTimeout(() => { running--; resolve(); }, 10);
    })
  );
  await throttledSettled(tasks, 3);
  assert.ok(
    maxObserved <= 3,
    `Expected max concurrency ≤ 3, got ${maxObserved}`
  );
});

test('throttledSettled handles rejected tasks without short-circuiting remaining tasks', async () => {
  let ran = 0;
  const tasks = [
    () => Promise.reject(new Error('fail')),
    () => { ran++; return Promise.resolve(42); },
    () => { ran++; return Promise.resolve(99); },
  ];
  const results = await throttledSettled(tasks, 2);
  assert.equal(results.length, 3);
  assert.equal(results[0].status, 'rejected');
  assert.equal(results[1].status, 'fulfilled');
  assert.equal(results[2].status, 'fulfilled');
  assert.equal(ran, 2);
});

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

// ---------------------------------------------------------------------------
// New extractors: getCountyMetricOperations / Yield / AreaPlanted / Sales / Bearing
// ---------------------------------------------------------------------------

const almondStat: CountyCropStat = {
  landiqName: 'Almonds',
  resource: 'almond shells',
  source: 'mixed',
  parameters: [
    { parameter: 'area harvested', value: 300, unit: 'operations', source: 'census' },
    { parameter: 'area harvested', value: 1200000, unit: 'acres', source: 'census' },
    { parameter: 'area bearing', value: 1100000, unit: 'acres', source: 'census' },
    { parameter: 'area non-bearing', value: 100000, unit: 'acres', source: 'census' },
    { parameter: 'area bearing & non-bearing', value: 400, unit: 'operations', source: 'census' },
    { parameter: 'production', value: 2800000, unit: 'tons', source: 'census' },
    { parameter: 'sales', value: 5000000, unit: '$', source: 'census' },
    { parameter: 'sales', value: 2, unit: 'operations', source: 'census' },
  ],
};

const cottonStat: CountyCropStat = {
  landiqName: 'Cotton',
  resource: 'cotton gin trash',
  source: 'survey',
  parameters: [
    { parameter: 'area harvested', value: 50000, unit: 'acres', source: 'survey' },
    { parameter: 'area planted', value: 55000, unit: 'acres', source: 'survey' },
    { parameter: 'yield', value: 1601, unit: 'lb / acre', source: 'survey' },
    { parameter: 'production', value: 80000, unit: '480 lb bales', source: 'survey' },
  ],
};

const noSalesStat: CountyCropStat = {
  landiqName: 'Barley',
  resource: 'barley straw',
  source: 'census',
  parameters: [
    { parameter: 'area harvested', value: 8000, unit: 'acres', source: 'census' },
    { parameter: 'production', value: 12000, unit: 'tons', source: 'census' },
    { parameter: 'sales', value: 5, unit: 'operations', source: 'census' },
  ],
};

test('getCountyMetricOperations prefers area-harvested operations over bearing operations', () => {
  const ops = getCountyMetricOperations(almondStat);
  assert.ok(ops !== null);
  assert.equal(ops!.parameter, 'area harvested');
  assert.equal(ops!.value, 300);
  assert.ok(ops!.unit.toLowerCase().startsWith('operation'));
});

test('getCountyMetricOperations falls back to area bearing & non-bearing when no area-harvested ops', () => {
  const stat: CountyCropStat = {
    ...almondStat,
    parameters: almondStat.parameters.filter(p =>
      !(p.parameter === 'area harvested' && p.unit === 'operations')
    ),
  };
  const ops = getCountyMetricOperations(stat);
  assert.ok(ops !== null);
  assert.equal(ops!.parameter, 'area bearing & non-bearing');
});

test('getCountyMetricOperations returns null when no operations-unit parameters exist', () => {
  assert.equal(getCountyMetricOperations(cottonStat), null);
});

test('getCountyMetricYield returns survey yield with correct unit', () => {
  const yld = getCountyMetricYield(cottonStat);
  assert.ok(yld !== null);
  assert.equal(yld!.value, 1601);
  assert.equal(yld!.unit, 'lb / acre');
});

test('getCountyMetricYield returns null when no yield parameter exists', () => {
  assert.equal(getCountyMetricYield(almondStat), null);
});

test('getCountyMetricAreaPlanted returns acres-unit area planted', () => {
  const ap = getCountyMetricAreaPlanted(cottonStat);
  assert.ok(ap !== null);
  assert.equal(ap!.value, 55000);
  assert.equal(ap!.unit, 'acres');
});

test('getCountyMetricAreaPlanted returns null when only area harvested exists', () => {
  assert.equal(getCountyMetricAreaPlanted(almondStat), null);
});

test('getCountyMetricSales ignores operations-unit sales and returns dollar-unit sales', () => {
  const sales = getCountyMetricSales(almondStat);
  assert.ok(sales !== null);
  assert.equal(sales!.value, 5000000);
  assert.equal(sales!.unit, '$');
});

test('getCountyMetricSales returns null when only operations-unit sales exist', () => {
  assert.equal(getCountyMetricSales(noSalesStat), null);
});

test('getCountyMetricBearing returns bearing acres', () => {
  const b = getCountyMetricBearing(almondStat, 'bearing');
  assert.ok(b !== null);
  assert.equal(b!.value, 1100000);
  assert.equal(b!.unit, 'acres');
});

test('getCountyMetricBearing returns non-bearing acres', () => {
  const nb = getCountyMetricBearing(almondStat, 'nonBearing');
  assert.ok(nb !== null);
  assert.equal(nb!.value, 100000);
});

test('getCountyMetricBearing returns null when crop has no orchard data', () => {
  assert.equal(getCountyMetricBearing(cottonStat, 'bearing'), null);
  assert.equal(getCountyMetricBearing(cottonStat, 'nonBearing'), null);
});

// ---------------------------------------------------------------------------
// computeCountyAggregates — topCropsByAcreage and totalCropSales
// ---------------------------------------------------------------------------

test('computeCountyAggregates computes topCropsByAcreage sorted desc and capped at 3', () => {
  const stats: CountyCropStat[] = [
    { ...cornStat, landiqName: 'Corn' },   // 10000 ac
    { ...wheatStat, landiqName: 'Wheat' }, // 5000 ac
    {
      landiqName: 'Rice',
      resource: 'rice straw',
      source: 'census',
      parameters: [{ parameter: 'area harvested', value: 20000, unit: 'acres', source: 'census' }],
    },
    {
      landiqName: 'Barley',
      resource: 'barley straw',
      source: 'census',
      parameters: [{ parameter: 'area harvested', value: 3000, unit: 'acres', source: 'census' }],
    },
  ];
  const result = computeCountyAggregates(stats, {}, {});
  assert.equal(result.topCropsByAcreage.length, 3);
  assert.equal(result.topCropsByAcreage[0].landiqName, 'Rice');
  assert.equal(result.topCropsByAcreage[0].acres, 20000);
  assert.equal(result.topCropsByAcreage[1].landiqName, 'Corn');
  assert.equal(result.topCropsByAcreage[2].landiqName, 'Wheat');
});

// ---------------------------------------------------------------------------
// computeCountyAggregates — cropProductionBreakdown (issue #97)
// ---------------------------------------------------------------------------

test('computeCountyAggregates returns full per-crop production breakdown sorted by production desc (not capped)', () => {
  const stats: CountyCropStat[] = [
    { ...cornStat, landiqName: 'Corn' },   // production 50000
    { ...wheatStat, landiqName: 'Wheat' }, // production 20000
    {
      landiqName: 'Rice',
      resource: 'rice straw',
      source: 'census',
      parameters: [
        { parameter: 'area harvested', value: 9000, unit: 'acres', source: 'census' },
        { parameter: 'production', value: 90000, unit: 'tons', source: 'census' },
      ],
    },
    {
      landiqName: 'Barley',
      resource: 'barley straw',
      source: 'census',
      parameters: [
        { parameter: 'area harvested', value: 3000, unit: 'acres', source: 'census' },
        { parameter: 'production', value: 5000, unit: 'tons', source: 'census' },
      ],
    },
  ];
  const result = computeCountyAggregates(stats, {}, {});
  // Full list of all 4 production-bearing crops (not sliced to 3)
  assert.equal(result.cropProductionBreakdown.length, 4);
  assert.deepEqual(
    result.cropProductionBreakdown.map(c => c.landiqName),
    ['Rice', 'Corn', 'Wheat', 'Barley']
  );
  assert.equal(result.cropProductionBreakdown[0].production, 90000);
  assert.equal(result.cropProductionBreakdown[0].acres, 9000);
  // breakdown productions sum to totalCropProduction
  const sum = result.cropProductionBreakdown.reduce((acc, c) => acc + c.production, 0);
  assert.equal(sum, result.totalCropProduction);
});

test('computeCountyAggregates cropProductionBreakdown excludes crops with zero production', () => {
  const acresOnly: CountyCropStat = {
    landiqName: 'Pasture',
    resource: 'pasture',
    source: 'census',
    parameters: [{ parameter: 'area harvested', value: 4000, unit: 'acres', source: 'census' }],
  };
  const result = computeCountyAggregates([cornStat, acresOnly], {}, {});
  assert.equal(result.cropProductionBreakdown.length, 1);
  assert.equal(result.cropProductionBreakdown[0].landiqName, 'Corn');
});

test('computeCountyAggregates sums sales when present and returns null when none', () => {
  const withSales: CountyCropStat = {
    landiqName: 'Almonds',
    resource: 'almond shells',
    source: 'census',
    parameters: [
      { parameter: 'area harvested', value: 5000, unit: 'acres', source: 'census' },
      { parameter: 'sales', value: 1000000, unit: '$', source: 'census' },
    ],
  };
  const resultWithSales = computeCountyAggregates([withSales, cornStat], {}, {});
  assert.equal(resultWithSales.totalCropSales, 1000000);

  const resultNoSales = computeCountyAggregates([cornStat, wheatStat], {}, {});
  assert.equal(resultNoSales.totalCropSales, null);
});
