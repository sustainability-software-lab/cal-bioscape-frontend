
// Types for the raw JSON data from resource_info.json
export interface RawResidueData {
  resource: string;
  resource_code: string;
  landiq_crop_name: string;
  residue_type: string;
  collected: string; // "TRUE" or "FALSE"
  from_month: string; // e.g. "4"
  to_month: string; // e.g. "10"
  residue_yield_wet_ton_per_ac: string;
  moisture_content: string; // e.g. "11%"
  residue_yield_dry_ton_per_ac: string;
}

// Types for the internal application structure
export interface SeasonalAvailability {
  [month: string]: boolean;
}

export interface ResidueFactors {
  resourceName: string; // Specific resource name (e.g. "Almond Hulls")
  wetTonsPerAcre: number;
  moistureContent: number;
  dryTonsPerAcre: number;
  seasonalAvailability: SeasonalAvailability;
  /** 1-indexed start month of the availability window (e.g. 9 = September) */
  fromMonth?: number;
  /** 1-indexed end month of the availability window (e.g. 11 = November) */
  toMonth?: number;
  residueType: string; // e.g. "Ag Residue"
  collected: boolean; // e.g. TRUE/FALSE
  /**
   * Data-team dedup flag ("Include In Totals"): false marks an overlapping
   * sub-category (e.g. "Almond Shells and Hulls mix") that must not be summed
   * into popup/inventory totals. Undefined is treated as excluded.
   */
  includeInTotals?: boolean;
  category?: string;
}

export interface FeedstockCharacteristics {
  category: string;
  moistureLevel: string;
  processingSuitability: string[];
}

// URLs for the static assets
const RESOURCE_INFO_URL = 'https://sustainability-software-lab.github.io/ca-biositing/resource_info.json';
// const HEADER_MAPPING_URL = 'https://uw-ssec.github.io/ca-biositing/resource_info_header_mapping.json'; // Not strictly needed for logic if keys are stable

// Storage for the processed data - now storing arrays of factors per crop
let processedResidueData: Record<string, ResidueFactors[]> = {};
// Parallel index keyed by API resource name (lowercased) -> single factor.
// Lets callers look residues up directly by the per-polygon `resources` names
// (e.g. "almond hulls") instead of guessing from the crop name.
let processedResidueByResource: Record<string, ResidueFactors> = {};
let processedFeedstockCharacteristics: Record<string, FeedstockCharacteristics> = {};
let isDataLoaded = false;
let loadPromise: Promise<void> | null = null;
let onLoadedCallbacks: Array<() => void> = [];

/** Subscribe to be notified once residue data finishes loading.
 *  If already loaded, calls cb synchronously. Returns an unsubscribe fn. */
export function onResidueDataLoaded(cb: () => void): () => void {
  if (isDataLoaded) { cb(); return () => {}; }
  onLoadedCallbacks.push(cb);
  return () => { onLoadedCallbacks = onLoadedCallbacks.filter(f => f !== cb); };
}

// Month mapping helper
const MONTH_MAP = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", 
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

// Helper to parse seasonal availability
const parseSeasonalAvailability = (fromMonthStr: string, toMonthStr: string): SeasonalAvailability => {
  const fromMonth = parseInt(fromMonthStr, 10);
  const toMonth = parseInt(toMonthStr, 10);
  
  const availability: SeasonalAvailability = {
    "Jan": false, "Feb": false, "Mar": false, "Apr": false, "May": false, "Jun": false,
    "Jul": false, "Aug": false, "Sep": false, "Oct": false, "Nov": false, "Dec": false
  };

  if (isNaN(fromMonth) || isNaN(toMonth)) {
    return availability; // Return all false if invalid
  }

  // Adjust for 0-indexed array if months are 1-12
  // Assuming 1 = Jan, 12 = Dec based on "4" to "10" (Apr to Oct) example
  
  if (fromMonth <= toMonth) {
    // Normal range (e.g. 4 to 10)
    for (let i = fromMonth; i <= toMonth; i++) {
      if (i >= 1 && i <= 12) {
        availability[MONTH_MAP[i-1]] = true;
      }
    }
  } else {
    // Wrap around range (e.g. 11 to 2)
    for (let i = fromMonth; i <= 12; i++) {
       availability[MONTH_MAP[i-1]] = true;
    }
    for (let i = 1; i <= toMonth; i++) {
       availability[MONTH_MAP[i-1]] = true;
    }
  }
  
  return availability;
};

