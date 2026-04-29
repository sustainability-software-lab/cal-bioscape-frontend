import test from 'node:test';
import assert from 'node:assert/strict';

import { isCountyFeedstockPanelEnabled } from '../src/lib/feature-flags';

test('county feedstock panel is disabled for the production API', () => {
  assert.equal(isCountyFeedstockPanelEnabled('https://api.calbioscape.org'), false);
  assert.equal(isCountyFeedstockPanelEnabled('https://api.calbioscape.org/'), false);
});

test('county feedstock panel remains enabled outside production', () => {
  assert.equal(isCountyFeedstockPanelEnabled('https://api-staging.calbioscape.org'), true);
  assert.equal(isCountyFeedstockPanelEnabled('http://localhost:8000'), true);
  assert.equal(isCountyFeedstockPanelEnabled(undefined), true);
});
