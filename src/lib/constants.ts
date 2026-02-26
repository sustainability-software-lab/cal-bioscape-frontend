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
  "Miscellaneous Grasses": "Bermuda Grass Seed"
};

import { getResidueData, ResidueFactors } from './residue-data';

// Helper functions for crop residue calculations
// Returns an array of residue factors for the given crop (one per residue type)
export const getCropResidueFactors = (cropName: string): ResidueFactors[] | null => {
  // Get the standardized crop name from mapping
  const standardizedName = CROP_NAME_MAPPING[cropName as keyof typeof CROP_NAME_MAPPING] || null;
  
  if (!standardizedName) {
    return null;
  }
  
  // Try to get data from the dynamic residue service (returns ResidueFactors[])
  const dynamicData = getResidueData(standardizedName);
  
  if (dynamicData && dynamicData.length > 0) {
    // Ensure each factor has a category and residueType
    return dynamicData.map(factor => ({
      ...factor,
      category: factor.category || 'Crop Residue',
      residueType: factor.residueType || 'Residue'
    }));
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

// Feedstock Type Categories
export const FEEDSTOCK_CATEGORIES = {
  GRAIN_RESIDUES: 'Grain Crop Residues',
  VEGETABLE_RESIDUES: 'Vegetable Crop Residues',
  FRUIT_RESIDUES: 'Fruit Crop Residues',
  NUT_RESIDUES: 'Nut Crop Residues',
  FIBER_RESIDUES: 'Fiber Crop Residues',
  FORAGE_RESIDUES: 'Forage/Hay Residues'
} as const;

// Moisture Content Classifications
export const MOISTURE_CONTENT_LEVELS = {
  LOW: 'Low (<15%)',
  MEDIUM: 'Medium (15-30%)',
  HIGH: 'High (>30%)'
} as const;

// Energy Content Classifications (based on typical calorific values)
// Low: <12 MJ/kg, Medium: 12-17 MJ/kg, High: >17 MJ/kg
export const ENERGY_CONTENT_LEVELS = {
  LOW: 'Low (<12 MJ/kg)',
  MEDIUM: 'Medium (12-17 MJ/kg)',
  HIGH: 'High (>17 MJ/kg)'
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
export const FEEDSTOCK_CHARACTERISTICS: {
  [key: string]: {
    category: string;
    moistureLevel: string;
    energyLevel: string;
    processingSuitability: string[];
  }
} = {
  // ORCHARD AND VINEYARD RESIDUES (Prunings)
  "Apples": { 
    category: FEEDSTOCK_CATEGORIES.FRUIT_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.MEDIUM,
    energyLevel: ENERGY_CONTENT_LEVELS.MEDIUM,
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Apricots": { 
    category: FEEDSTOCK_CATEGORIES.FRUIT_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.MEDIUM,
    energyLevel: ENERGY_CONTENT_LEVELS.MEDIUM,
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Avocados": { 
    category: FEEDSTOCK_CATEGORIES.FRUIT_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.MEDIUM,
    energyLevel: ENERGY_CONTENT_LEVELS.MEDIUM,
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Cherries": { 
    category: FEEDSTOCK_CATEGORIES.FRUIT_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.MEDIUM,
    energyLevel: ENERGY_CONTENT_LEVELS.MEDIUM,
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Dates": { 
    category: FEEDSTOCK_CATEGORIES.FRUIT_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.MEDIUM,
    energyLevel: ENERGY_CONTENT_LEVELS.MEDIUM,
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Figs": { 
    category: FEEDSTOCK_CATEGORIES.FRUIT_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.MEDIUM,
    energyLevel: ENERGY_CONTENT_LEVELS.MEDIUM,
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Grapes": { 
    category: FEEDSTOCK_CATEGORIES.FRUIT_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.MEDIUM,
    energyLevel: ENERGY_CONTENT_LEVELS.MEDIUM,
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Kiwifruit": { 
    category: FEEDSTOCK_CATEGORIES.FRUIT_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.MEDIUM,
    energyLevel: ENERGY_CONTENT_LEVELS.MEDIUM,
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Nectarines": { 
    category: FEEDSTOCK_CATEGORIES.FRUIT_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.MEDIUM,
    energyLevel: ENERGY_CONTENT_LEVELS.MEDIUM,
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Olives": { 
    category: FEEDSTOCK_CATEGORIES.FRUIT_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.MEDIUM,
    energyLevel: ENERGY_CONTENT_LEVELS.MEDIUM,
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Peaches": { 
    category: FEEDSTOCK_CATEGORIES.FRUIT_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.MEDIUM,
    energyLevel: ENERGY_CONTENT_LEVELS.MEDIUM,
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Pears": { 
    category: FEEDSTOCK_CATEGORIES.FRUIT_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.MEDIUM,
    energyLevel: ENERGY_CONTENT_LEVELS.MEDIUM,
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Persimmons": { 
    category: FEEDSTOCK_CATEGORIES.FRUIT_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.MEDIUM,
    energyLevel: ENERGY_CONTENT_LEVELS.MEDIUM,
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Plums & Prunes": { 
    category: FEEDSTOCK_CATEGORIES.FRUIT_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.MEDIUM,
    energyLevel: ENERGY_CONTENT_LEVELS.MEDIUM,
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Pomegranates": { 
    category: FEEDSTOCK_CATEGORIES.FRUIT_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.MEDIUM,
    energyLevel: ENERGY_CONTENT_LEVELS.MEDIUM,
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.COMPOSTING]
  },
  "All Citrus": { 
    category: FEEDSTOCK_CATEGORIES.FRUIT_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.MEDIUM,
    energyLevel: ENERGY_CONTENT_LEVELS.MEDIUM,
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Almonds": { 
    category: FEEDSTOCK_CATEGORIES.NUT_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.MEDIUM,
    energyLevel: ENERGY_CONTENT_LEVELS.HIGH,
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.ANIMAL_BEDDING]
  },
  "Pecans": { 
    category: FEEDSTOCK_CATEGORIES.NUT_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.MEDIUM,
    energyLevel: ENERGY_CONTENT_LEVELS.HIGH,
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.ANIMAL_BEDDING]
  },
  "Pistachios": { 
    category: FEEDSTOCK_CATEGORIES.NUT_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.MEDIUM,
    energyLevel: ENERGY_CONTENT_LEVELS.HIGH,
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.ANIMAL_BEDDING]
  },
  "Walnuts": { 
    category: FEEDSTOCK_CATEGORIES.NUT_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.MEDIUM,
    energyLevel: ENERGY_CONTENT_LEVELS.HIGH,
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.ANIMAL_BEDDING]
  },
  "Fruits & Nuts unsp.": { 
    category: FEEDSTOCK_CATEGORIES.FRUIT_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.MEDIUM,
    energyLevel: ENERGY_CONTENT_LEVELS.MEDIUM,
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.COMPOSTING]
  },
  
  // ROW CROP RESIDUES
  "Artichokes": { 
    category: FEEDSTOCK_CATEGORIES.VEGETABLE_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.HIGH,
    energyLevel: ENERGY_CONTENT_LEVELS.LOW,
    processingSuitability: [PROCESSING_TYPES.ANAEROBIC_DIGESTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Asparagus": { 
    category: FEEDSTOCK_CATEGORIES.VEGETABLE_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.HIGH,
    energyLevel: ENERGY_CONTENT_LEVELS.LOW,
    processingSuitability: [PROCESSING_TYPES.ANAEROBIC_DIGESTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Green Lima Beans": { 
    category: FEEDSTOCK_CATEGORIES.VEGETABLE_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.HIGH,
    energyLevel: ENERGY_CONTENT_LEVELS.LOW,
    processingSuitability: [PROCESSING_TYPES.ANAEROBIC_DIGESTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Berries": { 
    category: FEEDSTOCK_CATEGORIES.FRUIT_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.MEDIUM,
    energyLevel: ENERGY_CONTENT_LEVELS.MEDIUM,
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Snap Beans": { 
    category: FEEDSTOCK_CATEGORIES.VEGETABLE_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.HIGH,
    energyLevel: ENERGY_CONTENT_LEVELS.LOW,
    processingSuitability: [PROCESSING_TYPES.ANAEROBIC_DIGESTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Broccoli": { 
    category: FEEDSTOCK_CATEGORIES.VEGETABLE_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.HIGH,
    energyLevel: ENERGY_CONTENT_LEVELS.LOW,
    processingSuitability: [PROCESSING_TYPES.ANAEROBIC_DIGESTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Cabbage": { 
    category: FEEDSTOCK_CATEGORIES.VEGETABLE_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.HIGH,
    energyLevel: ENERGY_CONTENT_LEVELS.LOW,
    processingSuitability: [PROCESSING_TYPES.ANAEROBIC_DIGESTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Cantaloupe Melons": { 
    category: FEEDSTOCK_CATEGORIES.FRUIT_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.HIGH,
    energyLevel: ENERGY_CONTENT_LEVELS.LOW,
    processingSuitability: [PROCESSING_TYPES.ANAEROBIC_DIGESTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Carrots": { 
    category: FEEDSTOCK_CATEGORIES.VEGETABLE_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.HIGH,
    energyLevel: ENERGY_CONTENT_LEVELS.LOW,
    processingSuitability: [PROCESSING_TYPES.ANAEROBIC_DIGESTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Cauliflower": { 
    category: FEEDSTOCK_CATEGORIES.VEGETABLE_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.HIGH,
    energyLevel: ENERGY_CONTENT_LEVELS.LOW,
    processingSuitability: [PROCESSING_TYPES.ANAEROBIC_DIGESTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Celery": { 
    category: FEEDSTOCK_CATEGORIES.VEGETABLE_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.HIGH,
    energyLevel: ENERGY_CONTENT_LEVELS.LOW,
    processingSuitability: [PROCESSING_TYPES.ANAEROBIC_DIGESTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Cucumbers": { 
    category: FEEDSTOCK_CATEGORIES.VEGETABLE_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.HIGH,
    energyLevel: ENERGY_CONTENT_LEVELS.LOW,
    processingSuitability: [PROCESSING_TYPES.ANAEROBIC_DIGESTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Garlic": { 
    category: FEEDSTOCK_CATEGORIES.VEGETABLE_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.HIGH,
    energyLevel: ENERGY_CONTENT_LEVELS.LOW,
    processingSuitability: [PROCESSING_TYPES.ANAEROBIC_DIGESTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Combined Melons": { 
    category: FEEDSTOCK_CATEGORIES.FRUIT_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.HIGH,
    energyLevel: ENERGY_CONTENT_LEVELS.LOW,
    processingSuitability: [PROCESSING_TYPES.ANAEROBIC_DIGESTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Lettuce and Romaine": { 
    category: FEEDSTOCK_CATEGORIES.VEGETABLE_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.HIGH,
    energyLevel: ENERGY_CONTENT_LEVELS.LOW,
    processingSuitability: [PROCESSING_TYPES.ANAEROBIC_DIGESTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Dry Onions": { 
    category: FEEDSTOCK_CATEGORIES.VEGETABLE_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.HIGH,
    energyLevel: ENERGY_CONTENT_LEVELS.LOW,
    processingSuitability: [PROCESSING_TYPES.ANAEROBIC_DIGESTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Green Onions": { 
    category: FEEDSTOCK_CATEGORIES.VEGETABLE_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.HIGH,
    energyLevel: ENERGY_CONTENT_LEVELS.LOW,
    processingSuitability: [PROCESSING_TYPES.ANAEROBIC_DIGESTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Hot Peppers": { 
    category: FEEDSTOCK_CATEGORIES.VEGETABLE_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.HIGH,
    energyLevel: ENERGY_CONTENT_LEVELS.LOW,
    processingSuitability: [PROCESSING_TYPES.ANAEROBIC_DIGESTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Sweet Peppers": { 
    category: FEEDSTOCK_CATEGORIES.VEGETABLE_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.HIGH,
    energyLevel: ENERGY_CONTENT_LEVELS.LOW,
    processingSuitability: [PROCESSING_TYPES.ANAEROBIC_DIGESTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Spices & herbs": { 
    category: FEEDSTOCK_CATEGORIES.VEGETABLE_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.HIGH,
    energyLevel: ENERGY_CONTENT_LEVELS.LOW,
    processingSuitability: [PROCESSING_TYPES.COMPOSTING]
  },
  "Spinach": { 
    category: FEEDSTOCK_CATEGORIES.VEGETABLE_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.HIGH,
    energyLevel: ENERGY_CONTENT_LEVELS.LOW,
    processingSuitability: [PROCESSING_TYPES.ANAEROBIC_DIGESTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Squash": { 
    category: FEEDSTOCK_CATEGORIES.VEGETABLE_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.HIGH,
    energyLevel: ENERGY_CONTENT_LEVELS.LOW,
    processingSuitability: [PROCESSING_TYPES.ANAEROBIC_DIGESTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Sweet Corn": { 
    category: FEEDSTOCK_CATEGORIES.GRAIN_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.LOW,
    energyLevel: ENERGY_CONTENT_LEVELS.HIGH,
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.ANIMAL_BEDDING]
  },
  "Tomatoes": { 
    category: FEEDSTOCK_CATEGORIES.VEGETABLE_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.HIGH,
    energyLevel: ENERGY_CONTENT_LEVELS.LOW,
    processingSuitability: [PROCESSING_TYPES.ANAEROBIC_DIGESTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Unsp. vegetables": { 
    category: FEEDSTOCK_CATEGORIES.VEGETABLE_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.HIGH,
    energyLevel: ENERGY_CONTENT_LEVELS.LOW,
    processingSuitability: [PROCESSING_TYPES.ANAEROBIC_DIGESTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Potatoes": { 
    category: FEEDSTOCK_CATEGORIES.VEGETABLE_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.HIGH,
    energyLevel: ENERGY_CONTENT_LEVELS.LOW,
    processingSuitability: [PROCESSING_TYPES.ANAEROBIC_DIGESTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Sweet Potatos": { 
    category: FEEDSTOCK_CATEGORIES.VEGETABLE_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.HIGH,
    energyLevel: ENERGY_CONTENT_LEVELS.LOW,
    processingSuitability: [PROCESSING_TYPES.ANAEROBIC_DIGESTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Sugar Beets": { 
    category: FEEDSTOCK_CATEGORIES.VEGETABLE_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.HIGH,
    energyLevel: ENERGY_CONTENT_LEVELS.LOW,
    processingSuitability: [PROCESSING_TYPES.ANAEROBIC_DIGESTION, PROCESSING_TYPES.COMPOSTING]
  },
  
  // FIELD CROP RESIDUES
  "Corn": { 
    category: FEEDSTOCK_CATEGORIES.GRAIN_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.LOW,
    energyLevel: ENERGY_CONTENT_LEVELS.HIGH,
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.ANIMAL_BEDDING]
  },
  "Sorghum": { 
    category: FEEDSTOCK_CATEGORIES.GRAIN_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.LOW,
    energyLevel: ENERGY_CONTENT_LEVELS.HIGH,
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.ANIMAL_BEDDING]
  },
  "Wheat": { 
    category: FEEDSTOCK_CATEGORIES.GRAIN_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.LOW,
    energyLevel: ENERGY_CONTENT_LEVELS.HIGH,
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.ANIMAL_BEDDING]
  },
  "Barley": { 
    category: FEEDSTOCK_CATEGORIES.GRAIN_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.LOW,
    energyLevel: ENERGY_CONTENT_LEVELS.HIGH,
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.ANIMAL_BEDDING]
  },
  "Oats": { 
    category: FEEDSTOCK_CATEGORIES.GRAIN_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.LOW,
    energyLevel: ENERGY_CONTENT_LEVELS.HIGH,
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.ANIMAL_BEDDING]
  },
  "Rice": { 
    category: FEEDSTOCK_CATEGORIES.GRAIN_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.LOW,
    energyLevel: ENERGY_CONTENT_LEVELS.MEDIUM,
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.ANIMAL_BEDDING]
  },
  "Safflower": { 
    category: FEEDSTOCK_CATEGORIES.GRAIN_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.LOW,
    energyLevel: ENERGY_CONTENT_LEVELS.HIGH,
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.ANIMAL_BEDDING]
  },
  "Sunflower": { 
    category: FEEDSTOCK_CATEGORIES.GRAIN_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.LOW,
    energyLevel: ENERGY_CONTENT_LEVELS.HIGH,
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.ANIMAL_BEDDING]
  },
  "Cotton": { 
    category: FEEDSTOCK_CATEGORIES.FIBER_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.LOW,
    energyLevel: ENERGY_CONTENT_LEVELS.MEDIUM,
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.ANIMAL_BEDDING]
  },
  "Beans": { 
    category: FEEDSTOCK_CATEGORIES.GRAIN_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.HIGH,
    energyLevel: ENERGY_CONTENT_LEVELS.LOW,
    processingSuitability: [PROCESSING_TYPES.ANAEROBIC_DIGESTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Lima Beans": { 
    category: FEEDSTOCK_CATEGORIES.GRAIN_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.HIGH,
    energyLevel: ENERGY_CONTENT_LEVELS.LOW,
    processingSuitability: [PROCESSING_TYPES.ANAEROBIC_DIGESTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Cowpeas & South. Peas": { 
    category: FEEDSTOCK_CATEGORIES.GRAIN_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.HIGH,
    energyLevel: ENERGY_CONTENT_LEVELS.LOW,
    processingSuitability: [PROCESSING_TYPES.ANAEROBIC_DIGESTION, PROCESSING_TYPES.COMPOSTING]
  },
  "Soybeans": { 
    category: FEEDSTOCK_CATEGORIES.GRAIN_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.LOW,
    energyLevel: ENERGY_CONTENT_LEVELS.HIGH,
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.ANIMAL_BEDDING]
  },
  "Rye": { 
    category: FEEDSTOCK_CATEGORIES.GRAIN_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.LOW,
    energyLevel: ENERGY_CONTENT_LEVELS.HIGH,
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.ANIMAL_BEDDING]
  },
  "Triticale": { 
    category: FEEDSTOCK_CATEGORIES.GRAIN_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.LOW,
    energyLevel: ENERGY_CONTENT_LEVELS.HIGH,
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.ANIMAL_BEDDING]
  },
  "Alfalfa": { 
    category: FEEDSTOCK_CATEGORIES.FORAGE_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.LOW,
    energyLevel: ENERGY_CONTENT_LEVELS.MEDIUM,
    processingSuitability: [PROCESSING_TYPES.ANAEROBIC_DIGESTION, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.ANIMAL_BEDDING]
  },
  "Bermuda Grass Seed": { 
    category: FEEDSTOCK_CATEGORIES.FORAGE_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.MEDIUM,
    energyLevel: ENERGY_CONTENT_LEVELS.MEDIUM,
    processingSuitability: [PROCESSING_TYPES.ANAEROBIC_DIGESTION, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.ANIMAL_BEDDING]
  },
  "Unsp. Field & Seed": { 
    category: FEEDSTOCK_CATEGORIES.GRAIN_RESIDUES, 
    moistureLevel: MOISTURE_CONTENT_LEVELS.LOW,
    energyLevel: ENERGY_CONTENT_LEVELS.MEDIUM,
    processingSuitability: [PROCESSING_TYPES.PYROLYSIS, PROCESSING_TYPES.COMBUSTION, PROCESSING_TYPES.ANIMAL_BEDDING]
  }
};

// Helper function to get feedstock characteristics by crop name
export const getFeedstockCharacteristics = (cropName: string) => {
  // Get the standardized crop name from mapping
  const standardizedName = CROP_NAME_MAPPING[cropName as keyof typeof CROP_NAME_MAPPING] || null;
  
  if (!standardizedName) {
    return null;
  }
  
  // Get static characteristics as a base
  const staticCharacteristics = FEEDSTOCK_CHARACTERISTICS[standardizedName] || null;
  
  // Try to get dynamic data to override moisture level
  // dynamicData is now ResidueFactors[]
  const dynamicData = getResidueData(standardizedName);
  
  if (dynamicData && dynamicData.length > 0) {
    // Collect all moisture levels present in the residue streams
    const moistureLevels = new Set<string>();
    
    dynamicData.forEach(factor => {
      const moisture = factor.moistureContent; // 0 to 1
      if (moisture < 0.15) {
        moistureLevels.add(MOISTURE_CONTENT_LEVELS.LOW);
      } else if (moisture >= 0.15 && moisture <= 0.30) {
        moistureLevels.add(MOISTURE_CONTENT_LEVELS.MEDIUM);
      } else {
        moistureLevels.add(MOISTURE_CONTENT_LEVELS.HIGH);
      }
    });
    
    const dynamicMoistureLevels = Array.from(moistureLevels);
    
    // If we have static characteristics, override moisture level with array
    // Note: Consumers need to be updated to handle moistureLevels array instead of single string
    if (staticCharacteristics) {
      return {
        ...staticCharacteristics,
        moistureLevels: dynamicMoistureLevels,
        // Keep single level for backward compat (use primary/first or calculate avg?)
        // Let's use the first one as fallback, but rely on 'moistureLevels' for filtering
        moistureLevel: dynamicMoistureLevels[0] || MOISTURE_CONTENT_LEVELS.MEDIUM
      };
    }
    
    return null; 
  }
  
  // Fallback to static if dynamic data not yet loaded
  if (staticCharacteristics) {
    return {
      ...staticCharacteristics,
      moistureLevels: [staticCharacteristics.moistureLevel] // Wrap in array for consistency
    };
  }
  
  return null;
};
