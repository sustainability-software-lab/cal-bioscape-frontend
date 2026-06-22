/**
 * County-level feedstock statistics fetched from the USDA census/survey API.
 */

/**
 * Creates a keyed promise cache. Concurrent calls with the same key share one promise.
 * Rejected promises are evicted so the next call can retry.
 */
export function makePromiseCache<T>(
  factory: (key: string) => Promise<T>
): (key: string) => Promise<T> {
  const cache = new Map<string, Promise<T>>();
  return (key: string) => {
    const cached = cache.get(key);
    if (cached) return cached;
    const p = factory(key);
    cache.set(key, p);
    p.catch(() => cache.delete(key));
    return p;
  };
}

import { ApiAuthError, getCensusByResource, getSurveyByResource } from './api';
import { DataItemResponse } from './api-types';
import { LANDIQ_TO_API_RESOURCE } from './resource-mapping';
import { getResidueData } from './residue-data';
import { COMPOSITION_FALLBACKS } from './composition-fallbacks';

export type CountyDataSource = 'census' | 'survey';
export type CountyRowSource = CountyDataSource | 'mixed';

export interface CountyParameterStat {
  parameter: string;
  value: number;
  unit: string;
  source: CountyDataSource;
}

export interface CountyCropStat {
  landiqName: string;
  resource: string;
  /** USDA census/survey parameters found, e.g. "area harvested", "production" */
  parameters: CountyParameterStat[];
  source: CountyRowSource;
}

export interface CountyMetricValue {
  parameter: string;
  value: number;
  unit: string;
  source: CountyDataSource;
}

export interface SelectedCountyFeedstockStats {
  name: string;
  geoid: string;
  stats: CountyCropStat[];
}

export interface CountyPanelSelectionResponse {
  requestId: number;
  activeRequestId: number;
  countyName: string;
  geoid: string;
  stats: CountyCropStat[];
}

/** Key parameter labels to surface prominently in the UI */
export const PRIORITY_PARAMS = [
  'area harvested',
  'area planted',
  'production',
  'yield',
  'price received',
];

