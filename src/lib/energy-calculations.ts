/**
 * Energy potential calculation utilities for Cal BioScape.
 *
 * Converts dry residue tonnage (short tons/year) + HHV (MJ/kg) into
 * total feedstock energy potential in GJ, MMBTU, and MWh.
 *
 * Note: These figures represent the energy CONTENT of the feedstock, not
 * final energy output. Apply technology-specific conversion efficiencies
 * to estimate net energy production.
 */

// ---------------------------------------------------------------------------
// Literature HHV fallbacks (MJ/kg, dry basis)
// Source: NREL Biomass Compositional Analysis, Phyllis2 database, USDA ARS
// ---------------------------------------------------------------------------
export const HHV_FALLBACKS: Record<string, number> = {
  almond_hulls:      14.5,
  'Almond Hulls':    14.5,
  'almond hulls':    14.5,
  walnut_shells:     18.6,
  'Walnut Shells':   18.6,
  'walnut shells':   18.6,
  pistachio_shells:  20.1,
  'Pistachio shells': 20.1,
  'pistachio shells': 20.1,
  rice_straw:        14.9,
  'Rice straw':      14.9,
  'rice straw':      14.9,
  wheat_straw:       17.5,
  'Wheat straw':     17.5,
  'wheat straw':     17.5,
  cotton_gin_trash:  16.0,
  'Cotton stem mix': 16.0,
  'cotton stem mix': 16.0,
  tomato_pomace:     15.5,
  'Tomato pomace':   15.5,
  'tomato pomace':   15.5,
  corn_stover:       17.4,
  'Corn stover whole': 17.4,
  'corn stover whole': 17.4,
  alfalfa:           17.0,
  Alfalfa:           17.0,
  grape_pomace:      17.0,
  'Grape pomace':    17.0,
  'grape pomace':    17.0,
  olive_pomace:      19.5,
  'Olive pomace':    19.5,
  'olive pomace':    19.5,
  barley_straw:      17.5,
  'Barley straw':    17.5,
  'barley straw':    17.5,
  oat_straw:         17.3,
  'Oats straw':      17.3,
  'oats straw':      17.3,
  safflower_straw:   17.2,
  'Safflower straw': 17.2,
  'safflower straw': 17.2,
  sunflower_stalk:   17.0,
  'Sunflower stalks': 17.0,
  'sunflower stalks': 17.0,
  sugar_beet_tops:   14.0,
  'Sugar beet tops': 14.0,
  'sugar beet tops': 14.0,
};

// ---------------------------------------------------------------------------
// Unit conversions
// ---------------------------------------------------------------------------

/** 1 short ton = 907.185 kg */
const KG_PER_SHORT_TON = 907.185;
/** 1 GJ = 0.947817 MMBTU */
const MMBTU_PER_GJ = 0.947817;
/** 1 GJ = 0.277778 MWh */
const MWH_PER_GJ = 0.277778;

export type EnergyUnit = 'GJ' | 'MMBTU' | 'MWh';

export interface CropEnergyResult {
  /** LandIQ crop name */
  cropName: string;
  /** Dry residue input (short tons/year) */
  dryTons: number;
  /** HHV used for calculation (MJ/kg) */
  hhv: number;
  /** Whether HHV came from the API or literature fallback */
  hhvSource: 'api' | 'fallback';
  /** Feedstock energy content (GJ/year) */
  energyGj: number;
}

export interface EnergyTotals {
  totalGj: number;
  totalMmbtu: number;
  totalMwh: number;
  /** Estimated electricity output at 28% thermal efficiency (MWh/year) */
  electricityMwh: number;
  /** Whether all HHV values came from API (no fallbacks used) */
  allApiData: boolean;
  cropBreakdown: CropEnergyResult[];
}

/**
 * Calculate the feedstock energy content for a single crop.
 *
 * @param dryTons   Annual dry residue (short tons/year)
 * @param hhv       Higher Heating Value (MJ/kg, dry basis)
 */
export function calculateCropEnergy(dryTons: number, hhv: number): number {
  // tons/yr × kg/ton × MJ/kg → MJ/yr ÷ 1000 → GJ/yr
  return (dryTons * KG_PER_SHORT_TON * hhv) / 1000;
}

export function convertGj(gj: number, unit: EnergyUnit): number {
  if (unit === 'MMBTU') return gj * MMBTU_PER_GJ;
  if (unit === 'MWh') return gj * MWH_PER_GJ;
  return gj;
}

export function energyUnitLabel(unit: EnergyUnit): string {
  if (unit === 'MMBTU') return 'MMBTU';
  if (unit === 'MWh') return 'MWh';
  return 'GJ';
}

/**
 * Aggregate energy totals across all crops.
 *
 * @param crops  Array of {cropName, dryTons, apiHhv, apiResource} inputs
 * @param hhvLookup  Map of API resource name → HHV value (MJ/kg) from the analysis API
 */
export function computeEnergyTotals(
  crops: Array<{ cropName: string; dryTons: number; apiResource: string | null }>,
  hhvLookup: Record<string, number | null>
): EnergyTotals {
  let totalGj = 0;
  let allApiData = true;
  const cropBreakdown: CropEnergyResult[] = [];

  for (const crop of crops) {
    if (!crop.dryTons || crop.dryTons <= 0) continue;

    let hhv: number | null = null;
    let hhvSource: 'api' | 'fallback' = 'fallback';

    // Try the API lookup first
    if (crop.apiResource && hhvLookup[crop.apiResource] != null) {
      hhv = hhvLookup[crop.apiResource]!;
      hhvSource = 'api';
    }

    // Fall back to literature values
    if (hhv == null && crop.apiResource) {
      hhv = HHV_FALLBACKS[crop.apiResource] ?? null;
    }

    if (hhv == null) {
      allApiData = false;
      continue; // Cannot calculate for this crop
    }

    if (hhvSource === 'fallback') allApiData = false;

    const energyGj = calculateCropEnergy(crop.dryTons, hhv);
    totalGj += energyGj;

    cropBreakdown.push({
      cropName: crop.cropName,
      dryTons: crop.dryTons,
      hhv,
      hhvSource,
      energyGj,
    });
  }

  return {
    totalGj,
    totalMmbtu: totalGj * MMBTU_PER_GJ,
    totalMwh: totalGj * MWH_PER_GJ,
    electricityMwh: totalGj * MWH_PER_GJ * 0.28,
    allApiData,
    cropBreakdown,
  };
}
