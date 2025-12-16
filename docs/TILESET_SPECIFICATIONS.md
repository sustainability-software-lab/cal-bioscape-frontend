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

### Three-Tier Data Architecture

The feedstock data is partitioned into three accessibility tiers to optimize performance and maintain data freshness:

| Tier | Data Location | Purpose | Update Frequency |
|------|---------------|---------|------------------|
| **Tier 1** | MapBox Vector Tiles | Visualization & Fast Rendering | When geometries/yield baselines change |
| **Tier 2** | Static JSON Lookup (`feedstock_definitions.json`) | Compositional Constants | Rarely (constants per residue_type) |
| **Tier 3** | Backend API (FastAPI) | Real-time/Transactional Data | Live updates |

**Design Goal**: Keep vector tiles "thin" (<500kb) for fast rendering. Chemical composition data is constant per `residue_type` and should NOT be in tiles or fetched via API queries.

---

### Tier 1: Tile Payload (Vector Tiles)

**Purpose**: Visualization attributes only. These are the ONLY attributes that should be included in the MapBox vector tileset.

| Field Name | Data Type | Description | Required | Example |
|------------|-----------|-------------|----------|---------|
| `feedstock_id` | String (UUID) | Unique identifier for the feedstock polygon. **Critical join key** for API lookups and static data joins. | Yes | "550e8400-e29b-41d4-a716-446655440000" |
| `residue_type` | String | Type of crop residue. **Must match keys in `feedstock_definitions.json` exactly.** | Yes | "Prunings", "Stover", "Straw & Stubble" |
| `total_yield` | Float | Total yield (dry tons) for quantitative scaling/opacity | Yes | 225.75 |
| `main_crop_name` | String | Full name of the crop type (for display) | Yes | "Almonds", "Grapes", "Corn" |
| `acres` | Float | Area of the field in acres | Yes | 145.67 |
| `county` | String | County name where field is located | Yes | "Fresno" |

**Note**: The `residue_type` string in tiles MUST strictly match the keys in the static JSON lookup. A shared Enum definition should be used to ensure consistency.

---

### Tier 2: Static Lookup (feedstock_definitions.json)

**Location**: GCS Bucket / CDN (e.g., `https://storage.googleapis.com/cal-bioscape-assets/feedstock_definitions.json`)

**Purpose**: Compositional constants that are **constant per `residue_type`**. Since all Almonds have the same ~3.2% Ash content, this data should NOT be in tiles or fetched via DB queries. Instead, perform O(1) client-side joins using `residue_type` as the key.

**File Structure**:
```json
{
  "Prunings": {
    "display_name": "Prunings (Orchard & Vineyard)",
    "moisture_content": 0.40,
    "ash_content": 3.2,
    "volatile_solids": 78.5,
    "fixed_carbon": 18.3,
    "carbon_pct": 48.5,
    "hydrogen_pct": 6.1,
    "nitrogen_pct": 0.8,
    "oxygen_pct": 41.4,
    "sulfur_pct": 0.1,
    "glucose_pct": 42.0,
    "xylose_pct": 18.5,
    "lignin_pct": 22.0,
    "energy_content_mj_kg": 18.2,
    "processing_suitability": ["pyrolysis", "direct_combustion", "gasification"]
  },
  "Stover": {
    "display_name": "Stover (Corn, Sorghum)",
    "moisture_content": 0.20,
    "ash_content": 6.5,
    "volatile_solids": 75.2,
    "fixed_carbon": 18.3,
    "carbon_pct": 46.8,
    "hydrogen_pct": 5.9,
    "nitrogen_pct": 0.7,
    "oxygen_pct": 39.9,
    "sulfur_pct": 0.2,
    "glucose_pct": 38.5,
    "xylose_pct": 21.2,
    "lignin_pct": 15.8,
    "energy_content_mj_kg": 17.5,
    "processing_suitability": ["pyrolysis", "direct_combustion", "anaerobic_digestion"]
  },
  "Straw & Stubble": {
    "display_name": "Straw & Stubble (Grain Crops)",
    "moisture_content": 0.14,
    "ash_content": 8.5,
    "volatile_solids": 72.0,
    "fixed_carbon": 19.5,
    "carbon_pct": 45.2,
    "hydrogen_pct": 5.8,
    "nitrogen_pct": 0.6,
    "oxygen_pct": 39.9,
    "sulfur_pct": 0.1,
    "glucose_pct": 35.0,
    "xylose_pct": 22.5,
    "lignin_pct": 17.0,
    "energy_content_mj_kg": 16.8,
    "processing_suitability": ["pyrolysis", "direct_combustion"]
  }
  // ... additional residue types
}
```