function normalizeLabel(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function isOperationsUnit(unit: string): boolean {
  return normalizeLabel(unit).startsWith('operation');
}

function sourceRank(source: CountyDataSource): number {
  return source === 'census' ? 0 : 1;
}

function toParameters(
  data: DataItemResponse[] | undefined,
  source: CountyDataSource
): CountyParameterStat[] {
  return (data ?? [])
    .filter((item): item is DataItemResponse & { value: number } => item.value != null)
    .map(item => ({
      parameter: item.parameter,
      value: item.value,
      unit: item.unit,
      source,
    }));
}

function deriveRowSource(parameters: CountyParameterStat[]): CountyRowSource {
  const sources = new Set(parameters.map(parameter => parameter.source));
  return sources.size > 1 ? 'mixed' : parameters[0]?.source ?? 'census';
}

function isPriorityParameter(parameter: string): boolean {
  const normalized = normalizeLabel(parameter);
  return PRIORITY_PARAMS.some(priority => normalized.includes(priority));
}

/**
 * Select the metric shown in the county panel.
 *
 * The backend can return operation-count parameters such as "area in production".
 * Those are valid USDA facts, but they are not production output and should not
 * be shown in the Production column.
 */
export function getCountyMetric(
  stat: CountyCropStat,
  metric: 'acres' | 'production'
): CountyMetricValue | null {
  const candidates = stat.parameters
    .map(parameter => {
      const label = normalizeLabel(parameter.parameter);
      const unit = normalizeLabel(parameter.unit);

      if (metric === 'acres') {
        if ((label === 'area harvested' || label === 'acres harvested') && unit === 'acres') {
          return { parameter, rank: 0 };
        }
        if ((label === 'area planted' || label === 'acres planted') && unit === 'acres') {
          return { parameter, rank: 1 };
        }
        return null;
      }

      if (isOperationsUnit(parameter.unit)) return null;
      if (label === 'production' || label.startsWith('production,')) {
        return { parameter, rank: 0 };
      }
      return null;
    })
    .filter((candidate): candidate is { parameter: CountyParameterStat; rank: number } =>
      candidate !== null
    )
    .sort((a, b) =>
      a.rank - b.rank ||
      sourceRank(a.parameter.source) - sourceRank(b.parameter.source)
    );

  const selected = candidates[0]?.parameter;
  return selected
    ? {
        parameter: selected.parameter,
        value: selected.value,
        unit: selected.unit,
        source: selected.source,
      }
    : null;
}

export function getCountyMetricOperations(stat: CountyCropStat): CountyMetricValue | null {
  const candidates = stat.parameters
    .map(p => {
      if (!isOperationsUnit(p.unit)) return null;
      const label = normalizeLabel(p.parameter);
      if (label === 'area harvested' || label === 'acres harvested') return { p, rank: 0 };
      if (label === 'area bearing & non-bearing' || label === 'area in production') return { p, rank: 1 };
      return { p, rank: 2 };
    })
    .filter((c): c is { p: CountyParameterStat; rank: number } => c !== null)
    .sort((a, b) => a.rank - b.rank || sourceRank(a.p.source) - sourceRank(b.p.source));
  const sel = candidates[0]?.p;
  return sel ? { parameter: sel.parameter, value: sel.value, unit: sel.unit, source: sel.source } : null;
}

export function getCountyMetricYield(stat: CountyCropStat): CountyMetricValue | null {
  const candidates = stat.parameters
    .filter(p => normalizeLabel(p.parameter) === 'yield' && !isOperationsUnit(p.unit))
    .sort((a, b) => sourceRank(a.source) - sourceRank(b.source));
  const sel = candidates[0];
  return sel ? { parameter: sel.parameter, value: sel.value, unit: sel.unit, source: sel.source } : null;
}

export function getCountyMetricAreaPlanted(stat: CountyCropStat): CountyMetricValue | null {
  const candidates = stat.parameters
    .filter(p => {
      const label = normalizeLabel(p.parameter);
      return (label === 'area planted' || label === 'acres planted') && normalizeLabel(p.unit) === 'acres';
    })
    .sort((a, b) => sourceRank(a.source) - sourceRank(b.source));
  const sel = candidates[0];
  return sel ? { parameter: sel.parameter, value: sel.value, unit: sel.unit, source: sel.source } : null;
}

export function getCountyMetricSales(stat: CountyCropStat): CountyMetricValue | null {
  const candidates = stat.parameters
    .filter(p => normalizeLabel(p.parameter) === 'sales' && !isOperationsUnit(p.unit))
    .sort((a, b) => sourceRank(a.source) - sourceRank(b.source));
  const sel = candidates[0];
  return sel ? { parameter: sel.parameter, value: sel.value, unit: sel.unit, source: sel.source } : null;
}

export function getCountyMetricBearing(stat: CountyCropStat, kind: 'bearing' | 'nonBearing'): CountyMetricValue | null {
  const targetLabel = kind === 'bearing' ? 'area bearing' : 'area non-bearing';
  const candidates = stat.parameters
    .filter(p => normalizeLabel(p.parameter) === targetLabel && normalizeLabel(p.unit) === 'acres')
    .sort((a, b) => sourceRank(a.source) - sourceRank(b.source));
  const sel = candidates[0];
  return sel ? { parameter: sel.parameter, value: sel.value, unit: sel.unit, source: sel.source } : null;
}

export function getDisplaySources(...metrics: Array<CountyMetricValue | null>): CountyDataSource[] {
  return Array.from(
    new Set(metrics.filter((metric): metric is CountyMetricValue => metric !== null).map(metric => metric.source))
  );
}

export function getCountyPanelSelectionForResponse({
  requestId,
  activeRequestId,
  countyName,
  geoid,
  stats,
}: CountyPanelSelectionResponse): SelectedCountyFeedstockStats | null {
  if (requestId !== activeRequestId || stats.length === 0) {
    return null;
  }

  return {
    name: countyName,
    geoid,
    stats,
  };
}

/**
 * Concurrency-limited equivalent of Promise.allSettled.
 *
 * Runs up to `concurrency` tasks simultaneously. Tasks beyond the limit are
 * deferred until a running slot frees up. Result order matches the input array.
 */
export async function throttledSettled<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  let nextIdx = 0;

  async function worker() {
    while (nextIdx < tasks.length) {
      const idx = nextIdx++;
      try {
        results[idx] = { status: 'fulfilled', value: await tasks[idx]() };
      } catch (reason) {
        results[idx] = { status: 'rejected', reason };
      }
    }
  }

  const pool = Array.from({ length: Math.min(concurrency, tasks.length) }, worker);
  await Promise.all(pool);
  return results;
}

const COUNTY_FETCH_CONCURRENCY = 5;

/**
 * Fetch county-level USDA stats for all LandIQ-mapped resources.
 * Merges census and survey data so missing metrics can fall through per parameter.
 * Returns only crops that have at least one data point.
 */
