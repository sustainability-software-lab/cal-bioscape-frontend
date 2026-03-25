// Import from tileset registry for centralized management
import { TILESET_REGISTRY } from './tileset-registry';

// Re-export for backward compatibility
export const FEEDSTOCK_TILESET_ID: string = TILESET_REGISTRY.feedstock.tilesetId;

// Crop residue factor mappings have been moved to dynamic loading via residue-data.ts
// ORCHARD_VINEYARD_RESIDUES, ROW_CROP_RESIDUES, and FIELD_CROP_RESIDUES are deprecated
// and have been removed to ensure the single source of truth is the fetched JSON data.

// Mapping table for crop name standardization
// This maps the crop names in the database to the names in our residue factor tables
export const CROP_NAME_MAPPING = {
  // Orchard and Vineyard crops
  "Apples": "Apples", // No data in JSON
  "Apricots": "Apricots (D2)",
  "Avocados": "Avocados", // No data in JSON
  "Cherries": "Cherries", // No data in JSON
  "Dates": "Dates", // No data in JSON
  "Figs": "Figs", // No data in JSON
  "Grapes": "Grapes (V)",
  "Kiwis": "Kiwifruit", // No data in JSON
  "Nectarines": "Peaches/Nect. (D5)",
  "Olives": "Olives (C6)",
  "Peaches/Nectarines": "Peaches/Nect. (D5)",
  "Pears": "Pears (D6)",
  "Persimmons": "Persimmons", // No data in JSON
  "Plums": "Plums (D7)",
  "Prunes": "Plums (D7)",
  "Pomegranates": "Pomegranates", // No data in JSON
  "Citrus and Subtropical": "Oranges (C3)", // Best match in JSON
  "Miscellaneous Subtropical Fruits": "Oranges (C3)",
  "Almonds": "Almonds",
  "Pecans": "Pecans", // No data in JSON
  "Pistachios": "Pistachios (D14)",
  "Walnuts": "Walnuts (D13)",
  "Miscellaneous Deciduous": "Misc. Deciduous (D10)",
  
  // Row crops
  "Artichokes": "Artichokes", // No data in JSON
  "Asparagus": "Asparagus", // No data in JSON
  "Bush Berries": "Berries", // No data in JSON
  "Beans (Dry)": "Beans", // No data in JSON
  "Lima Beans": "Lima Beans", // No data in JSON
  "Green Lima Beans": "Green Lima Beans", // No data in JSON
  "Broccoli": "Broccoli", // No data in JSON
  "Cabbage": "Cabbage", // No data in JSON
  "Cole Crops": "Cabbage",
  "Melons, Squash and Cucumbers": "Melons/Squash (T9)",
  "Carrots": "Carrots", // No data in JSON
  "Cauliflower": "Cauliflower", // No data in JSON
  "Celery": "Celery", // No data in JSON
  "Cucumbers": "Cucumbers", // No data in JSON
  "Garlic": "Garlic", // No data in JSON
  "Lettuce/Leafy Greens": "Lettuce and Romaine", // No data in JSON
  "Onions and Garlic": "Dry Onions", // No data in JSON
  "Peppers": "Hot Peppers", // No data in JSON
  "Sweet Peppers": "Sweet Peppers", // No data in JSON
  "Spinach": "Spinach", // No data in JSON
  "Squash": "Melons/Squash (T9)",
  "Sweet Corn": "Sweet Corn", // No data in JSON
  "Tomatoes": "Tomatoes Proc. (T15)",
  "Potatoes": "Potatoes (T12)",
  "Sweet Potatoes": "Sweet Potatoes (T13)",
  "Sugar beets": "Sugar Beets", // No data in JSON
  "Miscellaneous Truck Crops": "Unsp. vegetables",
  
  // Field crops
  "Corn, Sorghum and Sudan": "Corn, Sorghum (F16)",
  "Sorghum": "Corn, Sorghum (F16)",
  "Wheat": "Wheat (G2)",
  "Barley": "Barley", // No data in JSON
  "Oats": "Oats", // No data in JSON
  "Rice": "Rice (R1)",
  "Wild Rice": "Rice (R1)",
  "Safflower": "Safflower", // No data in JSON
  "Sunflowers": "Sunflower", // No data in JSON
  "Cotton": "Cotton (F1)",
  "Alfalfa & Alfalfa Mixtures": "Alfalfa & Mixtures",
  "Miscellaneous Field Crops": "Unsp. Field & Seed",
  "Miscellaneous Grain and Hay": "Unsp. Field & Seed",
  "Miscellaneous Grasses": "Bermuda Grass Seed",
  "Eucalyptus": "Eucalyptus",
  "Flowers, Nursery and Christmas Tree Farms": "Flowers, Nursery and Christmas Tree Farms",
  "Greenhouse": "Greenhouse",
  "Idle – Long Term": "Idle – Long Term",
  "Idle – Short Term": "Idle – Short Term",
  "Induced high water table native pasture": "Induced high water table native pasture",
  "Mixed Pasture": "Mixed Pasture",
  "Native Pasture": "Native Pasture",
  "Strawberries": "Strawberries",
  "Turf Farms": "Turf Farms",
  "Unclassified Fallow": "Unclassified Fallow",
  "Young Perennials": "Young Perennials"
};

