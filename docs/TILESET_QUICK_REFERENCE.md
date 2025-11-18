# Tileset Quick Reference Guide

Quick lookup table for all tilesets in the Cal-Bioscape Siting Tool.

**Version**: 1.2 | **Last Updated**: 2024-10-16

## Naming Convention

All tilesets use the standardized format: `sustainasoft.cal-bioscape-{source}-{category}-{YYYY-MM}`

**Key Principle**: Source layer names are stable across versions (no version suffixes). Only the tileset ID changes when data is updated.

---

## Feedstock Data

| Layer Name | Tileset ID | Source Layer | Geometry | Key Fields |
|------------|-----------|--------------|----------|------------|
| Crop Residues | `sustainasoft.cal-bioscape-landiq-cropland-2024-10` | `cropland_land_iq` | Polygon | `main_crop_name`, `acres`, `county`, `residue_wet_tons`*, `moisture_content`*, `ash_content`*, `carbon_pct`*, `energy_content_mj_kg`* + [19 more composition fields] |

\* Fields to be added by backend during tileset generation

**Note**: See TILESET_SPECIFICATIONS.md for complete list of 23 new attributes to be added (Tier 1-3 analysis fields)

---

## Infrastructure Layers

| Layer Name | Tileset ID | Source Layer | Geometry | Primary Key Fields |
|------------|-----------|--------------|----------|-------------------|
| Anaerobic Digesters | `sustainasoft.cal-bioscape-epa-agstar-digesters-2024-10` | `agstar_ad_pts` | Point | `ProjectName`, `City`, `State`, `BiogasGenerationEstimate_cu_ft_day` |
| Biorefineries | `sustainasoft.cal-bioscape-nrel-biorefineries-2024-10` | `current_biorefineries` | Point | `Company`, `City`, `State`, `capacity_gal_yr`, `feedstock` |
| SAF Plants | `sustainasoft.cal-bioscape-nrel-saf-plants-2024-10` | `renewable_diesel_saf_plants` | Point | `company`, `city`, `state`, `capacity_mmg_per_y`, `products` (contains "SAF") |
| Renewable Diesel | `sustainasoft.cal-bioscape-nrel-saf-plants-2024-10` | `renewable_diesel_saf_plants` | Point | `company`, `city`, `state`, `capacity_mmg_per_y`, `products` (contains "RD") |
| MRF | `sustainasoft.cal-bioscape-epa-mrf-2024-10` | `us_mrf_pts` | Point | `PLANT_NAME`, `PLANT_CITY`, `PLANT_STATE`, `TPD`, `STATUS` |
| Cement Plants | `sustainasoft.cal-bioscape-epa-cement-plants-2024-10` | `cement_facility_location` | Point | `facility_name`, `city`, `state`, `capacity` |
| Biodiesel Plants | `sustainasoft.cal-bioscape-eia-biodiesel-2024-10` | `biodiesel_plants` | Point | `Plant_Name`, `City`, `State`, `capacity_mmgy`, `feedstock` |
| Landfills (LFG) | `sustainasoft.cal-bioscape-epa-landfills-lfg-2024-10` | `landfills_lmop_active_project` | Point | `Landfill_Name`, `State`, `Waste_in_Place_tons`, `Gas_Collected` |
| Wastewater Treatment | `sustainasoft.cal-bioscape-epa-wastewater-2024-10` | `us_wwt_pts` | Point | `FACILITY_NAME`, `CITY`, `STATE`, `flow_mgd` |
| Waste to Energy | `sustainasoft.cal-bioscape-eia-waste-energy-2024-10` | `waste_energy_points` | Point | TBD - needs field mapping |
| Combustion Plants | `sustainasoft.cal-bioscape-eia-combustion-2024-10` | `combustion_points` | Point | TBD - needs field mapping |
| District Energy | `sustainasoft.cal-bioscape-nrel-district-energy-2024-10` | `district_energy_systems` | Point | TBD - needs field mapping |
| Food Processors | `sustainasoft.cal-bioscape-epa-food-processors-2024-10` | `food_manufactureres_and_processors_epa` | Point | `Name`, `City`, `State`, `ExcessFood`, `NAICS_Code` |
| Food Retailers | `sustainasoft.cal-bioscape-epa-food-retailers-2024-10` | `food_wholesalers_and_retailers_epa` | Point | `Name`, `City`, `State`, `ExcessFood_TonYear_LowEst`, `NAICS_Code` |
| Power Plants | `sustainasoft.cal-bioscape-eia-power-plants-2024-10` | `power_plants` | Point | `Plant_Name`, `City`, `State`, `Total_MW`, `Technology` |
| Food Banks | `sustainasoft.cal-bioscape-epa-food-banks-2024-10` | `food_banks_epa` | Point | `NAME`, `CITY`, `STATE` |
| Farmers' Markets | `sustainasoft.cal-bioscape-usda-farmers-markets-2024-10` | `farmers_markets_usda` | Point | `marketname`, `city`, `state` |