// Helper to determine category based on residue type or crop name (heuristic for now, or based on existing logic)
// In the original code, this was hardcoded in separate objects.
// We might need a way to map this dynamically.
// For now, we'll try to infer or use a default.
const inferCategory = (item: RawResidueData): string => {
  // Using the original categories as a guide
  const cropName = item.landiq_crop_name || item.resource;
  
  // This logic mimics the original hardcoded split 
  // Ideally, the JSON would provide this category, but "residue_type" ("Ag Residue", "Processing Waste") is different.
  // We'll rely on the existing CROP_NAME_MAPPING and manual classification if needed, 
  // or just use a generic "Crop Residue" if exact match fails.
  
  // For now, let's look at the structure in constants.ts
  // ORCHARD_VINEYARD_RESIDUES, ROW_CROP_RESIDUES, FIELD_CROP_RESIDUES
  
  // We can try to map based on some keywords or a list if strictly required.
  // However, the 'category' field in getCropResidueFactors return value ('Orchard and Vineyard', 'Row Crop', 'Field Crop') 
  // is mainly used for display. 
  
  // Let's defer strict categorization or use a simple mapping if possible.
  return "Crop Residue"; 
};


/** Read the first present key from a record, supporting both the live JSON's
 *  Title Case headers (e.g. "LandIQ Crop Name") and the legacy snake_case keys
 *  (e.g. "landiq_crop_name"). The published resource_info.json switched to Title
 *  Case headers (see resource_info_header_mapping.json), so reading only one
 *  naming convention silently drops every field. */