import { getResidueData, ResidueFactors } from './residue-data';
import { RESIDUE_FALLBACKS } from './residue-fallbacks';

export type ResidueFactorsResult = {
  factors: ResidueFactors[];
  /** Whether the data came from the live resource_info.json or literature-based fallbacks */
  source: 'api' | 'fallback';
};

// Helper functions for crop residue calculations
// Returns factors for the given crop (one per residue type) plus a data-source tag.
export const getCropResidueFactors = (cropName: string): ResidueFactorsResult | null => {
  // Get the standardized crop name from mapping
  const standardizedName = CROP_NAME_MAPPING[cropName as keyof typeof CROP_NAME_MAPPING] || null;

  if (!standardizedName) {
    return null;
  }

  // Try to get data from the dynamic residue service (returns ResidueFactors[])
  // Only use dynamic data if at least one factor has non-zero yield values.
  // (Some entries in the JSON have "Missing" values which parse to 0.)
  const dynamicData = getResidueData(standardizedName);
  const hasYieldData = dynamicData && dynamicData.length > 0 &&
    dynamicData.some(f => f.dryTonsPerAcre > 0 || f.wetTonsPerAcre > 0);

  if (hasYieldData) {
    return {
      source: 'api',
      factors: dynamicData!.map(factor => ({
        ...factor,
        category: factor.category || 'Crop Residue',
        residueType: factor.residueType || 'Residue',
      })),
    };
  }

  // Fall back to literature-based estimates for crops missing from the primary data.
  const fallbackData = RESIDUE_FALLBACKS[standardizedName];
  if (fallbackData && fallbackData.length > 0) {
    return {
      source: 'fallback',
      factors: fallbackData.map(factor => ({
        ...factor,
        category: factor.category || 'Crop Residue',
        residueType: factor.residueType || 'Residue',
      })),
    };
  }

  return null;
};

// Re-export from tileset registry for backward compatibility
export const INFRASTRUCTURE_LAYERS = {
  "power_plants": {
    tilesetId: TILESET_REGISTRY.powerPlants.tilesetId,
    sourceLayer: TILESET_REGISTRY.powerPlants.sourceLayer,
  },
  "food_banks": {
    tilesetId: TILESET_REGISTRY.foodBanks.tilesetId,
    sourceLayer: TILESET_REGISTRY.foodBanks.sourceLayer,
  },
  "farmers_markets": {
    tilesetId: TILESET_REGISTRY.farmersMarkets.tilesetId,
    sourceLayer: TILESET_REGISTRY.farmersMarkets.sourceLayer,
  },
};

// ===== FEEDSTOCK CHARACTERISTICS FOR FILTERING =====

// Feedstock Resource Type Categories (resource-oriented, not LandIQ land-survey classifications)
export const FEEDSTOCK_CATEGORIES = {
  TREE_VINE_NUT:       'Tree, Vine & Nut Crops',
  GRAIN_FIELD:         'Grain & Field Crops',
  VEGETABLE_SPECIALTY: 'Vegetable & Specialty Crops',
  PASTURE_FORAGE:      'Pasture & Forage',
  FALLOW_IDLE:         'Idle & Fallow Land',
} as const;

// Processing Suitability Categories
export const PROCESSING_TYPES = {
  ANAEROBIC_DIGESTION: 'Anaerobic Digestion',
  PYROLYSIS: 'Pyrolysis/Biochar',
  COMBUSTION: 'Direct Combustion',
  COMPOSTING: 'Composting',
  ANIMAL_BEDDING: 'Animal Bedding'
} as const;