**Tier 2 Fields (NOT in tiles)**:

| Field Name | Data Type | Description |
|------------|-----------|-------------|
| `moisture_content` | Float | Moisture content as decimal (0-1) |
| `ash_content` | Float | Ash content as percentage (0-100) |
| `volatile_solids` | Float | Volatile solids as percentage (0-100) |
| `fixed_carbon` | Float | Fixed carbon as percentage (0-100) |
| `carbon_pct` | Float | Carbon percentage of dry residue |
| `hydrogen_pct` | Float | Hydrogen percentage of dry residue |
| `nitrogen_pct` | Float | Nitrogen percentage of dry residue |
| `oxygen_pct` | Float | Oxygen percentage of dry residue |
| `sulfur_pct` | Float | Sulfur percentage of dry residue |
| `glucose_pct` | Float | Glucose percentage (compositional) |
| `xylose_pct` | Float | Xylose percentage (compositional) |
| `lignin_pct` | Float | Lignin percentage (compositional) |
| `energy_content_mj_kg` | Float | Energy content in MJ/kg (dry basis) |
| `processing_suitability` | Array[String] | Suitable processing methods |

---

### Tier 3: API Payload (FastAPI Backend)

**Purpose**: Non-constant/frequently updated attributes that require real-time data. If `cost_per_ton` changes in Postgres, the frontend needs to reflect that immediately without waiting for a tile-gen pipeline to run.

**API Endpoint Pattern** (Query Parameters):
```
GET /api/feedstocks?id={feedstock_uuid}
GET /api/feedstocks?min_yield=500&type=almond
GET /api/feedstocks?county=Fresno&residue_type=Prunings
```

**Tier 3 Fields (from API only)**:

| Field Name | Data Type | Description |
|------------|-----------|-------------|
| `cost_per_ton` | Float | Current cost per ton (if known) |
| `availability_status` | String | Current availability status |
| `last_updated` | DateTime | When record was last updated |
| `supplier_info` | Object | Supplier contact information (if available) |
| `contracted` | Boolean | Whether feedstock is under contract |
| `notes` | String | Additional notes or comments |

**Note**: These attributes should be fetched via API calls when a user clicks on a specific feedstock polygon or requests detailed information. They should NOT be included in vector tiles.

### Residue Type Enum (Shared Definition)

**Critical**: The `residue_type` string in vector tiles MUST exactly match the keys in `feedstock_definitions.json`. Use this shared Enum definition:

```typescript
enum ResidueType {
  PRUNINGS = "Prunings",
  STOVER = "Stover", 
  STRAW_STUBBLE = "Straw & Stubble",
  TOP_SILAGE = "Top Silage",
  VINES_LEAVES = "Vines and Leaves",
  STEMS_LEAF_MEAL = "Stems & Leaf Meal",
  GRASS = "Grass"
}
```

### Residue Type Assignment by Crop Category

#### Orchard and Vineyard (residue_type: "Prunings")
- Applies to: Apples, Apricots, Avocados, Cherries, Dates, Figs, Grapes, Kiwis, Nectarines, Olives, Peaches, Pears, Persimmons, Plums, Prunes, Pomegranates, Citrus, Almonds, Pecans, Pistachios, Walnuts