function pickField(item: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    const value = item[key];
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

/** Parse a TRUE/FALSE flag that may arrive as a real JSON boolean (live JSON) or
 *  a "TRUE"/"FALSE" string (legacy JSON). Missing/unparseable → false. */
function parseFlag(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.trim().toUpperCase() === 'TRUE';
  return false;
}

function toStr(value: unknown): string {
  return value === undefined || value === null ? '' : String(value);
}

/**
 * Shared inclusion filter for field-attributable residue totals.
 *
 * A residue counts toward map-popup and inventory totals only when the data team
 * has flagged it `Include In Totals` (the dedup flag that excludes overlapping
 * sub-categories like "Almond Shells and Hulls mix") AND it is left in the field
 * rather than collected at a processing facility (`Collected? = false`) — the
 * field popup/inventory attributes tonnage to crop acreage, so processing waste
 * (hulls, shells; null per-acre yield) does not belong. Both the popup and the
 * inventory call this single predicate so they can never diverge.
 */
export function shouldIncludeResidueInTotals(
  factor: Pick<ResidueFactors, 'includeInTotals' | 'collected'>
): boolean {
  return factor.includeInTotals === true && factor.collected === false;
}

/**
 * Pure parser for the raw resource_info.json array. Reads both Title Case and
 * legacy snake_case headers. Returns the crop-keyed and resource-keyed indexes.
 * Exported for unit testing; `fetchResidueData` wires it to the network fetch.
 */
export function parseResidueRecords(
  data: Array<Record<string, unknown>>
): { byCrop: Record<string, ResidueFactors[]>; byResource: Record<string, ResidueFactors> } {
  const byCrop: Record<string, ResidueFactors[]> = {};
  const byResource: Record<string, ResidueFactors> = {};

  data.forEach(item => {
    const cropName = toStr(pickField(item, 'LandIQ Crop Name', 'landiq_crop_name')).trim();
    if (!cropName) return;

    const resource = toStr(pickField(item, 'Resource', 'resource'));

    const wetTons = parseFloat(toStr(pickField(item, 'Residue Yield (Wet Ton/Ac)', 'residue_yield_wet_ton_per_ac'))) || 0;
    const dryTons = parseFloat(toStr(pickField(item, 'Residue Yield (Dry Ton/Ac)', 'residue_yield_dry_ton_per_ac'))) || 0;

    // Parse moisture content "11%" -> 0.11
    let moisture = 0;
    const moistureStr = toStr(pickField(item, 'Moisture Content', 'moisture_content')).replace('%', '');
    if (moistureStr) {
      moisture = parseFloat(moistureStr) / 100;
      if (Number.isNaN(moisture)) moisture = 0;
    }

    const fromMonthStr = toStr(pickField(item, 'From Month', 'from_month'));
    const toMonthStr = toStr(pickField(item, 'To Month', 'to_month'));
    const seasonal = parseSeasonalAvailability(fromMonthStr, toMonthStr);
    const fromMonthNum = parseInt(fromMonthStr, 10);
    const toMonthNum = parseInt(toMonthStr, 10);

    const factor: ResidueFactors = {
      resourceName: resource,
      wetTonsPerAcre: wetTons,
      dryTonsPerAcre: dryTons,
      moistureContent: moisture,
      seasonalAvailability: seasonal,
      fromMonth: isNaN(fromMonthNum) ? undefined : fromMonthNum,
      toMonth: isNaN(toMonthNum) ? undefined : toMonthNum,
      residueType: toStr(pickField(item, 'Residue Type', 'residue_type')),
      collected: parseFlag(pickField(item, 'Collected?', 'collected')),
      includeInTotals: parseFlag(pickField(item, 'Include In Totals', 'include_in_totals')),
    };

    (byCrop[cropName] ??= []).push(factor);

    const resourceKey = resource.trim().toLowerCase();
    if (resourceKey) {
      byResource[resourceKey] = factor;
    }
  });

  return { byCrop, byResource };
}

export const fetchResidueData = async (): Promise<void> => {
  if (isDataLoaded) return;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const response = await fetch(RESOURCE_INFO_URL);
      if (!response.ok) {
        throw new Error(`Failed to fetch residue data: ${response.statusText}`);
      }
      const data: unknown = await response.json();
      const records = Array.isArray(data) ? (data as Array<Record<string, unknown>>) : [];

      const { byCrop, byResource } = parseResidueRecords(records);

      processedResidueData = byCrop;
      processedResidueByResource = byResource;
      isDataLoaded = true;
      onLoadedCallbacks.forEach(cb => cb());
      onLoadedCallbacks = [];
      console.log('Residue data loaded successfully', Object.keys(processedResidueData).length, 'items');
      
    } catch (error) {
      console.error('Error fetching residue data:', error);
      // Fallback or re-throw? For now, we log. 
      // The app might break if it relies on this data, so we might want to keep the hardcoded values as fallback?
      // The prompt says "must be used in place of constants", implying replacement.
      throw error;
    } finally {
      loadPromise = null;
    }
  })();

  return loadPromise;
};

// Accessor for the data - returns array of factors
export const getResidueData = (cropName: string): ResidueFactors[] | null => {
  if (!isDataLoaded) {
    console.warn('Residue data accessed before loading completed. Call fetchResidueData() first.');
    return null;
  }
  // Try exact match first
  if (processedResidueData[cropName]) {
    return processedResidueData[cropName];
  }
  
  // Try simple normalization or mapping if needed
  // For now, assuming CROP_NAME_MAPPING handles the translation to the key used here
  // But since we trimmed keys, ensure consumer trims too if they pass untrimmed strings
  
  return null;
};

// Accessor keyed by API resource name (case-insensitive), e.g. "almond hulls".
// Returns the single residue factor for that resource, or null if not loaded/found.
export const getResidueDataByResourceName = (resourceName: string): ResidueFactors | null => {
  if (!isDataLoaded) {
    console.warn('Residue data accessed before loading completed. Call fetchResidueData() first.');
    return null;
  }
  return processedResidueByResource[resourceName.trim().toLowerCase()] ?? null;
};

export const getAllResidueData = () => processedResidueData;

export const isResidueDataLoaded = () => isDataLoaded;

// Auto-start the fetch as soon as this module is imported on the client,
// so data is ready (or loading) before any component renders.
if (typeof window !== 'undefined') {
  fetchResidueData().catch(err => console.error('[residue-data] preload failed:', err));
}