---

## Transportation Layers

| Layer Name | Tileset ID | Source Layer | Geometry | Primary Key Fields |
|------------|-----------|--------------|----------|-------------------|
| Rail Lines | `sustainasoft.cal-bioscape-ftot-raillines-2024-10` | `us_rail_lines_ftot` | Line | `FROWNER`, `RROWNER1`, `MILES`, `TRACKS` |
| Freight Terminals | `sustainasoft.cal-bioscape-ftot-freight-terminals-2024-10` | `us_freight_terminals` | Point | TBD - needs field mapping |
| Freight Routes | `sustainasoft.cal-bioscape-ftot-freight-routes-2024-10` | `us_freight_routes` | Line | TBD - needs field mapping |
| Petroleum Pipelines | `sustainasoft.cal-bioscape-ftot-petroleum-pipelines-2024-10` | `us_petrol_prod_pipelines_ftot` | Line | TBD - needs field mapping |
| Crude Oil Pipelines | `sustainasoft.cal-bioscape-ftot-crude-pipelines-2024-10` | `us_crude_pipeline_ftot` | Line | TBD - needs field mapping |
| Natural Gas Pipelines | `sustainasoft.cal-bioscape-hifld-natgas-pipelines-2024-10` | `hifld_us_natural_gas_pipeline` | Line | TBD - needs field mapping |

---

## Field Naming Conventions

### Case Sensitivity
- **snake_case**: `main_crop_name`, `capacity_gal_yr`
- **PascalCase**: `ProjectName`, `BiogasGenerationEstimate_cu_ft_day`
- **UPPER_CASE**: `PLANT_NAME`, `FACILITY_NAME`, `TPD`
- **Mixed**: Some fields use mixed conventions (e.g., `ExcessFo_1`)

**Important**: Field names must match exactly - case, spaces, and special characters all matter!

### Common Field Patterns

| Purpose | Common Field Names |
|---------|-------------------|
| Location | `city`, `City`, `CITY`, `state`, `State`, `STATE` |
| Coordinates | `lat`, `lon`, `latitude`, `longitude`, `LATITUDE`, `LONGITUDE` |
| Identification | `name`, `Name`, `NAME`, `facility_name`, `Plant_Name` |
| Capacity | `capacity`, `capacity_gal_yr`, `capacity_mmgy`, `Total_MW` |
| Status | `status`, `Status`, `STATUS` |

---

## Coordinate Requirements

All tilesets must use:
- **Coordinate System**: WGS84 (EPSG:4326)
- **Longitude**: -180 to 180
- **Latitude**: -90 to 90

---

## Priority Action Items

### Immediate (High Priority)

1. **LandIQ Feedstock Tileset** - Add calculated residue and chemical composition attributes:
   
   **Tier 1A - Residue Quantity (HIGHEST PRIORITY):**
   - `residue_wet_tons` (Float) - Calculated from acres × factor
   - `residue_dry_tons` (Float) - Calculated from acres × factor
   - `residue_type` (String) - From residue tables
   - `moisture_content` (Float, 0-1) - **MOST CRITICAL** for filtering
   
   **Tier 1B - Proximate Analysis (HIGHEST PRIORITY):**
   - `ash_content` (Float, %) - From biomass databases
   - `volatile_solids` (Float, %) - From biomass databases
   - `fixed_carbon` (Float, %) - From biomass databases
   
   **Tier 2 - Ultimate & Compositional (HIGH PRIORITY):**
   - `carbon_pct`, `hydrogen_pct`, `nitrogen_pct`, `oxygen_pct`, `sulfur_pct` (Float, %)
   - `glucose_pct`, `xylose_pct`, `lignin_pct` (Float, %)
   - `energy_content_mj_kg` (Float, MJ/kg)
   
   **Tier 3 - Additional Elements (OPTIONAL - if data available):**
   - `phosphorus_pct`, `potassium_pct`, `silica_pct` (Float, %)
   
   See [CROP_RESIDUE_FACTORS.md](./CROP_RESIDUE_FACTORS.md) for calculation details and data sources.

