/**
 * Literature-based fallback residue factors for California crops not covered
 * by the primary resource_info.json data source.
 *
 * Values are drawn from:
 *  - Brunig et al. (2017). "Quantification of Food Waste and Its Potential for
 *    Composting in California." Environ. Sci. Technol. 51(14):7982–7991.
 *    DOI: 10.1021/acs.est.6b04591 (and Supporting Information)
 *  - USDA Agricultural Research Service crop residue factor tables
 *  - California Department of Food and Agriculture crop production statistics
 *  - Andrews (2006) biomass residue factors for field crops
 *
 * Keys match the standardized names produced by CROP_NAME_MAPPING in constants.ts,
 * which in turn match the landiq_crop_name keys in the primary JSON.
 *
 * Rice (R1) entries here override the "Missing" values from resource_info.json.
 */

import type { ResidueFactors, SeasonalAvailability } from './residue-data';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] as const;

/** Build a SeasonalAvailability object for a month range (1-indexed, inclusive). */
function availability(fromMonth: number, toMonth: number): SeasonalAvailability {
  const result: SeasonalAvailability = Object.fromEntries(MONTHS.map(m => [m, false]));
  if (fromMonth <= toMonth) {
    for (let i = fromMonth; i <= toMonth; i++) result[MONTHS[i - 1]] = true;
  } else {
    // wrap-around (e.g. Nov–Feb)
    for (let i = fromMonth; i <= 12; i++) result[MONTHS[i - 1]] = true;
    for (let i = 1; i <= toMonth; i++) result[MONTHS[i - 1]] = true;
  }
  return result;
}

/** Single-entry helper to keep the table concise. */
function factor(
  resourceName: string,
  residueType: string,
  dryTonsPerAcre: number,
  wetTonsPerAcre: number,
  moistureContent: number, // 0–1
  fromMonth: number,
  toMonth: number,
  collected = false,
): ResidueFactors {
  return {
    resourceName,
    residueType,
    dryTonsPerAcre,
    wetTonsPerAcre,
    moistureContent,
    seasonalAvailability: availability(fromMonth, toMonth),
    collected,
  };
}

/**
 * Fallback residue factors keyed by the standardized landiq_crop_name
 * (i.e., the value side of CROP_NAME_MAPPING, not the LandIQ name itself).
 *
 * Each value is an array mirroring the ResidueFactors[] produced by residue-data.ts
 * so callers can use them interchangeably.
 */
