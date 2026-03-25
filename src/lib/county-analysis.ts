/**
 * County-level feedstock statistics fetched from the USDA census/survey API.
 */

import { getCensusByResource, getSurveyByResource } from './api';
import { CensusDataResponse } from './api-types';
import { LANDIQ_TO_API_RESOURCE } from './resource-mapping';

export interface CountyCropStat {
  landiqName: string;
  resource: string;
  /** USDA census parameters found, e.g. "ACRES HARVESTED", "PRODUCTION, MEASURED IN TONS" */
  parameters: Array<{ parameter: string; value: number; unit: string }>;
  source: 'census' | 'survey';
}

/** Key parameter labels to surface prominently in the UI */
export const PRIORITY_PARAMS = [
  'ACRES HARVESTED',
  'ACRES PLANTED',
  'PRODUCTION',
  'YIELD',
  'PRICE RECEIVED',
];

/**
 * Fetch county-level USDA stats for all LandIQ-mapped resources.
 * Falls back to survey data when census returns null.
 * Returns only crops that have at least one data point.
 */
export async function fetchCountyFeedstockStats(
  geoid: string
): Promise<CountyCropStat[]> {
  // Deduplicate: same resource can map to multiple LandIQ names
  const resourceToName = new Map<string, string>();
  for (const [landiqName, resource] of Object.entries(LANDIQ_TO_API_RESOURCE)) {
    if (!resourceToName.has(resource)) {
      resourceToName.set(resource, landiqName);
    }
  }

  const results = await Promise.allSettled(
    Array.from(resourceToName.entries()).map(async ([resource, landiqName]) => {
      let data: CensusDataResponse[] | null = await getCensusByResource(resource, geoid);
      let source: 'census' | 'survey' = 'census';

      if (!data || data.length === 0) {
        data = await getSurveyByResource(resource, geoid);
        source = 'survey';
      }

      if (!data || data.length === 0) return null;

      const parameters = data.map(d => ({
        parameter: d.parameter,
        value: d.value,
        unit: d.unit,
      }));

      return { landiqName, resource, parameters, source } satisfies CountyCropStat;
    })
  );

  return results
    .filter((r): r is PromiseFulfilledResult<CountyCropStat> =>
      r.status === 'fulfilled' && r.value !== null
    )
    .map(r => r.value);
}
