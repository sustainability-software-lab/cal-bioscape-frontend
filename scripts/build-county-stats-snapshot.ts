/**
 * Build the static county-stats snapshot shipped to the client.
 *
 * Why: the bio-siting backend has no DB indexes on the USDA tables, so a single
 * county popup fires ~32 requests with p90 ~16s latency — far too slow to warm
 * per session. The data is the static USDA 2022 Census, so we query every county
 * ONCE here (offline) and write a lookup table the client seeds on load, taking
 * the backend off the user's interaction path entirely.
 *
 * Run: `npm run build-county-snapshot`
 * Auth: reads .env.local / .env (CA_BIOSITE_API_KEY, or CA_BIOSITE_API_USER/
 *       PASSWORD) and NEXT_PUBLIC_API_BASE_URL (defaults to prod).
 * Output: public/data/county-stats-snapshot.json (commit it).
 *
 * Re-run whenever the underlying USDA data changes (at most annual).
 */
import * as dotenv from 'dotenv';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';

dotenv.config({ path: '.env.local' });
dotenv.config();

import { getServiceToken, isApiKeyAuth } from '../src/lib/service-token';
import { getAllCountyGeoids } from '../src/lib/county-lookup';
import {
  assembleCountyFeedstockStats,
  throttledSettled,
  type CountyCropStat,
  type CountyResourceFetcher,
} from '../src/lib/county-analysis';
import {
  validateCountySnapshot,
  serializeCountySnapshot,
  type CountySnapshot,
} from '../src/lib/county-snapshot-guard';
import type { DataItemResponse, CensusListResponse } from '../src/lib/api-types';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.calbioscape.org';
const OUT = resolve('public/data/county-stats-snapshot.json');

const COUNTY_CONCURRENCY = 4; // counties in flight
const RESOURCE_CONCURRENCY = 6; // per-resource fetches within a county

async function backendFetch(path: string): Promise<CensusListResponse | null> {
  const token = await getServiceToken();
  const headers: Record<string, string> = isApiKeyAuth()
    ? { 'X-API-Key': token }
    : { Authorization: `Bearer ${token}` };

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${BASE_URL}${path}`, { headers });
    if (res.ok) return (await res.json()) as CensusListResponse;
    if (res.status === 404) return null;
    if (res.status === 401 || res.status === 403) {
      throw new Error(`Backend auth failed (${res.status}) for ${path}`);
    }
    if (res.status === 503 && attempt < 2) {
      await new Promise(r => setTimeout(r, 600 * (attempt + 1)));
      continue;
    }
    return null;
  }
  return null;
}

const nodeFetcher: CountyResourceFetcher = async (resource, geoid) => {
  const enc = encodeURIComponent;
  const base = `/v1/feedstocks/usda`;
  const [census, survey] = await Promise.all([
    backendFetch(`${base}/census/resources/${enc(resource)}/geoid/${enc(geoid)}/parameters`),
    backendFetch(`${base}/survey/resources/${enc(resource)}/geoid/${enc(geoid)}/parameters`),
  ]);
  return {
    census: census?.data as DataItemResponse[] | undefined,
    survey: survey?.data as DataItemResponse[] | undefined,
  };
};

async function main() {
  const geoids = Object.values(getAllCountyGeoids());
  console.log(`Building county-stats snapshot for ${geoids.length} counties from ${BASE_URL} ...`);
  const start = Date.now();
  const snapshot: Record<string, CountyCropStat[]> = {};
  let done = 0;

  const tasks = geoids.map(geoid => async () => {
    const stats = await assembleCountyFeedstockStats(geoid, nodeFetcher, RESOURCE_CONCURRENCY);
    // Include every county — even those with no data ([]) — so clicking a
    // no-data county is also instant ("No USDA cropland reported") instead of
    // falling back to ~32 slow live queries that ultimately return nothing.
    snapshot[geoid] = stats;
    done++;
    console.log(`[${done}/${geoids.length}] ${geoid}: ${stats.length} crops`);
  });

  const results = await throttledSettled(tasks, COUNTY_CONCURRENCY);
  const failures = results.filter(r => r.status === 'rejected');
  if (failures.length > 0) {
    console.error(`\n${failures.length} county task(s) failed:`);
    failures.forEach(f => console.error('  -', (f as PromiseRejectedResult).reason?.message ?? f));
    process.exit(1);
  }

  // Refuse to overwrite a good snapshot with a degraded one. A backend that
  // returns empty/404 for every county does not throw above, so guard on the
  // shape: full county coverage, and not all-empty when the prior snapshot had
  // data (see county-snapshot-guard).
  const prev: CountySnapshot | null = existsSync(OUT)
    ? (JSON.parse(readFileSync(OUT, 'utf8')) as CountySnapshot)
    : null;
  const validation = validateCountySnapshot(snapshot, prev);
  if (!validation.ok) {
    console.error(`\nRefusing to write ${OUT}: ${validation.reason}`);
    process.exit(1);
  }

  mkdirSync(dirname(OUT), { recursive: true });
  // Sorted-key serialization so identical data always produces a byte-identical
  // file — the scheduled refresh job commits only on a real data change.
  writeFileSync(OUT, serializeCountySnapshot(snapshot));
  const withData = Object.values(snapshot).filter(s => s.length > 0).length;
  const kb = (JSON.stringify(snapshot).length / 1024).toFixed(1);
  const secs = ((Date.now() - start) / 1000).toFixed(0);
  console.log(
    `\nWrote ${OUT}\n  ${Object.keys(snapshot).length}/${geoids.length} counties (${withData} with crop data), ${kb} KB, ${secs}s`
  );
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