export const RESIDUE_FALLBACKS: Record<string, ResidueFactors[]> = {

  // ── Rice: override "Missing" values from resource_info.json ──────────────
  // Source: California Rice Commission; USDA ARS
  // Rice straw ~1.5 dry t/ac (burned or incorporated); hulls at mill ~0.3 dry t/ac
  'Rice (R1)': [
    factor('Rice straw',  'Ag Residue',       1.5, 2.0, 0.25, 9, 11, false),
    factor('Rice hulls',  'Processing Waste', 0.3, 0.35, 0.14, 9, 11, true),
  ],

  // ── Field crops ───────────────────────────────────────────────────────────
  // Source: Andrews (2006); USDA ARS biomass tables; Brunig et al. SI Table S2
  'Barley': [
    factor('Barley straw', 'Ag Residue', 1.1, 1.25, 0.12, 5, 7, false),
  ],
  'Oats': [
    factor('Oats straw', 'Ag Residue', 0.9, 1.0, 0.10, 5, 7, false),
  ],
  'Safflower': [
    factor('Safflower straw', 'Ag Residue', 0.7, 0.8, 0.12, 7, 9, false),
  ],
  'Sunflower': [
    factor('Sunflower stalks', 'Ag Residue', 1.0, 1.2, 0.15, 8, 10, false),
  ],
  'Sugar Beets': [
    factor('Sugar beet tops', 'Ag Residue', 0.5, 2.5, 0.80, 10, 12, false),
  ],
  'Sweet Corn': [
    factor('Sweet corn stover', 'Ag Residue', 1.8, 2.5, 0.28, 7, 9, false),
  ],
  'Unsp. Field & Seed': [
    factor('Field crop residue (unspecified)', 'Ag Residue', 0.8, 1.0, 0.12, 6, 10, false),
  ],
  'Bermuda Grass Seed': [
    factor('Bermuda grass straw', 'Ag Residue', 0.6, 0.7, 0.12, 6, 9, false),
  ],

  // ── Orchard & Vineyard — prunings ────────────────────────────────────────
  // Source: Brunig et al. (2017) SI Table S1; CDFA orchard removal studies
  'Apples': [
    factor('Apple prunings', 'Ag Residue', 0.6, 0.8, 0.20, 11, 2, false),
  ],
  'Avocados': [
    factor('Avocado prunings', 'Ag Residue', 0.3, 0.4, 0.20, 11, 2, false),
  ],
  'Cherries': [
    factor('Cherry prunings', 'Ag Residue', 0.4, 0.5, 0.20, 11, 2, false),
  ],
  'Dates': [
    factor('Date palm fronds', 'Ag Residue', 0.2, 0.25, 0.20, 11, 12, false),
  ],
  'Figs': [
    factor('Fig prunings', 'Ag Residue', 0.4, 0.5, 0.20, 12, 1, false),
  ],
  'Kiwifruit': [
    factor('Kiwifruit prunings', 'Ag Residue', 0.3, 0.4, 0.25, 1, 2, false),
  ],
  'Persimmons': [
    factor('Persimmon prunings', 'Ag Residue', 0.4, 0.5, 0.20, 12, 2, false),
  ],
  'Pomegranates': [
    factor('Pomegranate prunings', 'Ag Residue', 0.3, 0.4, 0.20, 11, 2, false),
  ],
  'Pecans': [
    factor('Pecan hulls & shells', 'Ag Residue', 0.5, 0.65, 0.23, 10, 12, false),
  ],
  'Strawberries': [
    factor('Strawberry plant residue', 'Ag Residue', 0.15, 0.2, 0.30, 1, 12, false),
  ],

  // ── Vegetables / row crops ────────────────────────────────────────────────
  // Source: Brunig et al. (2017) SI; USDA ERS loss-adjusted food availability
  'Beans': [
    factor('Dry bean straw', 'Ag Residue', 0.8, 0.9, 0.12, 7, 9, false),
  ],
  'Lima Beans': [
    factor('Lima bean straw', 'Ag Residue', 0.7, 0.8, 0.12, 7, 9, false),
  ],
  'Green Lima Beans': [
    factor('Green lima bean residue', 'Ag Residue', 0.5, 1.0, 0.50, 6, 8, false),
  ],
  'Broccoli': [
    factor('Broccoli trimmings & leaves', 'Ag Residue', 0.4, 1.5, 0.73, 1, 12, false),
  ],
  'Cabbage': [
    factor('Cabbage outer leaves', 'Ag Residue', 0.3, 1.2, 0.75, 1, 12, false),
  ],
  'Carrots': [
    factor('Carrot tops & culls', 'Ag Residue', 0.2, 0.8, 0.75, 1, 12, false),
  ],
  'Cauliflower': [
    factor('Cauliflower trimmings', 'Ag Residue', 0.3, 1.2, 0.75, 1, 12, false),
  ],
  'Celery': [
    factor('Celery trimmings', 'Ag Residue', 0.1, 0.5, 0.80, 1, 12, false),
  ],
  'Cucumbers': [
    factor('Cucumber culls', 'Ag Residue', 0.2, 0.9, 0.78, 5, 9, false),
  ],
  'Garlic': [
    factor('Garlic tops & culls', 'Ag Residue', 0.3, 0.6, 0.50, 6, 8, false),
  ],
  'Lettuce and Romaine': [
    factor('Lettuce trimmings & culls', 'Ag Residue', 0.1, 0.5, 0.80, 1, 12, false),
  ],
  'Dry Onions': [
    factor('Dry onion culls & skins', 'Ag Residue', 0.3, 0.6, 0.50, 7, 9, false),
  ],
  'Hot Peppers': [
    factor('Hot pepper residue', 'Ag Residue', 0.4, 1.2, 0.67, 7, 10, false),
  ],
  'Sweet Peppers': [
    factor('Sweet pepper residue', 'Ag Residue', 0.4, 1.2, 0.67, 7, 10, false),
  ],
  'Spinach': [
    factor('Spinach trimmings', 'Ag Residue', 0.1, 0.4, 0.75, 1, 12, false),
  ],
  'Unsp. vegetables': [
    factor('Vegetable residue (unspecified)', 'Ag Residue', 0.3, 1.0, 0.70, 1, 12, false),
  ],
};
