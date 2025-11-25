/**
 * Tileset Registry - Single Source of Truth for all Mapbox tilesets
 * 
 * This file centralizes tileset configuration to decouple tileset IDs from application code.
 * When tilesets are updated, only the version identifier needs to change here.
 * 
 * Naming Convention: sustainasoft.cal-bioscape-{source}-{category}-{YYYY-MM}
 * 
 * Key Principle: Source layer names are STABLE across tileset versions.
 * Only the tileset ID changes with each update.
 */

export interface TilesetConfig {
  tilesetId: string;        // Full Mapbox tileset ID (e.g., sustainasoft.cal-bioscape-landiq-cropland-2024-10)
  sourceLayer: string;       // Stable source layer name within the tileset (no version suffix)
  displayName: string;       // Human-readable name for UI
  category: 'feedstock' | 'infrastructure' | 'transportation';
  version: string;           // Date-based version (YYYY-MM)
  accountType?: 'legacy' | 'default'; // Mapbox account type for token handling
}

/**
 * DEFAULT TILESET REGISTRY
 * 
 * Update the version identifier (YYYY-MM) when tilesets are regenerated.
 * Do NOT change source layer names unless absolutely necessary.
 */
export const DEFAULT_TILESET_REGISTRY: Record<string, TilesetConfig> = {
  // FEEDSTOCK LAYERS
  feedstock: {
    tilesetId: 'tylerhuntington222.cropland_landiq_2023', // TODO: Update to sustainasoft.cal-bioscape-landiq-cropland-YYYY-MM
    sourceLayer: 'cropland_land_iq_2023', // TODO: Backend should use stable name: cropland_land_iq
    displayName: 'Crop Residues',
    category: 'feedstock',
    version: 'current',
    accountType: 'legacy'
  },

  // INFRASTRUCTURE LAYERS - Processing Facilities
  anaerobicDigester: {
    tilesetId: 'tylerhuntington222.8lsxssgz', // TODO: Update to sustainasoft.cal-bioscape-epa-agstar-digesters-YYYY-MM
    sourceLayer: 'agstar_ad_pts-12cpd6', // TODO: Backend should use stable name: agstar_ad_pts
    displayName: 'Anaerobic Digesters',
    category: 'infrastructure',
    version: 'current',
    accountType: 'legacy'
  },
  
  biorefineries: {
    tilesetId: 'tylerhuntington222.current_biorefineries', // TODO: Update to sustainasoft.cal-bioscape-nrel-biorefineries-YYYY-MM
    sourceLayer: 'current_biorefineries',
    displayName: 'Ethanol Biorefineries',
    category: 'infrastructure',
    version: 'current',
    accountType: 'legacy'
  },
  
  safPlants: {
    tilesetId: 'tylerhuntington222.6x05ytem', // TODO: Update to sustainasoft.cal-bioscape-nrel-saf-plants-YYYY-MM
    sourceLayer: 'renewable_diesel_saf_plants-79er6d', // TODO: Backend should use stable name: renewable_diesel_saf_plants
    displayName: 'SAF Plants',
    category: 'infrastructure',
    version: 'current',
    accountType: 'legacy'
  },
  
  renewableDiesel: {
    tilesetId: 'tylerhuntington222.6x05ytem', // Same source as SAF - TODO: Update to sustainasoft.cal-bioscape-nrel-saf-plants-YYYY-MM
    sourceLayer: 'renewable_diesel_saf_plants-79er6d', // TODO: Backend should use stable name: renewable_diesel_saf_plants
    displayName: 'Renewable Diesel Plants',
    category: 'infrastructure',
    version: 'current',
    accountType: 'legacy'
  },
  
  mrf: {
    tilesetId: 'tylerhuntington222.7pptvxpd', // TODO: Update to sustainasoft.cal-bioscape-epa-mrf-YYYY-MM
    sourceLayer: 'us_mrf_pts-206gpg', // TODO: Backend should use stable name: us_mrf_pts
    displayName: 'Material Recovery Facilities',
    category: 'infrastructure',
    version: 'current',
    accountType: 'legacy'
  },
  
  cementPlants: {
    tilesetId: 'tylerhuntington222.4ffuy21y', // TODO: Update to sustainasoft.cal-bioscape-epa-cement-plants-YYYY-MM
    sourceLayer: 'cement_facility_location-aiusqe', // TODO: Backend should use stable name: cement_facility_location
    displayName: 'Cement Plants',
    category: 'infrastructure',
    version: 'current',
    accountType: 'legacy'
  },
  
  biodieselPlants: {
    tilesetId: 'tylerhuntington222.3eyv4hdj', // TODO: Update to sustainasoft.cal-bioscape-eia-biodiesel-YYYY-MM
    sourceLayer: 'biodiesel_plants-69v9v0', // TODO: Backend should use stable name: biodiesel_plants
    displayName: 'Biodiesel Plants',
    category: 'infrastructure',
    version: 'current',
    accountType: 'legacy'
  },
  
  landfillLfg: {
    tilesetId: 'tylerhuntington222.0pobnuqo', // TODO: Update to sustainasoft.cal-bioscape-epa-landfills-lfg-YYYY-MM
    sourceLayer: 'landfills_lmop_active_project-3cg3gl', // TODO: Backend should use stable name: landfills_lmop_active_project
    displayName: 'Landfills with LFG Projects',
    category: 'infrastructure',
    version: 'current',
    accountType: 'legacy'
  },
  
  wastewaterTreatment: {
    tilesetId: 'tylerhuntington222.ck7dox5nd07jj2rsxw4kvp5sy-3vnad', // TODO: Update to sustainasoft.cal-bioscape-epa-wastewater-YYYY-MM
    sourceLayer: 'us_wwt_pts',
    displayName: 'Wastewater Treatment Plants',
    category: 'infrastructure',
    version: 'current',
    accountType: 'legacy'
  },
  
  wasteToEnergy: {
    tilesetId: 'tylerhuntington222.W2E_points', // TODO: Update to sustainasoft.cal-bioscape-eia-waste-energy-YYYY-MM
    sourceLayer: 'W2E_points', // TODO: Backend should use stable name: waste_energy_points
    displayName: 'Waste to Energy Plants',
    category: 'infrastructure',
    version: 'current',
    accountType: 'legacy'
  },
  
  combustionPlants: {
    tilesetId: 'tylerhuntington222.COMB_points', // TODO: Update to sustainasoft.cal-bioscape-eia-combustion-YYYY-MM
    sourceLayer: 'COMB_points', // TODO: Backend should use stable name: combustion_points
    displayName: 'Combustion Plants',
    category: 'infrastructure',
    version: 'current',
    accountType: 'legacy'
  },
  
  districtEnergySystems: {
    tilesetId: 'tylerhuntington222.DES_CBG_centroids', // TODO: Update to sustainasoft.cal-bioscape-nrel-district-energy-YYYY-MM
    sourceLayer: 'DES_CBG_centroids', // TODO: Backend should use stable name: district_energy_systems
    displayName: 'District Energy Systems',
    category: 'infrastructure',
    version: 'current',
    accountType: 'legacy'
  },
  
  foodProcessors: {
    tilesetId: 'tylerhuntington222.4vo6hho9', // TODO: Update to sustainasoft.cal-bioscape-epa-food-processors-YYYY-MM
    sourceLayer: 'food_manufactureres_and_processors_epa',
    displayName: 'Food Processing Facilities',
    category: 'infrastructure',
    version: 'current',
    accountType: 'legacy'
  },

  tomatoProcessors: {
    tilesetId: 'sustainasoft.84ikw8pw', 
    sourceLayer: 'tomato-processor-facilities-3srkr8',
    displayName: 'Tomato Processing Facilities',
    category: 'infrastructure',
    version: 'current',
    accountType: 'default'
  },
  
  foodRetailers: {
    tilesetId: 'tylerhuntington222.69ucggu2', // TODO: Update to sustainasoft.cal-bioscape-epa-food-retailers-YYYY-MM
    sourceLayer: 'food_wholesalers_and_retailers_epa',
    displayName: 'Food Retailers',
    category: 'infrastructure',
    version: 'current',
    accountType: 'legacy'
  },
  
  powerPlants: {
    tilesetId: 'tylerhuntington222.c7dnms77', // TODO: Update to sustainasoft.cal-bioscape-eia-power-plants-YYYY-MM
    sourceLayer: 'power_plants',
    displayName: 'Power Plants',
    category: 'infrastructure',
    version: 'current',
    accountType: 'legacy'
  },
  
  foodBanks: {
    tilesetId: 'tylerhuntington222.dlijw1br', // TODO: Update to sustainasoft.cal-bioscape-epa-food-banks-YYYY-MM
    sourceLayer: 'food_banks_epa',
    displayName: 'Food Banks',
    category: 'infrastructure',
    version: 'current',
    accountType: 'legacy'
  },
  
  farmersMarkets: {
    tilesetId: 'tylerhuntington222.c12trp3g', // TODO: Update to sustainasoft.cal-bioscape-usda-farmers-markets-YYYY-MM
    sourceLayer: 'farmers_markets_usda',
    displayName: 'Farmers Markets',
    category: 'infrastructure',
    version: 'current',
    accountType: 'legacy'
  },

  // TRANSPORTATION LAYERS
  railLines: {
    tilesetId: 'tylerhuntington222.b0rylacz', // TODO: Update to sustainasoft.cal-bioscape-ftot-raillines-YYYY-MM
    sourceLayer: 'us_rail_lines_ftot-80b406', // TODO: Backend should use stable name: us_rail_lines_ftot
    displayName: 'Rail Lines',
    category: 'transportation',
    version: 'current',
    accountType: 'legacy'
  },
  
  freightTerminals: {
    tilesetId: 'tylerhuntington222.6m4h969q', // TODO: Update to sustainasoft.cal-bioscape-ftot-freight-terminals-YYYY-MM
    sourceLayer: 'us_freight_terminals-d7i106', // TODO: Backend should use stable name: us_freight_terminals
    displayName: 'Freight Terminals',
    category: 'transportation',
    version: 'current',
    accountType: 'legacy'
  },
  
  freightRoutes: {
    tilesetId: 'tylerhuntington222.5fm8q5sj', // TODO: Update to sustainasoft.cal-bioscape-ftot-freight-routes-YYYY-MM
    sourceLayer: 'us_freight_routes',
    displayName: 'Freight Routes',
    category: 'transportation',
    version: 'current',
    accountType: 'legacy'
  },
  
  petroleumPipelines: {
    tilesetId: 'tylerhuntington222.b4obgo1f', // TODO: Update to sustainasoft.cal-bioscape-ftot-petroleum-pipelines-YYYY-MM
    sourceLayer: 'us_petrol_prod_pipelines_ftot-4f7wgo', // TODO: Backend should use stable name: us_petrol_prod_pipelines_ftot
    displayName: 'Petroleum Pipelines',
    category: 'transportation',
    version: 'current',
    accountType: 'legacy'
  },
  
  crudeOilPipelines: {
    tilesetId: 'tylerhuntington222.9llifnsy', // TODO: Update to sustainasoft.cal-bioscape-ftot-crude-pipelines-YYYY-MM
    sourceLayer: 'us_crude_pipeline_ftot-bhu6j4', // TODO: Backend should use stable name: us_crude_pipeline_ftot
    displayName: 'Crude Oil Pipelines',
    category: 'transportation',
    version: 'current',
    accountType: 'legacy'
  },
  
  naturalGasPipelines: {
    tilesetId: 'tylerhuntington222.9iavmtjd', // TODO: Update to sustainasoft.cal-bioscape-hifld-natgas-pipelines-YYYY-MM
    sourceLayer: 'hifld_us_natural_gas_pipeline-4prihp', // TODO: Backend should use stable name: hifld_us_natural_gas_pipeline
    displayName: 'Natural Gas Pipelines',
    category: 'transportation',
    version: 'current',
    accountType: 'legacy'
  }
};

