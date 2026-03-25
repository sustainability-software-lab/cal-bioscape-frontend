/**
 * Composition-based filtering utilities for the Cal BioScape map.
 *
 * Fetches biomass composition data (cellulose, lignin, ash, HHV) from the
 * analysis API for each mapped LandIQ crop and exposes filter helpers used
 * by LayerControls to dynamically show/hide map features.
 */

import { getAnalysisByResource } from './api';
import { AnalysisListResponse, DataItemResponse } from './api-types';
import { LANDIQ_TO_API_RESOURCE } from './resource-mapping';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CompositionData {
  // Biochemical composition (%)
  cellulose?: number;
  hemicellulose?: number;
  lignin?: number;
  extractives?: number;
  // Proximate analysis (%)
  moisture?: number;
  ash?: number;
  volatileMatter?: number;
  fixedCarbon?: number;
  // Ultimate analysis (%)
  carbon?: number;
  hydrogen?: number;
  oxygen?: number;
  nitrogen?: number;
  sulfur?: number;
  // Energy (MJ/kg, dry basis)
  hhv?: number;
  lhv?: number;
  hasData: boolean;
}

export type CompositionLookup = Record<string, CompositionData>;

/**
 * Each filter is a [min, max] inclusive range.
 * When at the default full-range bounds, the filter has no effect.
 */
export interface CompositionFilters {
  cellulose: [number, number];
  lignin: [number, number];
  ash: [number, number];
  hhv: [number, number];
}

/** Full-range bounds for each metric — at these values, no crops are hidden. */
export const COMPOSITION_FILTER_BOUNDS: CompositionFilters = {
  cellulose: [0, 60],
  lignin: [0, 40],
  ash: [0, 30],
  hhv: [8, 22],
};

export const DEFAULT_COMPOSITION_FILTERS: CompositionFilters = {
  cellulose: [0, 60],
  lignin: [0, 40],
  ash: [0, 30],
  hhv: [8, 22],
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Case-insensitive search through analysis data for any of the given names. */
function findParam(data: DataItemResponse[], ...names: string[]): number | undefined {
  for (const name of names) {
    const item = data.find(d => d.parameter.toLowerCase() === name.toLowerCase());
    if (item !== undefined) return item.value;
  }
  return undefined;
}

export function parseCompositionData(response: AnalysisListResponse | null): CompositionData {
  if (!response?.data?.length) return { hasData: false };
  const data = response.data;
  return {
    hasData: true,
    // Biochemical
    cellulose:     findParam(data, 'cellulose', 'cellulose_content', 'Cellulose'),
    hemicellulose: findParam(data, 'hemicellulose', 'hemicellulose_content', 'Hemicellulose'),
    lignin:        findParam(data, 'lignin', 'lignin_content', 'Lignin'),
    extractives:   findParam(data, 'extractives', 'extractive_content', 'Extractives'),
    // Proximate
    moisture:      findParam(data, 'moisture', 'moisture_content', 'Moisture'),
    ash:           findParam(data, 'ash', 'ash_content', 'Ash'),
    volatileMatter:findParam(data, 'volatile_matter', 'volatile matter', 'Volatile Matter', 'VM'),
    fixedCarbon:   findParam(data, 'fixed_carbon', 'fixed carbon', 'Fixed Carbon', 'FC'),
    // Ultimate
    carbon:        findParam(data, 'carbon', 'carbon_content', 'Carbon', 'C'),
    hydrogen:      findParam(data, 'hydrogen', 'hydrogen_content', 'Hydrogen', 'H'),
    oxygen:        findParam(data, 'oxygen', 'oxygen_content', 'Oxygen', 'O'),
    nitrogen:      findParam(data, 'nitrogen', 'nitrogen_content', 'Nitrogen', 'N'),
    sulfur:        findParam(data, 'sulfur', 'sulfur_content', 'Sulfur', 'S'),
    // Energy
    hhv:           findParam(data, 'hhv', 'HHV', 'higher_heating_value', 'Higher Heating Value', 'higher heating value', 'heating value'),
    lhv:           findParam(data, 'lhv', 'LHV', 'lower_heating_value', 'Lower Heating Value'),
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Batch-fetch composition analysis data for all LandIQ-mapped resources.
 * Each unique API resource is fetched once; duplicate LandIQ names that
 * share a resource (e.g. "Rice" and "Wild Rice" → "rice_straw") receive the
 * same composition data. Crops with no API data silently get `hasData: false`.
 */
export async function batchFetchCompositionData(
  geoid: string = '06'
): Promise<CompositionLookup> {
  const lookup: CompositionLookup = {};

  // Deduplicate: build resource → landiq names map
  const resourceToNames = new Map<string, string[]>();
  for (const [landiqName, resource] of Object.entries(LANDIQ_TO_API_RESOURCE)) {
    const existing = resourceToNames.get(resource) ?? [];
    resourceToNames.set(resource, [...existing, landiqName]);
  }

  const results = await Promise.allSettled(
    Array.from(resourceToNames.entries()).map(async ([resource, landiqNames]) => ({
      landiqNames,
      data: await getAnalysisByResource(resource, geoid),
    }))
  );

  for (const result of results) {
    if (result.status === 'fulfilled') {
      const { landiqNames, data } = result.value;
      const compData = parseCompositionData(data);
      for (const name of landiqNames) {
        lookup[name] = compData;
      }
    }
  }

  return lookup;
}

/**
 * Returns true if the crop should be visible given the current composition
 * filters. Crops with no composition data always pass (never silently hidden).
 */
export function cropPassesCompositionFilters(
  landiqCropName: string,
  lookup: CompositionLookup,
  filters: CompositionFilters
): boolean {
  const comp = lookup[landiqCropName];
  if (!comp?.hasData) return true;

  const [celMin, celMax] = filters.cellulose;
  const [ligMin, ligMax] = filters.lignin;
  const [ashMin, ashMax] = filters.ash;
  const [hhvMin, hhvMax] = filters.hhv;

  if (comp.cellulose !== undefined && (comp.cellulose < celMin || comp.cellulose > celMax)) return false;
  if (comp.lignin !== undefined && (comp.lignin < ligMin || comp.lignin > ligMax)) return false;
  if (comp.ash !== undefined && (comp.ash < ashMin || comp.ash > ashMax)) return false;
  if (comp.hhv !== undefined && (comp.hhv < hhvMin || comp.hhv > hhvMax)) return false;

  return true;
}

/** Returns true if any filter is narrower than its full-range default. */
export function isCompositionFiltersActive(filters: CompositionFilters): boolean {
  const b = COMPOSITION_FILTER_BOUNDS;
  return (
    filters.cellulose[0] !== b.cellulose[0] || filters.cellulose[1] !== b.cellulose[1] ||
    filters.lignin[0] !== b.lignin[0] || filters.lignin[1] !== b.lignin[1] ||
    filters.ash[0] !== b.ash[0] || filters.ash[1] !== b.ash[1] ||
    filters.hhv[0] !== b.hhv[0] || filters.hhv[1] !== b.hhv[1]
  );
}
