# Tileset Generation Specifications

This document provides detailed specifications for all tilesets used in the BioCIRV Siting Tool front-end application. Backend engineers should use these specifications to generate or update tilesets when underlying data sources are refreshed.

## Important Note on Chemical Composition Fields

**Per backend engineering team feedback (Peter)**: The LandIQ feedstock tileset must include chemical composition and analysis data for filtering purposes. These fields are organized into three tiers:

- **Tier 1**: Proximate Analysis (moisture, ash, volatile solids, fixed carbon) - **HIGHEST PRIORITY**
  - Moisture content is the MOST QUERIED attribute as it has a massive effect on all downstream processing
- **Tier 2**: Ultimate & Compositional Analysis (C, H, N, O, S, glucose, xylose, lignin, energy content) - **HIGH PRIORITY**
- **Tier 3**: Additional elemental analysis (P, K, Si) - **OPTIONAL** if high-quality data is available

These attributes should be looked up from agricultural biomass databases (e.g., Phyllis2) based on the crop residue type, not calculated per-acre.

## Tileset Naming Convention & Management

### Naming Convention

All tilesets follow a standardized naming format:

```
sustainasoft.cal-bioscape-{dataset-source}-{category}-{YYYY-MM}
```

**Components:**
- `sustainasoft`: Mapbox account identifier
- `cal-bioscape`: Organizational prefix for all Cal-Bioscape project tilesets
- `{dataset-source}`: Data source identifier (e.g., `landiq`, `epa`, `nrel`, `ftot`, `usda`, `eia`)
- `{category}`: Brief category descriptor (e.g., `cropland`, `wastewater`, `biorefineries`)
- `{YYYY-MM}`: Date-based version identifier (year and month of tileset generation)

**Examples:**
- `sustainasoft.cal-bioscape-landiq-cropland-2024-10`
- `sustainasoft.cal-bioscape-epa-wastewater-2024-10`
- `sustainasoft.cal-bioscape-ftot-raillines-2024-10`

### Source Layer Stability

**Critical**: While tileset IDs change with each version, **source layer names remain stable** across versions. This minimizes code changes when tilesets are updated.

**Example:**
- Tileset ID (October 2024): `sustainasoft.cal-bioscape-landiq-cropland-2024-10`
- Tileset ID (January 2025): `sustainasoft.cal-bioscape-landiq-cropland-2025-01`
- Source Layer Name (both versions): `cropland_land_iq`

### Frontend Integration

The frontend application uses a **Tileset Registry** (`src/lib/tileset-registry.ts`) as the single source of truth for tileset configurations. When a tileset is updated:

1. Backend team generates new tileset with updated version identifier
2. Frontend team updates the `DEFAULT_TILESET_REGISTRY` in `tileset-registry.ts`
3. Application is rebuilt and redeployed

**Environment Variable Overrides:**
For testing or staging environments, tileset IDs can be overridden using environment variables:
- `NEXT_PUBLIC_TILESET_FEEDSTOCK`
- `NEXT_PUBLIC_TILESET_WASTEWATER`
- etc.

This allows different environments (dev, staging, prod) to use different tileset versions simultaneously without code changes.

## Table of Contents