/**
 * ENVIRONMENT VARIABLE OVERRIDES
 * 
 * Optional: Override tileset IDs via environment variables for testing different versions
 * in different environments (dev, staging, prod) without code changes.
 * 
 * Usage in .env.local:
 * NEXT_PUBLIC_TILESET_FEEDSTOCK=sustainasoft.cal-bioscape-landiq-cropland-2025-01-test
 */
const ENV_OVERRIDES: Record<string, string | undefined> = {
  feedstock: process.env.NEXT_PUBLIC_TILESET_FEEDSTOCK,
  wastewaterTreatment: process.env.NEXT_PUBLIC_TILESET_WASTEWATER,
  // Add more overrides as needed for testing
};

/**
 * FINAL TILESET REGISTRY
 * 
 * This is the registry that should be imported and used throughout the application.
 * It applies environment variable overrides if they exist, otherwise uses defaults.
 */
export const TILESET_REGISTRY: Record<string, TilesetConfig> = Object.keys(DEFAULT_TILESET_REGISTRY).reduce(
  (registry, key) => {
    const config = DEFAULT_TILESET_REGISTRY[key];
    const envOverride = ENV_OVERRIDES[key];
    
    registry[key] = {
      ...config,
      tilesetId: envOverride || config.tilesetId
    };
    
    return registry;
  },
  {} as Record<string, TilesetConfig>
);

/**
 * LEGACY SUPPORT - Deprecated constants for backward compatibility
 * 
 * @deprecated Use TILESET_REGISTRY instead
 * These will be removed in a future version
 */
export const FEEDSTOCK_TILESET_ID = TILESET_REGISTRY.feedstock.tilesetId;

export const INFRASTRUCTURE_LAYERS = {
  power_plants: {
    tilesetId: TILESET_REGISTRY.powerPlants.tilesetId,
    sourceLayer: TILESET_REGISTRY.powerPlants.sourceLayer,
  },
  food_banks: {
    tilesetId: TILESET_REGISTRY.foodBanks.tilesetId,
    sourceLayer: TILESET_REGISTRY.foodBanks.sourceLayer,
  },
  farmers_markets: {
    tilesetId: TILESET_REGISTRY.farmersMarkets.tilesetId,
    sourceLayer: TILESET_REGISTRY.farmersMarkets.sourceLayer,
  },
};
