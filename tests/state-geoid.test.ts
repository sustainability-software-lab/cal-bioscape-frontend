import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import { STATE_GEOID } from '../src/lib/resource-mapping';

const repoRoot = process.cwd();
const read = (p: string) => readFileSync(join(repoRoot, p), 'utf8');

test('STATE_GEOID is the California state geoid the analysis/availability data uses', () => {
  // The backend analysis (composition) and availability datasets are keyed only
  // by this geoid; querying "06" or a county FIPS returns no rows.
  assert.equal(STATE_GEOID, '06000');
});

test('analysis/availability call sites no longer hardcode the bare "06" geoid', () => {
  // Regression guard for the geoid bug: composition + availability lookups must
  // go through STATE_GEOID, not the empty "06" that silently returned no data.
  const si = read('src/components/SitingInventory.tsx');
  assert.match(si, /STATE_GEOID/, 'SitingInventory should use STATE_GEOID');
  assert.doesNotMatch(si, /:\s*'06'/, 'SitingInventory should not fall back to bare "06"');

  const filters = read('src/lib/composition-filters.ts');
  assert.match(filters, /geoid:\s*string\s*=\s*STATE_GEOID/, 'batchFetchCompositionData should default to STATE_GEOID');

  const page = read('src/app/page.tsx');
  assert.doesNotMatch(page, /batchFetchCompositionData\('06'\)/, 'page.tsx should not pin composition fetch to "06"');

  const map = read('src/components/Map.js');
  assert.match(map, /getAnalysisByResource\(popupResource, STATE_GEOID\)/, 'Map popup should query analysis at STATE_GEOID');
  assert.match(map, /getAvailability\(popupResource, STATE_GEOID\)/, 'Map popup should query availability at STATE_GEOID');
});
