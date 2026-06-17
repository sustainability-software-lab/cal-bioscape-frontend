/**
 * County-level feedstock statistics fetched from the USDA census/survey API.
 */

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
 * Fetch county-level USDA stats for all LandIQ-mapped resources.
 * Merges census and survey data so missing metrics can fall through per parameter.
 * Returns only crops that have at least one data point.
 */
export async function fetchCountyFeedstockStats(
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

  const results = await Promise.allSettled(
    Array.from(resourceToName.entries()).map(async ([resource, landiqName]) => {
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
    })
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

  for (const stat of stats) {
    const acresMetric = getCountyMetric(stat, 'acres');
    const productionMetric = getCountyMetric(stat, 'production');
    const acres = acresMetric?.value ?? 0;
    const production = productionMetric?.value ?? 0;

    totalCropAcreage += acres;
    totalCropProduction += production;

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

  return {
    totalCropAcreage,
    totalCropProduction,
    totalResidueTons,
    avgCelluloseContent,
    cropsCounted: stats.length,
  };
}

/**
 * Async orchestrator: fetches county feedstock stats then computes aggregates
 * using live residue factors and composition fallbacks.
 */
export async function getCountyAggregateStats(geoid: string): Promise<CountyAggregates | null> {
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
