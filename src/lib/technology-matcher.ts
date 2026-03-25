/**
 * Conversion technology recommendation engine for Cal BioScape.
 *
 * Takes a weighted-average composition summary of the feedstock mix in a
 * siting buffer and scores each candidate conversion technology from 0–100.
 */

import { CompositionData } from './composition-filters';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FeedstockMixSummary {
  /** Weighted-average composition values (dry-ton weighted). undefined = no data */
  moisture?: number;
  ash?: number;
  cellulose?: number;
  hemicellulose?: number;
  lignin?: number;
  carbon?: number;
  nitrogen?: number;
  volatileMatter?: number;
  hhv?: number;
  /** Total dry residue (short tons/year) across all crops in the mix */
  totalDryTons: number;
}

export interface TechScore {
  name: string;
  shortName: string;
  score: number;         // 0–100
  /** Key driver phrases for this technology given the current mix */
  rationale: string[];
  color: 'green' | 'amber' | 'gray';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Clamp a number to [0, max]. */
function clamp(v: number, max: number): number {
  return Math.max(0, Math.min(max, v));
}

// ---------------------------------------------------------------------------
// Technology scoring rules
// ---------------------------------------------------------------------------

function scoreAD(s: FeedstockMixSummary): { score: number; rationale: string[] } {
  let score = 0;
  const rationale: string[] = [];

  if (s.moisture !== undefined) {
    if (s.moisture > 50)       { score += 35; rationale.push(`High moisture (${s.moisture.toFixed(0)}%) suits wet digestion`); }
    else if (s.moisture > 30)  { score += 20; rationale.push(`Moderate moisture (${s.moisture.toFixed(0)}%) compatible with AD`); }
    else if (s.moisture > 15)  { score += 8; }
    else                        { score += 0; rationale.push(`Low moisture (${s.moisture.toFixed(0)}%) reduces AD efficiency`); }
  }
  if (s.nitrogen !== undefined) {
    if (s.nitrogen > 2)        { score += 25; rationale.push(`High N content (${s.nitrogen.toFixed(1)}%) — good C/N ratio`); }
    else if (s.nitrogen > 1)   { score += 15; }
    else                        { score += 0; rationale.push(`Low nitrogen may limit AD microbial activity`); }
  }
  if (s.volatileMatter !== undefined) {
    if (s.volatileMatter > 75) { score += 20; rationale.push(`High volatile matter (${s.volatileMatter.toFixed(0)}%) → high biogas yield`); }
    else if (s.volatileMatter > 60) { score += 12; }
    else                        { score += 5; }
  }
  if (s.lignin !== undefined) {
    if (s.lignin < 15)         { score += 15; }
    else if (s.lignin < 25)    { score += 8; }
    else                        { score -= 5; rationale.push(`High lignin (${s.lignin.toFixed(0)}%) resists anaerobic breakdown`); }
  }
  // Scale bonus
  if (s.totalDryTons < 500)   { score += 5; rationale.push('Small scale — AD well-suited to distributed sites'); }

  return { score: clamp(score, 100), rationale };
}

function scoreCombustion(s: FeedstockMixSummary): { score: number; rationale: string[] } {
  let score = 20; // baseline — combustion is always technically viable
  const rationale: string[] = [];

  if (s.moisture !== undefined) {
    if (s.moisture < 15)       { score += 30; rationale.push(`Low moisture (${s.moisture.toFixed(0)}%) — ideal for direct combustion`); }
    else if (s.moisture < 25)  { score += 18; }
    else if (s.moisture < 40)  { score += 5; }
    else                        { score -= 10; rationale.push(`High moisture (${s.moisture.toFixed(0)}%) reduces combustion efficiency`); }
  }
  if (s.ash !== undefined) {
    if (s.ash < 5)             { score += 20; rationale.push(`Low ash (${s.ash.toFixed(1)}%) — minimal fouling risk`); }
    else if (s.ash < 12)       { score += 10; }
    else                        { score -= 5; rationale.push(`High ash (${s.ash.toFixed(1)}%) increases fouling/clinker risk`); }
  }
  if (s.hhv !== undefined) {
    if (s.hhv > 17)            { score += 20; rationale.push(`High HHV (${s.hhv.toFixed(1)} MJ/kg) — excellent heat content`); }
    else if (s.hhv > 14)       { score += 12; }
    else                        { score += 5; }
  }
  if (s.totalDryTons > 5000)  { score += 10; rationale.push('Large-scale feedstock supply favours centralised combustion'); }
  else if (s.totalDryTons > 1000) { score += 5; }

  return { score: clamp(score, 100), rationale };
}

function scorePyrolysisGasification(s: FeedstockMixSummary): { score: number; rationale: string[] } {
  let score = 15;
  const rationale: string[] = [];

  if (s.moisture !== undefined) {
    if (s.moisture < 15)       { score += 30; rationale.push(`Low moisture (${s.moisture.toFixed(0)}%) — ready for thermochemical conversion`); }
    else if (s.moisture < 25)  { score += 15; }
    else                        { score += 0; rationale.push(`Moisture (${s.moisture.toFixed(0)}%) requires pre-drying before pyrolysis`); }
  }
  if (s.carbon !== undefined) {
    if (s.carbon > 48)         { score += 20; rationale.push(`High carbon (${s.carbon.toFixed(0)}%) → good syngas / biochar yield`); }
    else if (s.carbon > 42)    { score += 12; }
    else                        { score += 5; }
  }
  if (s.cellulose !== undefined) {
    if (s.cellulose > 30)      { score += 20; rationale.push(`High cellulose (${s.cellulose.toFixed(0)}%) — good pyrolysis reactivity`); }
    else if (s.cellulose > 20) { score += 12; }
  }
  if (s.lignin !== undefined) {
    if (s.lignin > 20)         { score += 15; rationale.push(`High lignin (${s.lignin.toFixed(0)}%) — high biochar yield`); }
    else if (s.lignin > 10)    { score += 8; }
  }
  if (s.ash !== undefined && s.ash > 15) {
    score -= 10; rationale.push(`High ash (${s.ash.toFixed(1)}%) complicates gasifier operation`);
  }

  return { score: clamp(score, 100), rationale };
}

function scoreFermentation(s: FeedstockMixSummary): { score: number; rationale: string[] } {
  let score = 0;
  const rationale: string[] = [];

  if (s.cellulose !== undefined) {
    if (s.cellulose > 35)      { score += 40; rationale.push(`High cellulose (${s.cellulose.toFixed(0)}%) — strong ethanol yield potential`); }
    else if (s.cellulose > 25) { score += 25; rationale.push(`Moderate cellulose (${s.cellulose.toFixed(0)}%) — feasible ethanol feedstock`); }
    else if (s.cellulose > 15) { score += 12; }
    else                        { score += 0; rationale.push(`Low cellulose limits fermentation yield`); }
  }
  if (s.hemicellulose !== undefined && s.hemicellulose > 20) {
    score += 15; rationale.push(`Hemicellulose (${s.hemicellulose.toFixed(0)}%) adds C5 sugar substrate`);
  }
  if (s.lignin !== undefined) {
    if (s.lignin < 15)         { score += 25; rationale.push(`Low lignin (${s.lignin.toFixed(0)}%) — minimal pretreatment cost`); }
    else if (s.lignin < 25)    { score += 12; }
    else                        { score -= 10; rationale.push(`High lignin (${s.lignin.toFixed(0)}%) increases pretreatment cost`); }
  }
  if (s.totalDryTons >= 1000)  { score += 10; }

  return { score: clamp(score, 100), rationale };
}

function scoreComposting(s: FeedstockMixSummary): { score: number; rationale: string[] } {
  let score = 30; // always viable at some scale
  const rationale: string[] = [];

  if (s.nitrogen !== undefined && s.nitrogen > 1.5) {
    score += 20; rationale.push(`Nitrogen-rich mix (${s.nitrogen.toFixed(1)}%) accelerates composting`);
  }
  if (s.moisture !== undefined && s.moisture > 40) {
    score += 15; rationale.push('High moisture content suits windrow composting');
  }
  if (s.hhv !== undefined && s.hhv < 14) {
    score += 10; rationale.push('Low-energy feedstocks often better suited to composting than energy recovery');
  }
  if (s.totalDryTons < 200) {
    score += 15; rationale.push('Small volumes well-matched to on-farm composting');
  }

  return { score: clamp(score, 100), rationale };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute weighted-average composition for the feedstock mix.
 * Crops without composition data are excluded from the average.
 */
export function computeMixSummary(
  crops: Array<{ cropName: string; dryTons: number; apiResource: string | null }>,
  compositionByResource: Record<string, CompositionData>
): FeedstockMixSummary {
  const totalDryTons = crops.reduce((s, c) => s + c.dryTons, 0);

  type Key = keyof Omit<CompositionData, 'hasData'>;
  const fields: Key[] = ['moisture', 'ash', 'cellulose', 'hemicellulose', 'lignin', 'carbon', 'nitrogen', 'volatileMatter', 'hhv'];

  const sums: Partial<Record<Key, number>> = {};
  const weights: Partial<Record<Key, number>> = {};

  for (const crop of crops) {
    if (!crop.apiResource || crop.dryTons <= 0) continue;
    const comp = compositionByResource[crop.apiResource];
    if (!comp?.hasData) continue;

    for (const field of fields) {
      const val = comp[field] as number | undefined;
      if (val !== undefined) {
        sums[field] = (sums[field] ?? 0) + val * crop.dryTons;
        weights[field] = (weights[field] ?? 0) + crop.dryTons;
      }
    }
  }

  const summary: FeedstockMixSummary = { totalDryTons };
  for (const field of fields) {
    const w = weights[field];
    if (w && w > 0) {
      (summary as unknown as Record<string, number>)[field] = (sums[field] ?? 0) / w;
    }
  }

  return summary;
}

/**
 * Score all technologies for a given feedstock mix summary.
 * Returns results sorted by score descending.
 */
export function rankTechnologies(summary: FeedstockMixSummary): TechScore[] {
  const technologies = [
    { name: 'Anaerobic Digestion', shortName: 'AD', fn: scoreAD },
    { name: 'Direct Combustion / CHP', shortName: 'Combustion', fn: scoreCombustion },
    { name: 'Pyrolysis / Gasification', shortName: 'Pyrolysis', fn: scorePyrolysisGasification },
    { name: 'Fermentation (Ethanol)', shortName: 'Fermentation', fn: scoreFermentation },
    { name: 'Composting', shortName: 'Compost', fn: scoreComposting },
  ];

  const results: TechScore[] = technologies.map(({ name, shortName, fn }) => {
    const { score, rationale } = fn(summary);
    const color: TechScore['color'] =
      score >= 60 ? 'green' : score >= 35 ? 'amber' : 'gray';
    return { name, shortName, score, rationale: rationale.slice(0, 2), color };
  });

  return results.sort((a, b) => b.score - a.score);
}
