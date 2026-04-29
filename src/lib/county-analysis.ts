/**
 * County-level feedstock statistics fetched from the USDA census/survey API.
 */

import { ApiAuthError, getCensusByResource, getSurveyByResource } from './api';
import { DataItemResponse } from './api-types';
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
      let response: { data: DataItemResponse[] } | null = await getCensusByResource(resource, geoid, authAwareFetch);
      let data: DataItemResponse[] = response?.data ?? [];
      let source: 'census' | 'survey' = 'census';

      if (data.length === 0) {
        response = await getSurveyByResource(resource, geoid, authAwareFetch);
        data = response?.data ?? [];
        source = 'survey';
      }

      if (data.length === 0) return null;

      const parameters = data
        .filter(d => d.value != null)
        .map(d => ({
          parameter: d.parameter,
          value: d.value!,
          unit: d.unit,
        }));

      if (parameters.length === 0) return null;

      return { landiqName, resource, parameters, source } satisfies CountyCropStat;
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