// Mapping of standardized crop names to their feedstock characteristics
export const FEEDSTOCK_CHARACTERISTICS: { [key: string]: { category: string; processingSuitability: string[]; } } = {
  "Apples": { 
    category: FEEDSTOCK_CATEGORIES.TREE_VINE_NUT, 
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Apricots (D2)": { 
    category: FEEDSTOCK_CATEGORIES.TREE_VINE_NUT, 
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Avocados": { 
    category: FEEDSTOCK_CATEGORIES.TREE_VINE_NUT, 
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Cherries": { 
    category: FEEDSTOCK_CATEGORIES.TREE_VINE_NUT, 
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Dates": { 
    category: FEEDSTOCK_CATEGORIES.TREE_VINE_NUT, 
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Figs": { 
    category: FEEDSTOCK_CATEGORIES.TREE_VINE_NUT, 
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Grapes (V)": { 
    category: FEEDSTOCK_CATEGORIES.TREE_VINE_NUT, 
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Kiwifruit": { 
    category: FEEDSTOCK_CATEGORIES.TREE_VINE_NUT, 
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Peaches/Nect. (D5)": { 
    category: FEEDSTOCK_CATEGORIES.TREE_VINE_NUT, 
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Olives (C6)": { 
    category: FEEDSTOCK_CATEGORIES.TREE_VINE_NUT, 
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Pears (D6)": { 
    category: FEEDSTOCK_CATEGORIES.TREE_VINE_NUT, 
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Persimmons": { 
    category: FEEDSTOCK_CATEGORIES.TREE_VINE_NUT, 
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Plums (D7)": { 
    category: FEEDSTOCK_CATEGORIES.TREE_VINE_NUT, 
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Pomegranates": { 
    category: FEEDSTOCK_CATEGORIES.TREE_VINE_NUT, 
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Oranges (C3)": { 
    category: FEEDSTOCK_CATEGORIES.TREE_VINE_NUT, 
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Almonds": { 
    category: FEEDSTOCK_CATEGORIES.TREE_VINE_NUT, 
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.ANIMAL_BEDDING]
  },
  "Pecans": { 
    category: FEEDSTOCK_CATEGORIES.TREE_VINE_NUT, 
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.ANIMAL_BEDDING]
  },
  "Pistachios (D14)": { 
    category: FEEDSTOCK_CATEGORIES.TREE_VINE_NUT, 
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.ANIMAL_BEDDING]
  },
  "Walnuts (D13)": { 
    category: FEEDSTOCK_CATEGORIES.TREE_VINE_NUT, 
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.ANIMAL_BEDDING]
  },
  "Misc. Deciduous (D10)": { 
    category: FEEDSTOCK_CATEGORIES.TREE_VINE_NUT, 
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Artichokes": { 
    category: FEEDSTOCK_CATEGORIES.VEGETABLE_SPECIALTY, 
    processingSuitability: [PROCESSING_TYPES.ANAEROBIC_DIGESTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Asparagus": { 
    category: FEEDSTOCK_CATEGORIES.VEGETABLE_SPECIALTY, 
    processingSuitability: [PROCESSING_TYPES.ANAEROBIC_DIGESTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Berries": { 
    category: FEEDSTOCK_CATEGORIES.VEGETABLE_SPECIALTY, 
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Beans": { 
    category: FEEDSTOCK_CATEGORIES.VEGETABLE_SPECIALTY, 
    processingSuitability: [PROCESSING_TYPES.ANAEROBIC_DIGESTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Lima Beans": { 
    category: FEEDSTOCK_CATEGORIES.VEGETABLE_SPECIALTY, 
    processingSuitability: [PROCESSING_TYPES.ANAEROBIC_DIGESTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Green Lima Beans": { 
    category: FEEDSTOCK_CATEGORIES.VEGETABLE_SPECIALTY, 
    processingSuitability: [PROCESSING_TYPES.ANAEROBIC_DIGESTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Broccoli": { 
    category: FEEDSTOCK_CATEGORIES.VEGETABLE_SPECIALTY, 
    processingSuitability: [PROCESSING_TYPES.ANAEROBIC_DIGESTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Cabbage": { 
    category: FEEDSTOCK_CATEGORIES.VEGETABLE_SPECIALTY, 
    processingSuitability: [PROCESSING_TYPES.ANAEROBIC_DIGESTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Melons/Squash (T9)": { 
    category: FEEDSTOCK_CATEGORIES.VEGETABLE_SPECIALTY, 
    processingSuitability: [PROCESSING_TYPES.ANAEROBIC_DIGESTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Carrots": { 
    category: FEEDSTOCK_CATEGORIES.VEGETABLE_SPECIALTY, 
    processingSuitability: [PROCESSING_TYPES.ANAEROBIC_DIGESTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Cauliflower": { 
    category: FEEDSTOCK_CATEGORIES.VEGETABLE_SPECIALTY, 
    processingSuitability: [PROCESSING_TYPES.ANAEROBIC_DIGESTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Celery": { 
    category: FEEDSTOCK_CATEGORIES.VEGETABLE_SPECIALTY, 
    processingSuitability: [PROCESSING_TYPES.ANAEROBIC_DIGESTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Cucumbers": { 
    category: FEEDSTOCK_CATEGORIES.VEGETABLE_SPECIALTY, 
    processingSuitability: [PROCESSING_TYPES.ANAEROBIC_DIGESTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Garlic": { 
    category: FEEDSTOCK_CATEGORIES.VEGETABLE_SPECIALTY, 
    processingSuitability: [PROCESSING_TYPES.ANAEROBIC_DIGESTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Lettuce and Romaine": { 
    category: FEEDSTOCK_CATEGORIES.VEGETABLE_SPECIALTY, 
    processingSuitability: [PROCESSING_TYPES.ANAEROBIC_DIGESTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Dry Onions": { 
    category: FEEDSTOCK_CATEGORIES.VEGETABLE_SPECIALTY, 
    processingSuitability: [PROCESSING_TYPES.ANAEROBIC_DIGESTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Hot Peppers": { 
    category: FEEDSTOCK_CATEGORIES.VEGETABLE_SPECIALTY, 
    processingSuitability: [PROCESSING_TYPES.ANAEROBIC_DIGESTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Sweet Peppers": { 
    category: FEEDSTOCK_CATEGORIES.VEGETABLE_SPECIALTY, 
    processingSuitability: [PROCESSING_TYPES.ANAEROBIC_DIGESTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Spinach": { 
    category: FEEDSTOCK_CATEGORIES.VEGETABLE_SPECIALTY, 
    processingSuitability: [PROCESSING_TYPES.ANAEROBIC_DIGESTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Sweet Corn": { 
    category: FEEDSTOCK_CATEGORIES.VEGETABLE_SPECIALTY, 
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.ANIMAL_BEDDING]
  },
  "Tomatoes Proc. (T15)": { 
    category: FEEDSTOCK_CATEGORIES.VEGETABLE_SPECIALTY, 
    processingSuitability: [PROCESSING_TYPES.ANAEROBIC_DIGESTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Potatoes (T12)": { 
    category: FEEDSTOCK_CATEGORIES.VEGETABLE_SPECIALTY, 
    processingSuitability: [PROCESSING_TYPES.ANAEROBIC_DIGESTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Sweet Potatoes (T13)": { 
    category: FEEDSTOCK_CATEGORIES.VEGETABLE_SPECIALTY, 
    processingSuitability: [PROCESSING_TYPES.ANAEROBIC_DIGESTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Sugar Beets": { 
    category: FEEDSTOCK_CATEGORIES.VEGETABLE_SPECIALTY, 
    processingSuitability: [PROCESSING_TYPES.ANAEROBIC_DIGESTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Unsp. vegetables": { 
    category: FEEDSTOCK_CATEGORIES.VEGETABLE_SPECIALTY, 
    processingSuitability: [PROCESSING_TYPES.ANAEROBIC_DIGESTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Corn, Sorghum (F16)": { 
    category: FEEDSTOCK_CATEGORIES.GRAIN_FIELD, 
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.ANIMAL_BEDDING]
  },
  "Wheat (G2)": { 
    category: FEEDSTOCK_CATEGORIES.GRAIN_FIELD, 
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.ANIMAL_BEDDING]
  },
  "Barley": { 
    category: FEEDSTOCK_CATEGORIES.GRAIN_FIELD, 
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.ANIMAL_BEDDING]
  },
  "Oats": { 
    category: FEEDSTOCK_CATEGORIES.GRAIN_FIELD, 
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.ANIMAL_BEDDING]
  },
  "Rice (R1)": { 
    category: FEEDSTOCK_CATEGORIES.GRAIN_FIELD, 
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.ANIMAL_BEDDING]
  },
  "Safflower": { 
    category: FEEDSTOCK_CATEGORIES.GRAIN_FIELD, 
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.ANIMAL_BEDDING]
  },
  "Sunflower": { 
    category: FEEDSTOCK_CATEGORIES.GRAIN_FIELD, 
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.ANIMAL_BEDDING]
  },
  "Cotton (F1)": { 
    category: FEEDSTOCK_CATEGORIES.GRAIN_FIELD, 
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.ANIMAL_BEDDING]
  },
  "Alfalfa & Mixtures": { 
    category: FEEDSTOCK_CATEGORIES.PASTURE_FORAGE, 
    processingSuitability: [PROCESSING_TYPES.ANAEROBIC_DIGESTION, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.ANIMAL_BEDDING]
  },
  "Unsp. Field & Seed": { 
    category: FEEDSTOCK_CATEGORIES.GRAIN_FIELD, 
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.ANIMAL_BEDDING]
  },
  "Bermuda Grass Seed": {
    category: FEEDSTOCK_CATEGORIES.PASTURE_FORAGE,
    processingSuitability: [PROCESSING_TYPES.ANAEROBIC_DIGESTION, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.ANIMAL_BEDDING]
  },
  "Eucalyptus": {
    category: FEEDSTOCK_CATEGORIES.TREE_VINE_NUT,
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION]
  },
  "Flowers, Nursery and Christmas Tree Farms": {
    category: FEEDSTOCK_CATEGORIES.VEGETABLE_SPECIALTY,
    processingSuitability: [PROCESSING_TYPES.COMPOSTING]
  },
  "Greenhouse": {
    category: FEEDSTOCK_CATEGORIES.VEGETABLE_SPECIALTY,
    processingSuitability: [PROCESSING_TYPES.COMPOSTING]
  },
  "Idle – Long Term": {
    category: FEEDSTOCK_CATEGORIES.FALLOW_IDLE,
    processingSuitability: [PROCESSING_TYPES.COMPOSTING]
  },
  "Idle – Short Term": {
    category: FEEDSTOCK_CATEGORIES.FALLOW_IDLE,
    processingSuitability: [PROCESSING_TYPES.COMPOSTING]
  },
  "Induced high water table native pasture": {
    category: FEEDSTOCK_CATEGORIES.PASTURE_FORAGE,
    processingSuitability: [PROCESSING_TYPES.ANAEROBIC_DIGESTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Mixed Pasture": {
    category: FEEDSTOCK_CATEGORIES.PASTURE_FORAGE,
    processingSuitability: [PROCESSING_TYPES.ANAEROBIC_DIGESTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Native Pasture": {
    category: FEEDSTOCK_CATEGORIES.PASTURE_FORAGE,
    processingSuitability: [PROCESSING_TYPES.ANAEROBIC_DIGESTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Strawberries": {
    category: FEEDSTOCK_CATEGORIES.VEGETABLE_SPECIALTY,
    processingSuitability: [PROCESSING_TYPES.ANAEROBIC_DIGESTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Turf Farms": {
    category: FEEDSTOCK_CATEGORIES.PASTURE_FORAGE,
    processingSuitability: [PROCESSING_TYPES.COMPOSTING]
  },
  "Unclassified Fallow": {
    category: FEEDSTOCK_CATEGORIES.FALLOW_IDLE,
    processingSuitability: [PROCESSING_TYPES.COMPOSTING]
  },
  "Young Perennials": {
    category: FEEDSTOCK_CATEGORIES.TREE_VINE_NUT,
    processingSuitability: [PROCESSING_TYPES.COMPOSTING]
  }
};

// Helper function to get feedstock characteristics by crop name
export const getFeedstockCharacteristics = (cropName: string) => {
  const standardizedName = CROP_NAME_MAPPING[cropName as keyof typeof CROP_NAME_MAPPING] || null;
  if (!standardizedName) return null;
  return FEEDSTOCK_CHARACTERISTICS[standardizedName] || null;
};