1. [Feedstock/Crop Residues Tileset](#feedstock-crop-residues-tileset)
2. [Infrastructure Tilesets](#infrastructure-tilesets)
3. [Transportation Tilesets](#transportation-tilesets)
4. [General Requirements](#general-requirements)

---

## Feedstock/Crop Residues Tileset

### Overview
This tileset contains agricultural cropland data from LandIQ's 2023 Crop Mapping Dataset for California.

### Tileset Details
- **Tileset ID**: `sustainasoft.cal-bioscape-landiq-cropland-2024-10`
- **Source Layer Name**: `cropland_land_iq` (stable across versions)
- **Geometry Type**: Polygon/MultiPolygon
- **Data Source**: LandIQ 2023 Crop Mapping Dataset
- **URL**: https://www.landiq.com/data/
- **Version**: 2024-10

**Note**: The tileset ID includes a date-based version identifier (YYYY-MM). When this tileset is regenerated with updated data, only the version identifier changes. The source layer name remains stable to minimize code changes.

### Required Feature Attributes

All features in this tileset must include the following attributes:

| Field Name | Data Type | Description | Required | Example |
|------------|-----------|-------------|----------|---------|
| `main_crop_name` | String | Full name of the crop type | Yes | "Almonds", "Grapes", "Corn, Sorghum and Sudan" |
| `main_crop_code` | String | Single-letter or code for crop type | Yes | "A", "G", "C", "U" (U = Unknown/Urban) |
| `acres` | Float | Area of the field in acres | Yes | 145.67 |
| `county` | String | County name where field is located | Yes | "Fresno" |
| `region` | String | Geographic region | No | "San Joaquin Valley" |
| `hydro_region` | String | Hydrologic region | No | "Tulare Lake" |

### Additional Calculated Attributes (To Be Added)

The following attributes should be calculated and added to each feature during tileset generation based on the crop residue factor tables:

#### Tier 1: Residue Quantity & Proximate Analysis (HIGHEST PRIORITY)

| Field Name | Data Type | Description | Calculation Method |
|------------|-----------|-------------|-------------------|
| `residue_wet_tons` | Float | Wet tons of residue per year for this field | `acres * wetTonsPerAcre` (from residue factors) |
| `residue_dry_tons` | Float | Dry tons of residue per year for this field | `acres * dryTonsPerAcre` (from residue factors) |
| `residue_type` | String | Type of crop residue | From residue factor tables (e.g., "Prunings", "Stover", "Straw & Stubble") |
| `moisture_content` | Float | Moisture content as decimal (0-1) | From residue factor tables |
| `ash_content` | Float | Ash content as percentage (0-100) | From residue composition tables by crop type |
| `volatile_solids` | Float | Volatile solids as percentage (0-100) | From residue composition tables by crop type |
| `fixed_carbon` | Float | Fixed carbon as percentage (0-100) | From residue composition tables by crop type |

**Note**: Moisture content is the most critical attribute as it has a massive effect on all downstream processing decisions.

#### Tier 2: Ultimate & Compositional Analysis (HIGH PRIORITY)

| Field Name | Data Type | Description | Source |
|------------|-----------|-------------|--------|
| `carbon_pct` | Float | Carbon percentage of dry residue | From ultimate analysis tables by crop type |
| `hydrogen_pct` | Float | Hydrogen percentage of dry residue | From ultimate analysis tables by crop type |
| `nitrogen_pct` | Float | Nitrogen percentage of dry residue | From ultimate analysis tables by crop type |
| `oxygen_pct` | Float | Oxygen percentage of dry residue | From ultimate analysis tables by crop type |
| `sulfur_pct` | Float | Sulfur percentage of dry residue | From ultimate analysis tables by crop type |
| `glucose_pct` | Float | Glucose percentage (compositional) | From compositional analysis tables by crop type |
| `xylose_pct` | Float | Xylose percentage (compositional) | From compositional analysis tables by crop type |
| `lignin_pct` | Float | Lignin percentage (compositional) | From compositional analysis tables by crop type |
| `energy_content_mj_kg` | Float | Energy content in MJ/kg (dry basis) | From heating value analysis by crop type |

#### Tier 3: Additional Elemental Analysis (OPTIONAL - Lower Priority)

| Field Name | Data Type | Description | Source |
|------------|-----------|-------------|--------|
| `phosphorus_pct` | Float | Phosphorus percentage | From elemental analysis (if available) |
| `potassium_pct` | Float | Potassium percentage | From elemental analysis (if available) |
| `silica_pct` | Float | Silica percentage | From elemental analysis (if available) |

**Note**: Tier 3 fields should only be added if high-quality source data is available. These are less critical for siting decisions but may be useful for certain feedstock evaluation scenarios.

### Crop Residue Factor Tables

Use the following reference tables to calculate residue attributes:

#### Orchard and Vineyard Residues (Prunings)
- Applies to: Apples, Apricots, Avocados, Cherries, Dates, Figs, Grapes, Kiwis, Nectarines, Olives, Peaches, Pears, Persimmons, Plums, Prunes, Pomegranates, Citrus, Almonds, Pecans, Pistachios, Walnuts
- Residue Type: "Prunings"

#### Row Crop Residues
- Applies to: Artichokes, Asparagus, Berries, Beans, Broccoli, Cabbage, Melons, Carrots, Cauliflower, Celery, Cucumbers, Garlic, Lettuce, Onions, Peppers, Spinach, Squash, Tomatoes, Potatoes, Sweet Potatoes, Sugar Beets
- Residue Types: Vary by crop (e.g., "Top Silage", "Vines and Leaves", "Stems & Leaf Meal")

#### Field Crop Residues
- Applies to: Corn, Sorghum, Wheat, Barley, Oats, Rice, Safflower, Sunflower, Cotton, Alfalfa
- Residue Types: "Stover", "Straw & Stubble", "Stems & Leaf Meal"

### Data Sources for Residue Attributes

**Basic Residue Factors** (See constants.ts and CROP_RESIDUE_FACTORS.md):
- `wetTonsPerAcre`: Wet tons of residue per acre
- `moistureContent`: Moisture content (0-1 decimal)
- `dryTonsPerAcre`: Dry tons of residue per acre
- `seasonalAvailability`: Monthly availability (Jan-Dec)

**Chemical Composition Data** (To be provided by backend team):
- **Proximate Analysis**: Ash content, volatile solids, fixed carbon by crop/residue type
- **Ultimate Analysis**: C, H, N, O, S percentages by crop/residue type
- **Compositional Analysis**: Glucose, xylose, lignin percentages by crop/residue type
- **Energy Content**: Heating values (MJ/kg) by crop/residue type
- **Elemental Analysis**: Optional P, K, Si percentages if available

**Note**: Chemical composition values should be based on standard literature values for each crop residue type. Backend engineers should compile these from agricultural biomass databases (e.g., Phyllis2 database, USDA data, peer-reviewed literature). Values should be representative averages for each standardized crop type.

### Crop Name Mapping

Map the crop names in the source data to standardized names using the following table:

| Source Crop Name | Standardized Name |
|------------------|-------------------|
| "Citrus and Subtropical" | "All Citrus" |
| "Miscellaneous Subtropical Fruits" | "All Citrus" |
| "Corn, Sorghum and Sudan" | "Corn" |
| "Kiwis" | "Kiwifruit" |
| "Peaches/Nectarines" | "Peaches" |
| "Plums" | "Plums & Prunes" |
| "Prunes" | "Plums & Prunes" |
| "Miscellaneous Deciduous" | "Fruits & Nuts unsp." |
| "Bush Berries" | "Berries" |
| "Beans (Dry)" | "Beans" |
| "Cole Crops" | "Cabbage" |
| "Melons, Squash and Cucumbers" | "Combined Melons" |
| "Lettuce/Leafy Greens" | "Lettuce and Romaine" |
| "Onions and Garlic" | "Dry Onions" |
| "Peppers" | "Hot Peppers" |
| "Sweet Potatoes" | "Sweet Potatos" |
| "Sugar beets" | "Sugar Beets" |
| "Miscellaneous Truck Crops" | "Unsp. vegetables" |
| "Alfalfa & Alfalfa Mixtures" | "Alfalfa" |
| "Miscellaneous Field Crops" | "Unsp. Field & Seed" |
| "Miscellaneous Grain and Hay" | "Unsp. Field & Seed" |
| "Miscellaneous Grasses" | "Bermuda Grass Seed" |
| "Sunflowers" | "Sunflower" |
| "Wild Rice" | "Rice" |

### Filters & Exclusions
- Exclude features where `main_crop_code = 'U'` (Unknown/Urban land)

---

## Infrastructure Tilesets

### 1. Livestock Anaerobic Digesters

#### Tileset Details
- **Tileset ID**: `sustainasoft.cal-bioscape-epa-agstar-digesters-2024-10`
- **Source Layer Name**: `agstar_ad_pts` (stable across versions)
- **Geometry Type**: Point
- **Map Layer ID**: `anaerobic-digester-layer`
- **Display Color**: #8B4513 (Saddle Brown)
- **Display Style**: Circle (radius: 6px)
- **Version**: 2024-10

#### Required Attributes

| Field Name | Data Type | Description | Display Label |
|------------|-----------|-------------|---------------|
| `AnimalTypeClass` | String | Classification of animal type | Animal Type Class |
| `AnimalTypes` | String | Types of animals at facility | Animal Types |
| `BiogasEndUses` | String | End uses for biogas produced | Biogas End Uses |
| `BiogasGenerationEstimate_cu_ft_day` | Float | Biogas generation rate | Biogas Generation Estimate (cu ft/day) |
| `Cattle` | Integer | Number of cattle | Cattle |
| `City` | String | City location | City |
| `Co_Digestion` | String | Co-digestion information | Co-Digestion |
| `Dairy` | Integer | Number of dairy animals | Dairy |
| `DigesterType` | String | Type of digester system | Digester Type |
| `ElectricityGenerated_kWh_yr` | Float | Annual electricity generation | Electricity Generated (kWh/yr) |
| `LATITUDE` | Float | Latitude coordinate | Latitude |
| `LONGITUDE` | Float | Longitude coordinate | Longitude |
| `MethaneEmissionReductions_metrictonsCO2E_yr` | Float | Annual methane emission reductions | Methane Emission Reductions (metric tons CO2E/yr) |
| `PopFeedingDigester` | Integer | Population feeding the digester | Population Feeding Digester |
| `Poultry` | Integer | Number of poultry | Poultry |
| `Profile` | String | Facility profile | Profile |
| `ProjectName` | String | Name of the project | Project Name |
| `ProjectType` | String | Type of project | Project Type |
| `State` | String | State abbreviation | State |
| `Swine` | Integer | Number of swine | Swine |
| `TotalPopFeedingDigester` | Integer | Total animal population | Total Population Feeding Digester |
| `YearOperational` | Integer | Year facility became operational | Year Operational |

---

### 2. Ethanol Biorefineries

#### Tileset Details
- **Tileset ID**: `sustainasoft.cal-bioscape-nrel-biorefineries-2024-10`
- **Source Layer Name**: `current_biorefineries` (stable across versions)
- **Geometry Type**: Point
- **Map Layer ID**: `biorefineries-layer`
- **Display Color**: #9370DB (Medium Purple)
- **Display Style**: Circle (radius: 6px)
- **Version**: 2024-10

#### Required Attributes

| Field Name | Data Type | Description | Display Label |
|------------|-----------|-------------|---------------|
| `City` | String | City location | City |
| `Company` | String | Operating company name | Company |
| `State` | String | State abbreviation | State |
| `Status` | String | Operational status | Status |
| `Technology` | String | Technology used | Technology |
| `capacity_gal_yr` | Float | Annual production capacity in gallons | Capacity (Gallons per Year) |
| `feedstock` | String | Feedstock types used | Feedstock |
| `lat` | Float | Latitude coordinate | Latitude |
| `lon` | Float | Longitude coordinate | Longitude |

---

### 3. Sustainable Aviation Fuel (SAF) Plants

#### Tileset Details
- **Tileset ID**: `sustainasoft.cal-bioscape-nrel-saf-plants-2024-10`
- **Source Layer Name**: `renewable_diesel_saf_plants` (stable across versions)
- **Geometry Type**: Point
- **Map Layer ID**: `saf-plants-layer`
- **Display Color**: #1E90FF (Dodger Blue)
- **Display Style**: Circle (radius: 6px)
- **Version**: 2024-10
- **Filter**: Features must contain 'SAF' (case-insensitive) in the `products` field

#### Required Attributes

| Field Name | Data Type | Description | Display Label |
|------------|-----------|-------------|---------------|
| `address` | String | Street address | Address |
| `capacity_mmg_per_y` | Float | Annual capacity in million gallons | Capacity (MMG/Year) |
| `city` | String | City location | City |
| `company` | String | Operating company name | Company |
| `country` | String | Country | Country |
| `feedstock` | String | Feedstock types used | Feedstock |
| `ibcc_index` | String | IBCC index identifier | IBCC Index |
| `latitude` | Float | Latitude coordinate | Latitude |
| `longitude` | Float | Longitude coordinate | Longitude |
| `products` | String | Products produced (must contain "SAF") | Products |
| `source` | String | Data source | Source |
| `state` | String | State abbreviation | State |
| `status` | String | Operational status | Status |

---

### 4. Renewable Diesel Plants

#### Tileset Details
- **Tileset ID**: `sustainasoft.cal-bioscape-nrel-saf-plants-2024-10` (same source as SAF)
- **Source Layer Name**: `renewable_diesel_saf_plants` (stable across versions)
- **Geometry Type**: Point
- **Map Layer ID**: `renewable-diesel-layer`
- **Display Color**: #FF8C00 (Dark Orange)
- **Display Style**: Circle (radius: 6px)
- **Version**: 2024-10
- **Filter**: Features must contain 'RD' (case-insensitive) in the `products` field

#### Required Attributes

| Field Name | Data Type | Description | Display Label |
|------------|-----------|-------------|---------------|
| `address` | String | Street address | Address |
| `capacity_mmg_per_y` | Float | Annual capacity in million gallons | Capacity (Million Gallons per Year) |
| `city` | String | City location | City |
| `company` | String | Operating company name | Company |
| `country` | String | Country | Country |
| `county` | String | County name | County |
| `developer` | String | Developer name | Developer |
| `feedstocks` | String | Feedstock types used | Feedstocks |
| `lat` | Float | Latitude coordinate | Latitude |
| `lon` | Float | Longitude coordinate | Longitude |
| `products` | String | Products produced (must contain "RD") | Products |
| `state` | String | State abbreviation | State |
| `status` | String | Operational status | Status |
| `zip` | String | ZIP code | ZIP Code |

---

### 5. Material Recovery Facilities (MRF)

#### Tileset Details
- **Tileset ID**: `sustainasoft.cal-bioscape-epa-mrf-2024-10`
- **Source Layer Name**: `us_mrf_pts` (stable across versions)
- **Geometry Type**: Point
- **Map Layer ID**: `mrf-layer`
- **Display Color**: #20B2AA (Light Sea Green)
- **Display Style**: Circle (radius: 6px)
- **Version**: 2024-10

#### Required Attributes

| Field Name | Data Type | Description | Display Label |
|------------|-----------|-------------|---------------|
| `CLEAR PET_TPD` | Float | Clear PET processing capacity | Clear PET (Tons per Day) |
| `COLOR HDPE_TPD` | Float | Color HDPE processing capacity | Color HDPE (Tons per Day) |
| `COLOR PET_TPD` | Float | Color PET processing capacity | Color PET (Tons per Day) |
| `DUAL STREAM` | String | Dual stream capability | Dual Stream |
| `FullAddress` | String | Complete address | Full Address |
| `LDPE_TPD` | Float | LDPE processing capacity | LDPE (Tons per Day) |
| `MIXED PLASTICS (3-7)_TPD` | Float | Mixed plastics processing capacity | Mixed Plastics (3-7) (Tons per Day) |
| `MRF TYPE` | String | Type of MRF facility | MRF Type |
| `NATURAL HDPE_TPD` | Float | Natural HDPE processing capacity | Natural HDPE (Tons per Day) |
| `OTHER PLASTICS_TPD` | Float | Other plastics processing capacity | Other Plastics (Tons per Day) |
| `PERCENT COMMERCIAL` | Float | Percent commercial waste | Percent Commercial |
| `PERCENT DUAL STREAM` | Float | Percent dual stream | Percent Dual Stream |
| `PERCENT RESIDENTIAL` | Float | Percent residential waste | Percent Residential |
| `PERCENT SINGLE STREAM` | Float | Percent single stream | Percent Single Stream |
| `PLANT_CITY` | String | City location | Plant City |
| `PLANT_NAME` | String | Facility name | Plant Name |
| `PLANT_STATE` | String | State abbreviation | Plant State |
| `PLANT_ZIP` | String | ZIP code | Plant ZIP |
| `POLYSTYRENE_TPD` | Float | Polystyrene processing capacity | Polystyrene (Tons per Day) |
| `POPULATION SERVED` | Integer | Population served | Population Served |
| `PP_TPD` | Float | PP processing capacity | PP (Tons per Day) |
| `PVC_TPD` | Float | PVC processing capacity | PVC (Tons per Day) |
| `SINGLE STREAM- all recyclables` | String | Single stream capability | Single Stream (All Recyclables) |
| `STATUS` | String | Operational status | Status |
| `TOTAL PLASTIC_TPD` | Float | Total plastic processing capacity | Total Plastic (Tons per Day) |
| `TPD` | Float | Total throughput | Total (Tons per Day) |
| `TotalHDPE_TPD` | Float | Total HDPE processing capacity | Total HDPE (Tons per Day) |
| `TotalPET_TPD` | Float | Total PET processing capacity | Total PET (Tons per Day) |
| `lat` | Float | Latitude coordinate | Latitude |
| `lon` | Float | Longitude coordinate | Longitude |

---

### 6. Cement Plants

#### Tileset Details
- **Tileset ID**: `sustainasoft.cal-bioscape-epa-cement-plants-2024-10`
- **Source Layer Name**: `cement_facility_location` (stable across versions)
- **Geometry Type**: Point
- **Map Layer ID**: `cement-plants-layer`
- **Display Color**: #708090 (Slate Gray)
- **Display Style**: Circle (radius: 6px)
- **Version**: 2024-10

#### Required Attributes

| Field Name | Data Type | Description | Display Label |
|------------|-----------|-------------|---------------|
| `address` | String | Street address | Address |
| `capacity` | Float | Production capacity | Capacity |
| `city` | String | City location | City |
| `facility_id_epa` | String | EPA facility identifier | EPA Facility ID |
| `facility_name` | String | Name of facility | Facility Name |
| `lat` | Float | Latitude coordinate | Latitude |
| `lon` | Float | Longitude coordinate | Longitude |
| `state` | String | State abbreviation | State |
| `zip` | String | ZIP code | ZIP Code |

---

### 7. Biodiesel Plants

#### Tileset Details
- **Tileset ID**: `sustainasoft.cal-bioscape-eia-biodiesel-2024-10`
- **Source Layer Name**: `biodiesel_plants` (stable across versions)
- **Geometry Type**: Point
- **Map Layer ID**: `biodiesel-plants-layer`
- **Display Color**: #228B22 (Forest Green)
- **Display Style**: Circle (radius: 6px)
- **Version**: 2024-10

#### Required Attributes

| Field Name | Data Type | Description | Display Label |
|------------|-----------|-------------|---------------|
| `City` | String | City location | City |
| `Company` | String | Operating company name | Company |
| `Plant_Name` | String | Name of plant | Plant Name |
| `State` | String | State abbreviation | State |
| `Status` | String | Operational status | Status |
| `capacity_mmgy` | Float | Annual capacity in million gallons | Capacity (Million Gallons per Year) |
| `feedstock` | String | Feedstock types used | Feedstock |
| `lat` | Float | Latitude coordinate | Latitude |
| `lon` | Float | Longitude coordinate | Longitude |

---

### 8. Landfills with LFG (Landfill Gas) Projects

#### Tileset Details
- **Tileset ID**: `sustainasoft.cal-bioscape-epa-landfills-lfg-2024-10`
- **Source Layer Name**: `landfills_lmop_active_project` (stable across versions)
- **Geometry Type**: Point
- **Map Layer ID**: `landfill-lfg-layer`
- **Display Color**: #800080 (Purple)
- **Display Style**: Circle (radius: 6px)
- **Version**: 2024-10

#### Required Attributes

| Field Name | Data Type | Description | Display Label |
|------------|-----------|-------------|---------------|
| `Current_Landfill_Status` | String | Current operational status | Landfill Status |
| `Gas_Collected` | String | Gas collection information | Gas Collected |
| `Landfill_Gas_Energy_Project_Status` | String | Energy project status | Energy Project Status |
| `Landfill_Name` | String | Name of landfill | Landfill Name |
| `Latitude` | Float | Latitude coordinate | Latitude |
| `Longitude` | Float | Longitude coordinate | Longitude |
| `Owner_Name` | String | Owner name | Owner |
| `State` | String | State abbreviation | State |
| `Waste_in_Place_tons` | Float | Total waste in place | Waste in Place (tons) |
| `Year_Opened` | Integer | Year landfill opened | Year Opened |

---

### 9. Wastewater Treatment Plants

#### Tileset Details
- **Tileset ID**: `sustainasoft.cal-bioscape-epa-wastewater-2024-10`
- **Source Layer Name**: `us_wwt_pts` (stable across versions)
- **Geometry Type**: Point
- **Map Layer ID**: `wastewater-treatment-layer`
- **Display Color**: #00CED1 (Turquoise)
- **Display Style**: Circle (radius: 6px)
- **Version**: 2024-10

#### Required Attributes

| Field Name | Data Type | Description | Display Label |
|------------|-----------|-------------|---------------|
| `CITY` | String | City location | City |
| `COUNTY` | String | County name | County |
| `FACILITY_NAME` | String | Name of facility | Facility Name |
| `LATITUDE` | Float | Latitude coordinate | Latitude |
| `LONGITUDE` | Float | Longitude coordinate | Longitude |
| `STATE` | String | State abbreviation | State |
| `ZIP` | String | ZIP code | ZIP Code |
| `flow_mgd` | Float | Flow rate in million gallons per day | Flow (MGD) |

---

### 10. Waste to Energy Plants

#### Tileset Details
- **Tileset ID**: `sustainasoft.cal-bioscape-eia-waste-energy-2024-10`
- **Source Layer Name**: `waste_energy_points` (stable across versions)
- **Geometry Type**: Point
- **Map Layer ID**: `waste-to-energy-layer`
- **Display Color**: #FF6347 (Tomato)
- **Display Style**: Circle (radius: 6px)
- **Version**: 2024-10

#### Required Attributes

*Note: Specific field names to be determined when backend generates tileset. Typical attributes should include:*
- Facility name
- Location (city, state, coordinates)
- Capacity
- Technology type
- Operational status

---

### 11. Combustion Plants

#### Tileset Details
- **Tileset ID**: `sustainasoft.cal-bioscape-eia-combustion-2024-10`
- **Source Layer Name**: `combustion_points` (stable across versions)
- **Geometry Type**: Point
- **Map Layer ID**: `combustion-plants-layer`
- **Display Color**: #B22222 (FireBrick)
- **Display Style**: Circle (radius: 6px)
- **Version**: 2024-10

#### Required Attributes

*Note: Specific field names to be determined when backend generates tileset. Typical attributes should include:*
- Facility name
- Location (city, state, coordinates)
- Fuel type
- Capacity
- Emissions data

---

### 12. District Energy Systems

#### Tileset Details
- **Tileset ID**: `sustainasoft.cal-bioscape-nrel-district-energy-2024-10`
- **Source Layer Name**: `district_energy_systems` (stable across versions)
- **Geometry Type**: Point
- **Map Layer ID**: `district-energy-systems-layer`
- **Display Color**: #32CD32 (LimeGreen)
- **Display Style**: Circle (radius: 6px)
- **Version**: 2024-10

#### Required Attributes

*Note: Specific field names to be determined when backend generates tileset. Typical attributes should include:*
- System name/ID
- Location (city, state, coordinates)
- Service area
- Capacity
- Technology type

---

### 13. Food Processors

#### Tileset Details
- **Tileset ID**: `sustainasoft.cal-bioscape-epa-food-processors-2024-10`
- **Source Layer Name**: `food_manufactureres_and_processors_epa` (stable across versions)
- **Geometry Type**: Point
- **Map Layer ID**: `food-processors-layer`
- **Display Color**: #FFD700 (Gold)
- **Display Style**: Circle (radius: 6px)
- **Version**: 2024-10

#### Required Attributes

| Field Name | Data Type | Description | Display Label |
|------------|-----------|-------------|---------------|
| `Address` | String | Street address | Address |
| `City` | String | City location | City |
| `County` | String | County name | County |
| `ExcessFo_1` | Float | High estimate of excess food | Excess Food - High Estimate (Tons/Year) |
| `ExcessFood` | Float | Low estimate of excess food | Excess Food - Low Estimate (Tons/Year) |
| `NAICS_Co_1` | String | NAICS industry description | NAICS Description |
| `NAICS_Code` | String | NAICS industry code | NAICS Code |
| `Name` | String | Facility name | Name |
| `OBJECTID` | Integer | Unique object identifier | Object ID |
| `Phone1` | String | Phone number | Phone |
| `State` | String | State abbreviation | State |
| `UniqueID` | String | Unique identifier | Unique ID |
| `Website` | String | Website URL | Website |
| `lat` | Float | Latitude coordinate | Latitude |
| `lon` | Float | Longitude coordinate | Longitude |

---

### 14. Food Retailers

#### Tileset Details
- **Tileset ID**: `sustainasoft.cal-bioscape-epa-food-retailers-2024-10`
- **Source Layer Name**: `food_wholesalers_and_retailers_epa` (stable across versions)
- **Geometry Type**: Point
- **Map Layer ID**: `food-retailers-layer`
- **Display Color**: #FF69B4 (HotPink)
- **Display Style**: Circle (radius: 6px)
- **Version**: 2024-10

#### Required Attributes

| Field Name | Data Type | Description | Display Label |
|------------|-----------|-------------|---------------|
| `Address` | String | Street address | Address |
| `City` | String | City location | City |
| `County` | String | County name | County |
| `ExcessFood_TonYear_HighEst` | Float | High estimate of excess food | Excess Food - High Estimate (Tons/Year) |
| `ExcessFood_TonYear_LowEst` | Float | Low estimate of excess food | Excess Food - Low Estimate (Tons/Year) |
| `NAICS_Code` | String | NAICS industry code | NAICS Code |
| `NAICS_Code_Description` | String | NAICS industry description | NAICS Description |
| `Name` | String | Facility name | Name |
| `OBJECTID` | Integer | Unique object identifier | Object ID |
| `Phone` | String | Phone number | Phone |
| `State` | String | State abbreviation | State |
| `UniqueID` | String | Unique identifier | Unique ID |
| `Website` | String | Website URL | Website |
| `lat` | Float | Latitude coordinate | Latitude |
| `lon` | Float | Longitude coordinate | Longitude |

---

### 15. Power Plants

#### Tileset Details
- **Tileset ID**: `sustainasoft.cal-bioscape-eia-power-plants-2024-10`
- **Source Layer Name**: `power_plants` (stable across versions)
- **Geometry Type**: Point
- **Map Layer ID**: `power-plants-layer`
- **Display Color**: #FFD700 (Gold)
- **Display Style**: Circle (radius: 6px)
- **Version**: 2024-10

#### Required Attributes

| Field Name | Data Type | Description | Display Label |
|------------|-----------|-------------|---------------|
| `City` | String | City location | City |
| `County` | String | County name | County |
| `Plant_Name` | String | Name of plant | Plant Name |
| `State` | String | State abbreviation | State |
| `Technology` | String | Technology type | Technology |
| `Total_MW` | Float | Total capacity in megawatts | Total MW |
| `lat` | Float | Latitude coordinate | Latitude |
| `lon` | Float | Longitude coordinate | Longitude |

---

### 16. Food Banks

#### Tileset Details
- **Tileset ID**: `sustainasoft.cal-bioscape-epa-food-banks-2024-10`
- **Source Layer Name**: `food_banks_epa` (stable across versions)
- **Geometry Type**: Point
- **Map Layer ID**: `food-banks-layer`
- **Display Color**: #32CD32 (LimeGreen)
- **Display Style**: Circle (radius: 6px)
- **Version**: 2024-10

#### Required Attributes

| Field Name | Data Type | Description | Display Label |
|------------|-----------|-------------|---------------|
| `CITY` | String | City location | City |
| `COUNTY` | String | County name | County |
| `NAME` | String | Food bank name | Name |
| `STATE` | String | State abbreviation | State |
| `ZIPCODE` | String | ZIP code | ZIP Code |
| `lat` | Float | Latitude coordinate | Latitude |
| `lon` | Float | Longitude coordinate | Longitude |

---

### 17. Farmers' Markets

#### Tileset Details
- **Tileset ID**: `sustainasoft.cal-bioscape-usda-farmers-markets-2024-10`
- **Source Layer Name**: `farmers_markets_usda` (stable across versions)
- **Geometry Type**: Point
- **Map Layer ID**: `farmers-markets-layer`
- **Display Color**: #FF4500 (OrangeRed)
- **Display Style**: Circle (radius: 6px)
- **Version**: 2024-10

#### Required Attributes

| Field Name | Data Type | Description | Display Label |
|------------|-----------|-------------|---------------|
| `city` | String | City location | City |
| `county` | String | County name | County |
| `marketname` | String | Name of farmers' market | Market Name |
| `state` | String | State abbreviation | State |
| `zip` | String | ZIP code | ZIP Code |
| `lat` | Float | Latitude coordinate | Latitude |
| `lon` | Float | Longitude coordinate | Longitude |

---

## Transportation Tilesets

### 1. Rail Lines

#### Tileset Details
- **Tileset ID**: `sustainasoft.cal-bioscape-ftot-raillines-2024-10`
- **Source Layer Name**: `us_rail_lines_ftot` (stable across versions)
- **Geometry Type**: LineString/MultiLineString
- **Map Layer ID**: `rail-lines-layer`
- **Display Color**: #008B8B (Dark Cyan)
- **Display Style**: Dashed line (width: 2px, dash: [2, 2])
- **Version**: 2024-10

#### Required Attributes

| Field Name | Data Type | Description | Display Label |
|------------|-----------|-------------|---------------|
| `FRAARCID` | String | FRA ARC identifier | FRA ARC ID |
| `FRFRAN` | String | FRA FRAN identifier | FRFRAN |
| `FROWNER` | String | Railroad owner | Owner |
| `KM` | Float | Length in kilometers | Kilometers |
| `MILES` | Float | Length in miles | Miles |
| `NET` | String | Network designation | Net |
| `RROWNER1` | String | Primary railroad owner | Primary Owner |
| `RROWNER2` | String | Secondary railroad owner | Secondary Owner |
| `RROWNER3` | String | Tertiary railroad owner | Tertiary Owner |
| `STATEAB` | String | State abbreviation | State |
| `TRACKS` | Integer | Number of tracks | Tracks |
| `VERSION` | String | Data version | Version |

---

### 2. Freight Terminals

#### Tileset Details
- **Tileset ID**: `sustainasoft.cal-bioscape-ftot-freight-terminals-2024-10`
- **Source Layer Name**: `us_freight_terminals` (stable across versions)
- **Geometry Type**: Point
- **Map Layer ID**: `freight-terminals-layer`
- **Display Color**: #4169E1 (Royal Blue)
- **Display Style**: Circle (radius: 6px)
- **Version**: 2024-10

#### Required Attributes

*Note: Specific field names to be determined when backend generates tileset. Typical attributes should include:*
- Terminal name
- Location (city, state, coordinates)
- Terminal type
- Capacity
- Services offered

---

### 3. Freight Routes

#### Tileset Details
- **Tileset ID**: `sustainasoft.cal-bioscape-ftot-freight-routes-2024-10`
- **Source Layer Name**: `us_freight_routes` (stable across versions)
- **Geometry Type**: LineString/MultiLineString
- **Map Layer ID**: `freight-routes-layer`
- **Display Color**: #9932CC (Dark Orchid)
- **Display Style**: Solid line (width: 2px)
- **Version**: 2024-10

#### Required Attributes

*Note: Specific field names to be determined when backend generates tileset. Typical attributes should include:*
- Route identifier
- Route type
- Origin/destination
- Capacity
- Freight type

---

### 4. Petroleum Pipelines

#### Tileset Details
- **Tileset ID**: `tylerhuntington222.b4obgo1f`
- **Source Layer Name**: `us_petrol_prod_pipelines_ftot-4f7wgo`
- **Geometry Type**: LineString/MultiLineString
- **Map Layer ID**: `petroleum-pipelines-layer`
- **Display Color**: #FF4500 (OrangeRed)
- **Display Style**: Solid line (width: 2px)

#### Required Attributes

*Note: Specific field names need to be determined from source data. Typical attributes should include:*
- Pipeline identifier
- Operator
- Product type
- Diameter
- Capacity

---

### 5. Crude Oil Pipelines

#### Tileset Details
- **Tileset ID**: `tylerhuntington222.9llifnsy`
- **Source Layer Name**: `us_crude_pipeline_ftot-bhu6j4`
- **Geometry Type**: LineString/MultiLineString
- **Map Layer ID**: `crude-oil-pipelines-layer`
- **Display Color**: #8B0000 (DarkRed)
- **Display Style**: Solid line (width: 2px)

#### Required Attributes

*Note: Specific field names need to be determined from source data. Typical attributes should include:*
- Pipeline identifier
- Operator
- Diameter
- Capacity
- Origin/destination

---

### 6. Natural Gas Pipelines

#### Tileset Details
- **Tileset ID**: `tylerhuntington222.9iavmtjd`
- **Source Layer Name**: `hifld_us_natural_gas_pipeline-4prihp`
- **Geometry Type**: LineString/MultiLineString
- **Map Layer ID**: `natural-gas-pipelines-layer`
- **Display Color**: #4169E1 (RoyalBlue)
- **Display Style**: Solid line (width: 2px)

#### Required Attributes

*Note: Specific field names need to be determined from source data. Typical attributes should include:*
- Pipeline identifier
- Operator
- Diameter
- Capacity
- Pressure rating

---

## General Requirements

### Data Quality Standards

1. **Geometry Validation**
   - All geometries must be valid according to OGC Simple Features specification
   - No self-intersecting polygons
   - No duplicate vertices
   - Proper coordinate order (counter-clockwise for exterior rings, clockwise for holes)

2. **Coordinate System**
   - All data must be in WGS84 (EPSG:4326)
   - Longitude range: -180 to 180
   - Latitude range: -90 to 90

3. **Attribute Requirements**
   - All required fields must be present on every feature
   - Null values should only appear in optional fields
   - String fields should be trimmed of leading/trailing whitespace
   - Numeric fields should use appropriate precision (avoid excessive decimal places)

4. **Field Naming Conventions**
   - Field names are case-sensitive and must match exactly as specified
   - Use snake_case for multi-word field names (e.g., `main_crop_name`)
   - Avoid special characters except underscores

### Tileset Generation Best Practices

1. **Simplification**
   - Apply appropriate geometry simplification based on zoom levels
   - Preserve important features while reducing file size
   - Test at multiple zoom levels to ensure quality

2. **Indexing**
   - Ensure spatial index is created for efficient querying
   - Create attribute indexes for frequently filtered fields

3. **File Size Optimization**
   - Use appropriate zoom level ranges (typically 0-14 for most layers)
   - Apply compression where supported
   - Remove unnecessary attributes not used in the application

4. **Testing**
   - Verify all features load correctly in Mapbox
   - Test popup functionality with sample features
   - Validate filters work as expected
   - Check rendering performance at different zoom levels

### Mapbox Tileset Upload

When uploading to Mapbox, use the following standardized naming convention:
- Account: `sustainasoft`
- Tileset ID format: `sustainasoft.cal-bioscape-{source}-{category}-{YYYY-MM}`
- Source Layer Name: Use stable names without version suffixes (e.g., `cropland_land_iq`)
- Version Identifier: Use current year and month (e.g., `2024-10` for October 2024)

### Documentation Updates

When updating tilesets, also update:
1. This specification document with any changes
2. The `src/lib/tileset-registry.ts` file with new tileset IDs (update `DEFAULT_TILESET_REGISTRY`)
3. The `labelMappings.js` file with any new field mappings
4. Any relevant README or deployment documentation

**Note**: The `tileset-registry.ts` file is the single source of truth for tileset configurations. Only update the version identifier portion of the tileset ID (YYYY-MM) when regenerating tilesets.

---

## Change Log

### Version 1.2 (2025-10-16)
- **MAJOR UPDATE**: Implemented standardized tileset naming convention with versioning
- Updated all tileset IDs to new format: `sustainasoft.cal-bioscape-{source}-{category}-{YYYY-MM}`
- Changed organizational prefix from `biocirv` to `cal-bioscape`
- Standardized all source layer names to remove version suffixes (e.g., `cropland_land_iq_2023` → `cropland_land_iq`)
- Added comprehensive "Tileset Naming Convention & Management" section
- Documented frontend integration via Tileset Registry pattern
- Added guidance on environment variable overrides for multi-environment support
- Updated all 20+ tileset specifications with new naming format

### Version 1.1 (2025-10-16)
- **MAJOR UPDATE**: Added chemical composition fields to LandIQ feedstock tileset per backend team requirements
- Added Tier 1 Proximate Analysis fields: ash_content, volatile_solids, fixed_carbon
- Added Tier 2 Ultimate Analysis fields: carbon_pct, hydrogen_pct, nitrogen_pct, oxygen_pct, sulfur_pct
- Added Tier 2 Compositional Analysis fields: glucose_pct, xylose_pct, lignin_pct, energy_content_mj_kg
- Added Tier 3 Optional Elemental fields: phosphorus_pct, potassium_pct, silica_pct
- Total new fields: 23 attributes to be added to LandIQ tileset
- Emphasized moisture_content as the most critical filtering attribute
- Added guidance on sourcing chemical composition data from biomass databases (Phyllis2, USDA, literature)

### Version 1.0 (Initial)
- Created comprehensive specifications for all existing tilesets
- Documented required attributes for all layers
- Included crop residue calculation methodology

---

## Contact

For questions or clarifications on these specifications, please contact the development team.