async function fetchCountyFeedstockStatsUncached(
  geoid: string
): Promise<CountyCropStat[]> {
  const authAwareFetch = { throwOnAuthError: true };

  // Deduplicate: same resource can map to multiple LandIQ names
  const resourceToName = new Map<string, string>();
  for (const [landiqName, resource] of Object.entries(LANDIQ_TO_API_RESOURCE)) {
    if (!resourceToName.has(resource)) {
      resourceToName.set(resource, landiqName);
    }
  }

  const entries = Array.from(resourceToName.entries());
  const results = await throttledSettled(
    entries.map(([resource, landiqName]) => async () => {
      const [censusResponse, surveyResponse] = await Promise.all([
        getCensusByResource(resource, geoid, authAwareFetch),
        getSurveyByResource(resource, geoid, authAwareFetch),
      ]);

      const parameters = [
        ...toParameters(censusResponse?.data, 'census'),
        ...toParameters(surveyResponse?.data, 'survey'),
      ];

      if (!parameters.some(parameter => isPriorityParameter(parameter.parameter))) return null;

      const stat = {
        landiqName,
        resource,
        parameters,
        source: deriveRowSource(parameters),
      } satisfies CountyCropStat;

      return getCountyMetric(stat, 'acres') || getCountyMetric(stat, 'production')
        ? stat
        : null;
    }),
    COUNTY_FETCH_CONCURRENCY
  );

  if (results.some(r => r.status === 'rejected' && r.reason instanceof ApiAuthError)) {
    throw new Error('County data API authentication failed. Check the production API credentials.');
  }

  return results
    .filter((r): r is PromiseFulfilledResult<CountyCropStat> =>
      r.status === 'fulfilled' && r.value !== null
    )
    .map(r => r.value);
}

/**
 * Fetch county-level USDA stats, cached for the session.
 *
 * Both consumers route through this single cache:
 *   - the map popup, via getCountyAggregateStats -> computeCountyAggregateStats
 *   - the county feedstock panel (page.tsx handleCountySelect)
 * so a county is fetched at most once per session and the two paths never
 * duplicate the request on a single click. Re-clicking a county is served from
 * memory with no network refetch. Rejected entries are evicted so a failed
 * county retries on the next click.
 *
 * Acceptable-staleness model: the first fetch captures the backend DB state at
 * that moment. The backend is not updated within a user session, so serving the
 * session-cached snapshot for repeat clicks is intentional, not stale data.
 */
export const fetchCountyFeedstockStats = makePromiseCache(fetchCountyFeedstockStatsUncached);

/**
 * Idempotent, throttled, error-swallowing cache warmer. Pure with respect to its
 * `fetch` argument so it can be unit-tested without the network. Each key is
 * fetched at most once (the caller passes a cached fetcher); a key whose fetch
 * rejects is swallowed here so one failure never aborts the sweep, and the
 * underlying promise cache evicts it for a later retry.
 */
export async function warmPromiseCache<T>(
  keys: string[],
  fetch: (key: string) => Promise<T>,
  concurrency: number
): Promise<void> {
  const tasks = keys.map(key => () => fetch(key).catch(() => undefined));
  await throttledSettled(tasks, concurrency);
}

// Outer concurrency for the page-load county sweep. Kept below
// COUNTY_FETCH_CONCURRENCY's effective fan-out because each county already
// throttles its own per-resource fetches internally.
const COUNTY_PREFETCH_CONCURRENCY = 3;
let countyPrefetchStarted = false;

/**
 * Warm the session cache for every clickable county so the first popup/panel
 * click is served from memory with no per-click round-trip.
 *
 * - Idempotent: only the first call does work (guarded by countyPrefetchStarted).
 * - Non-blocking: fire-and-forget; callers kick this off on idle after first paint.
 * - Deduped: routes through the same fetchCountyFeedstockStats cache as on-demand
 *   clicks, so an in-flight prefetch and a user click never double-fetch a county.
 * - Throttled: COUNTY_PREFETCH_CONCURRENCY caps the sweep; each county's own
 *   fetch is itself throttled at COUNTY_FETCH_CONCURRENCY.
 *
 * Cost ceiling: each county issues ~2 requests per mapped resource (census +
 * survey). Today only a few counties return data (backend ETL limit), so the
 * sweep is cheap. When all 58 counties have data this is ~2 x N_resources x 58
 * requests; the throttle keeps that from flooding the proxy. The durable fix is
 * a backend batch / all-counties endpoint plus DB indexing on the bio-siting
 * tables (tracked in the ca-biositing backend repo, out of scope here).
 */
export function prefetchAllCountyStats(geoids: string[]): void {
  if (countyPrefetchStarted) return;
  countyPrefetchStarted = true;
  void warmPromiseCache(geoids, fetchCountyFeedstockStats, COUNTY_PREFETCH_CONCURRENCY);
}

// ---------------------------------------------------------------------------
// County aggregate computation (WS2)
// ---------------------------------------------------------------------------