### Future (When Source Data Updated)

2. **Complete Field Mappings** - Document exact field names for layers marked "TBD":
   - Waste to Energy Plants
   - Combustion Plants
   - District Energy Systems
   - Freight Terminals
   - Freight Routes
   - All Pipeline layers

3. **Validate All Layers** - Ensure all existing tilesets have:
   - Correct field names (case-sensitive)
   - Valid geometries
   - Complete attribute data
   - Proper coordinate system

---

## Display Colors

Quick reference for layer colors (for visual consistency):

| Layer Type | Color | Hex Code |
|------------|-------|----------|
| Anaerobic Digesters | Saddle Brown | #8B4513 |
| Biorefineries | Medium Purple | #9370DB |
| SAF Plants | Dodger Blue | #1E90FF |
| Renewable Diesel | Dark Orange | #FF8C00 |
| MRF | Light Sea Green | #20B2AA |
| Cement Plants | Slate Gray | #708090 |
| Biodiesel | Forest Green | #228B22 |
| Landfills (LFG) | Purple | #800080 |
| Wastewater | Turquoise | #00CED1 |
| Waste to Energy | Tomato | #FF6347 |
| Combustion Plants | FireBrick | #B22222 |
| District Energy | LimeGreen | #32CD32 |
| Food Processors | Gold | #FFD700 |
| Food Retailers | HotPink | #FF69B4 |
| Power Plants | Gold | #FFD700 |
| Food Banks | LimeGreen | #32CD32 |
| Farmers' Markets | OrangeRed | #FF4500 |
| Rail Lines | Dark Cyan | #008B8B |
| Freight Terminals | Royal Blue | #4169E1 |
| Freight Routes | Dark Orchid | #9932CC |
| Petroleum Pipelines | OrangeRed | #FF4500 |
| Crude Oil Pipelines | DarkRed | #8B0000 |
| Natural Gas Pipelines | RoyalBlue | #4169E1 |

---

## File Size Guidelines

**Typical Zoom Levels**: 0-14

**Target File Sizes** (per tileset):
- Point layers: < 50 MB
- Line layers: < 100 MB
- Polygon layers (simple): < 100 MB
- Polygon layers (complex, like LandIQ): < 500 MB

**Optimization Tips**:
- Simplify geometries appropriately for zoom levels
- Remove unnecessary attributes
- Use appropriate precision for coordinates (6-7 decimal places)
- Apply compression when uploading

---

## Testing Checklist

When a new tileset is uploaded:

- [ ] Loads in map viewer without errors
- [ ] Displays at correct zoom levels
- [ ] Popups show correct data
- [ ] Field names match exactly
- [ ] Colors/styling render correctly
- [ ] Filters work as expected (if applicable)
- [ ] Performance is acceptable (no lag)
- [ ] Mobile compatibility verified

---

## Update Frequency

| Layer Category | Expected Update Frequency |
|----------------|--------------------------|
| Feedstock (LandIQ) | Annually |
| Infrastructure | As facilities open/close |
| Transportation | As infrastructure changes |

---

---

## How to Update Tilesets

When backend regenerates a tileset:
1. Update only the version identifier (YYYY-MM) in the tileset ID
2. Keep the source layer name stable (no version suffix)
3. Update the frontend `tileset-registry.ts` file with the new tileset ID

For detailed update procedures, see [TILESET_UPDATE_GUIDE.md](./TILESET_UPDATE_GUIDE.md)

---

### Version History
- **v1.2** (2024-10-16): Updated all tileset IDs to new standardized naming convention (`sustainasoft.cal-bioscape-*`). Stabilized source layer names across versions.
- **v1.1** (2024-10-16): Updated to reflect 23 new chemical composition fields for LandIQ tileset (Tier 1-3 analysis data)
- **v1.0**: Initial quick reference guide

For complete specifications, see [TILESET_SPECIFICATIONS.md](./TILESET_SPECIFICATIONS.md)
