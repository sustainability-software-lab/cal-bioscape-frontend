import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CountyCropStat,
  getCountyPanelSelectionForResponse,
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