#### Field Crops - Stover (residue_type: "Stover")
- Applies to: Corn, Sorghum, Soybeans

#### Field Crops - Straw (residue_type: "Straw & Stubble")
- Applies to: Wheat, Barley, Oats, Rice, Safflower, Sunflower, Cotton, Rye, Triticale

#### Row Crops (residue_type varies)
- "Top Silage": Artichokes, Carrots, Sugar Beets
- "Vines and Leaves": Beans, Melons, Cucumbers, Squash, Tomatoes, Potatoes, Sweet Potatoes
- "Stems & Leaf Meal": Peppers, Alfalfa

### Yield Calculation (for `total_yield` field)

The `total_yield` field should be calculated during tileset generation:

```
total_yield = acres × dryTonsPerAcre
```

Refer to [CROP_RESIDUE_FACTORS.md](./CROP_RESIDUE_FACTORS.md) for the `dryTonsPerAcre` values by crop type.

### Data Sources

**Tier 1 Data** (for tileset generation):
- `feedstock_id`: Generate UUID for each polygon
- `residue_type`: Map from crop name using CROP_RESIDUE_FACTORS.md
- `total_yield`: Calculate from `acres × dryTonsPerAcre`
- Other fields: From LandIQ source data

**Tier 2 Data** (for `feedstock_definitions.json`):
- Compile from agricultural biomass databases:
  - Phyllis2 Database (https://phyllis.nl/)
  - USDA Agricultural Research Service
  - Peer-reviewed literature
- Values should be representative averages for each `residue_type`

**Tier 3 Data** (for backend database):
- Store in PostgreSQL with FastAPI endpoints
- Update as market conditions and availability change

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

### Related Documentation

- [README_TILESET_SPECS.md](./README_TILESET_SPECS.md) - Tileset specifications overview for backend engineers
- [TILESET_QUICK_REFERENCE.md](./TILESET_QUICK_REFERENCE.md) - Quick lookup table for all tilesets
- [TILESET_UPDATE_GUIDE.md](./TILESET_UPDATE_GUIDE.md) - Step-by-step tileset update procedures
- [TILESET_IMPLEMENTATION_SUMMARY.md](./TILESET_IMPLEMENTATION_SUMMARY.md) - Implementation summary and registry details
- [CROP_RESIDUE_FACTORS.md](./CROP_RESIDUE_FACTORS.md) - Residue factors and `feedstock_definitions.json` template

---

## Change Log

### Version 2.0 (2025-12-16)
- **MAJOR ARCHITECTURE UPDATE**: Implemented Three-Tier Data Architecture for feedstock data
- **Tier 1 (Vector Tiles)**: Reduced to visualization-only attributes (`feedstock_id`, `residue_type`, `total_yield`, `main_crop_name`, `acres`, `county`)
- **Tier 2 (Static JSON)**: Moved all chemical composition constants to `feedstock_definitions.json` for O(1) client-side joins
- **Tier 3 (API Payload)**: Defined real-time/transactional attributes (`cost_per_ton`, `availability_status`) for FastAPI backend
- Added `feedstock_id` (UUID) as critical join key for frontend data integration
- Defined shared `ResidueType` Enum for data consistency between tiles and static JSON
- Specified API endpoint patterns using Query Parameters (`GET /api/feedstocks?id={feedstock_uuid}`)
- Goal: Keep tile sizes <500kb for fast rendering; ensure data freshness for transactional attributes

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
- **Note**: This version is superseded by v2.0 which moves chemical composition to static JSON lookup

### Version 1.0 (Initial)
- Created comprehensive specifications for all existing tilesets
- Documented required attributes for all layers
- Included crop residue calculation methodology

---

## Contact

For questions or clarifications on these specifications, please contact the development team.