export interface CountyAggregates {
  totalCropAcreage: number;
  totalCropProduction: number;
  totalResidueTons: number;
  /** Residue-tonnage-weighted average cellulose (%). NaN if no cellulose data available. */
  avgCelluloseContent: number;
  cropsCounted: number;
  /** Top crops sorted by acreage descending (up to 3). */
  topCropsByAcreage: Array<{ landiqName: string; acres: number }>;
  /**
   * Full per-crop breakdown of the constituents contributing to Total Crop
   * Production, sorted by production descending. Only crops with production > 0
   * are included. Not capped, so the popup can render the complete list.
   */
  cropProductionBreakdown: Array<{ landiqName: string; production: number; acres: number }>;
  /** Sum of per-crop sales values where reported. null if no crop reported sales. */
  totalCropSales: number | null;
}

/**
 * Pure function: aggregates per-crop county stats into four headline metrics.
 *
 * @param stats - Per-crop USDA census/survey data from fetchCountyFeedstockStats.
 * @param residueLookup - Map of landiqName -> dryTonsPerAcre. Missing keys contribute 0 residue tons.
 * @param compositionLookup - Map of landiqName -> cellulose %. Missing keys are excluded from the average.
 */
export function computeCountyAggregates(
  stats: CountyCropStat[],
  residueLookup: Record<string, number>,
  compositionLookup: Record<string, number>
): CountyAggregates {
  let totalCropAcreage = 0;
  let totalCropProduction = 0;
  let totalResidueTons = 0;
  let weightedCelluloseSum = 0;
  let celluloseWeightTotal = 0;
  const topCropsArr: Array<{ landiqName: string; acres: number }> = [];
  const productionBreakdown: Array<{ landiqName: string; production: number; acres: number }> = [];
  let salesSum = 0;
  let hasSalesData = false;

  for (const stat of stats) {
    const acresMetric = getCountyMetric(stat, 'acres');
    const productionMetric = getCountyMetric(stat, 'production');
    const acres = acresMetric?.value ?? 0;
    const production = productionMetric?.value ?? 0;

    totalCropAcreage += acres;
    totalCropProduction += production;

    if (acres > 0) {
      topCropsArr.push({ landiqName: stat.landiqName, acres });
    }

    if (production > 0) {
      productionBreakdown.push({ landiqName: stat.landiqName, production, acres });
    }

    const salesMetric = getCountyMetricSales(stat);
    if (salesMetric != null) {
      salesSum += salesMetric.value;
      hasSalesData = true;
    }

    const dryTonsPerAcre = residueLookup[stat.landiqName] ?? 0;
    const residueTons = acres * dryTonsPerAcre;
    totalResidueTons += residueTons;

    const cellulose = compositionLookup[stat.landiqName];
    if (cellulose != null && residueTons > 0) {
      weightedCelluloseSum += residueTons * cellulose;
      celluloseWeightTotal += residueTons;
    }
  }

  const avgCelluloseContent = celluloseWeightTotal > 0
    ? weightedCelluloseSum / celluloseWeightTotal
    : NaN;

  topCropsArr.sort((a, b) => b.acres - a.acres);
  productionBreakdown.sort((a, b) => b.production - a.production);

  return {
    totalCropAcreage,
    totalCropProduction,
    totalResidueTons,
    avgCelluloseContent,
    cropsCounted: stats.length,
    topCropsByAcreage: topCropsArr.slice(0, 3),
    cropProductionBreakdown: productionBreakdown,
    totalCropSales: hasSalesData ? salesSum : null,
  };
}

async function computeCountyAggregateStats(geoid: string): Promise<CountyAggregates | null> {
  const stats = await fetchCountyFeedstockStats(geoid);
  if (stats.length === 0) return null;

  // Build residue lookup from loaded residue data
  const residueLookup: Record<string, number> = {};
  for (const stat of stats) {
    const factors = getResidueData(stat.landiqName);
    if (factors && factors.length > 0) {
      const maxDryTons = Math.max(...factors.map(f => f.dryTonsPerAcre));
      residueLookup[stat.landiqName] = maxDryTons;
    }
  }

  // Build cellulose lookup from composition fallbacks
  const compositionLookup: Record<string, number> = {};
  for (const stat of stats) {
    const fallback = COMPOSITION_FALLBACKS[stat.landiqName];
    if (fallback?.cellulose != null) {
      compositionLookup[stat.landiqName] = fallback.cellulose;
    }
  }

  return computeCountyAggregates(stats, residueLookup, compositionLookup);
}

// Session-scoped in-memory cache: USDA data is static, so a second click on any
// county is instant. Rejected entries are evicted so retries are possible.
export const getCountyAggregateStats = makePromiseCache(computeCountyAggregateStats);
