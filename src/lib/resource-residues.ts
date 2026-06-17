/**
 * Per-polygon residue resolution.
 *
 * LandIQ 2024 cropland polygons may carry a pipe-delimited `resources` string
 * (e.g. "almond hulls|almond shells|almond branches") naming the exact residue
 * feedstocks for that field. When present, these names resolve residue yields
 * directly from the resource catalog (resource_info.json), bypassing the
 * crop-name -> resource guess in `getApiResource`. This is the primary tier of
 * the residue lookup; callers fall back to `getCropResidueFactors(cropName)`
 * when this returns null.
 *
 * Tonnage is derived client-side as `acres * tonsPerAcre` by the consumer, the
 * same way `getCropResidueFactors` results are used. There is no backend tonnage
 * endpoint, and polygons carry no geoid.
 */

import { ResidueFactors, getResidueDataByResourceName } from './residue-data';
import type { ResidueFactorsResult } from './constants';

/**
 * Parse a feature's pipe-delimited `resources` property into a list of resource
 * names. Returns [] when the property is missing, null, or empty. Segments are
 * trimmed and empty segments dropped.
 */
export function parseFeatureResources(
  props: Record<string, unknown> | null | undefined
): string[] {
  const raw = props?.resources;
  if (typeof raw !== 'string') return [];
  return raw
    .split('|')
    .map(name => name.trim())
    .filter(name => name.length > 0);
}

/**
 * Resolve a list of API resource names to residue factors from the catalog.
 *
 * Returns a `ResidueFactorsResult` (same shape as `getCropResidueFactors`) with
 * one factor per resolvable, non-zero-yield resource, or null when the input is
 * empty or nothing resolves -- in which case the caller falls back to the
 * crop-name-based chain.
 *
 * The `resolve` parameter is a test seam; in production it defaults to the
 * catalog accessor.
 */
export function getResidueFactorsByResourceNames(
  resourceNames: string[],
  resolve: (name: string) => ResidueFactors | null = getResidueDataByResourceName
): ResidueFactorsResult | null {
  if (!resourceNames || resourceNames.length === 0) return null;

  const factors: ResidueFactors[] = [];
  for (const name of resourceNames) {
    const factor = resolve(name);
    if (!factor) continue;
    if (!factor.dryTonsPerAcre && !factor.wetTonsPerAcre) continue;
    factors.push({
      ...factor,
      category: factor.category || 'Crop Residue',
      residueType: factor.residueType || 'Residue',
    });
  }

  if (factors.length === 0) return null;
  return { source: 'api', factors };
}
