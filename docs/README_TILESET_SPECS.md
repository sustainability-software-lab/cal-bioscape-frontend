# Tileset Specification Documentation

This directory contains comprehensive specifications for all tilesets used in the Cal-Bioscape Siting Tool. These documents are intended for backend engineers who will be generating or updating tilesets when underlying data sources are refreshed.

## Three-Tier Data Architecture

Feedstock data is partitioned into three accessibility tiers for optimal performance and data freshness:

| Tier | Location | Content | Update Frequency |
|------|----------|---------|------------------|
| **Tier 1** | MapBox Vector Tiles | Geometry + `feedstock_id` + `residue_type` + `total_yield` | When geometries/yields change |
| **Tier 2** | Static JSON (`feedstock_definitions.json`) | Compositional constants (ash, moisture, carbon, etc.) | Rarely (constants per residue_type) |
| **Tier 3** | Backend API (FastAPI) | Real-time data (`cost_per_ton`, `availability_status`) | Live updates |

**Design Principles:**
- Keep vector tiles "thin" (<500kb) for fast rendering
- Chemical composition is constant per `residue_type` → use O(1) client-side joins
- Transactional data requires real-time API access, not tile regeneration

## Tileset Naming Convention

All tilesets follow a standardized naming format with date-based versioning:

```
sustainasoft.cal-bioscape-{dataset-source}-{category}-{YYYY-MM}
```

**Examples:**
- `sustainasoft.cal-bioscape-landiq-cropland-2024-10`
- `sustainasoft.cal-bioscape-epa-wastewater-2024-10`
- `sustainasoft.cal-bioscape-ftot-raillines-2024-10`

**Critical**: Source layer names remain **stable** across tileset versions. Only the tileset ID changes with each update.

## Related Documentation

- [TILESET_SPECIFICATIONS.md](./TILESET_SPECIFICATIONS.md) - Main specification document
- [TILESET_QUICK_REFERENCE.md](./TILESET_QUICK_REFERENCE.md) - Quick lookup table
- [TILESET_UPDATE_GUIDE.md](./TILESET_UPDATE_GUIDE.md) - Update procedures
- [TILESET_IMPLEMENTATION_SUMMARY.md](./TILESET_IMPLEMENTATION_SUMMARY.md) - Implementation summary
- [CROP_RESIDUE_FACTORS.md](./CROP_RESIDUE_FACTORS.md) - Residue factors and JSON template
- [FEEDSTOCK_FILTERS_IMPLEMENTATION.md](./FEEDSTOCK_FILTERS_IMPLEMENTATION.md) - Filter implementation

---

## Document Overview

### 1. [TILESET_SPECIFICATIONS.md](./TILESET_SPECIFICATIONS.md)
**Main specification document** - Contains detailed specifications for all tilesets including:

- **Feedstock/Crop Residues** - LandIQ 2023 cropland data with calculated residue attributes
- **Infrastructure Layers** (17 layers) - Processing facilities, energy systems, waste management
- **Transportation Layers** (6 layers) - Rail, freight, and pipeline networks

For each tileset, the document specifies:
- Tileset ID and source layer name
- Geometry type (Point, LineString, Polygon)
- Required field names with exact spelling and case
- Data types for each field
- Display labels used in the UI
- Special filters or requirements
- Visual styling information (colors, symbols)

### 2. [CROP_RESIDUE_FACTORS.md](./CROP_RESIDUE_FACTORS.md)
**Crop residue calculation reference** - Provides complete residue factor data for the LandIQ feedstock tileset:

- Orchard and Vineyard residue factors (21 crops)
- Row Crop residue factors (26 crops)
- Field Crop residue factors (18 crops)
- Crop name mapping table
- Seasonal availability data by month
- Calculation examples with sample data
- Implementation guidelines

### 3. [TILESET_UPDATE_GUIDE.md](./TILESET_UPDATE_GUIDE.md)
**Tileset update procedures** - Step-by-step guide for updating tilesets:

- Complete update workflow (backend and frontend)
- Environment variable overrides for testing
- Common update scenarios (quarterly updates, testing, rollback)
- Troubleshooting guide
- Best practices
- Registry file reference

## Key Requirements for Backend Engineers

### Critical Points

1. **Field Name Precision**
   - Field names are **case-sensitive** and must match exactly
   - Example: `main_crop_name` (not `Main_Crop_Name` or `main_crop_Name`)
   - Spaces and special characters matter (e.g., `CLEAR PET_TPD` includes space and underscore)

2. **Data Types**
   - Strings: Text values (e.g., crop names, addresses)
   - Float: Decimal numbers (e.g., acres, tons, coordinates)
   - Integer: Whole numbers (e.g., counts, years)

3. **Coordinate System**
   - All data must be in **WGS84 (EPSG:4326)**
   - Longitude: -180 to 180
   - Latitude: -90 to 90

4. **Geometry Validation**
   - All geometries must be valid per OGC Simple Features specification
   - No self-intersecting polygons
   - Proper winding order (counter-clockwise for exterior rings)

5. **Data Consistency (Critical)**
   - The `residue_type` string in tiles MUST exactly match keys in `feedstock_definitions.json`
   - Use the shared Enum definition to ensure consistency
   - Example: If tile says "Almond" and JSON says "Almond Prunings", the client-side join fails

### Priority: LandIQ Feedstock Tileset

The LandIQ feedstock tileset follows the **Three-Tier Data Architecture**:

#### Tier 1: Vector Tile Attributes (ONLY these go in tiles)

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| `feedstock_id` | UUID | Unique identifier for API lookups and data joins | Yes |
| `residue_type` | String | Must match `feedstock_definitions.json` keys exactly | Yes |
| `total_yield` | Float | Calculated: `acres × dryTonsPerAcre` | Yes |
| `main_crop_name` | String | Crop type name for display | Yes |
| `acres` | Float | Field area | Yes |
| `county` | String | County name | Yes |

**Goal**: Keep tiles <500kb for fast rendering. Do NOT include chemical composition data.

#### Tier 2: Static JSON File (feedstock_definitions.json)

**Location**: Host on GCS Bucket/CDN

Chemical composition constants are **constant per `residue_type`** (e.g., all Almonds have ~3.2% Ash). These should NOT be in tiles or fetched via DB queries.

```json
{
  "Prunings": {
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
  }
}
```

Frontend performs O(1) client-side joins using `residue_type` as the key.

#### Tier 3: API Payload (FastAPI Backend)

Real-time/transactional data fetched via API when needed:

```
GET /api/feedstocks?id={feedstock_uuid}
GET /api/feedstocks?min_yield=500&type=almond
```

| Field | Type | Description |
|-------|------|-------------|
| `cost_per_ton` | Float | Current market cost (if known) |
| `availability_status` | String | Current availability |
| `contracted` | Boolean | Whether under contract |
| `last_updated` | DateTime | Last update timestamp |

**Tileset Generation Process:**
1. Read the crop name from `main_crop_name`
2. Generate UUID for `feedstock_id`
3. Look up standardized name in mapping table (CROP_RESIDUE_FACTORS.md)
4. Assign `residue_type` based on crop category
5. Calculate: `total_yield = acres × dryTonsPerAcre`
6. Include ONLY Tier 1 fields in the tileset

**Example Output (Tile Feature):**
```json
{
  "feedstock_id": "550e8400-e29b-41d4-a716-446655440000",
  "residue_type": "Prunings",
  "total_yield": 225.75,
  "main_crop_name": "Almonds",
  "acres": 150.5,
  "county": "Fresno"
}
```

**Note**: All chemical composition fields (ash_content, moisture_content, carbon_pct, etc.) are in `feedstock_definitions.json`, NOT in the tileset.

## Tileset Inventory

### Feedstock Layer
1. **LandIQ Cropland 2023** - Polygon layer with ~450,000 agricultural fields

### Infrastructure Layers (17 total)
1. Livestock Anaerobic Digesters
2. Ethanol Biorefineries
3. Sustainable Aviation Fuel Plants
4. Renewable Diesel Plants
5. Material Recovery Facilities
6. Cement Plants
7. Biodiesel Plants
8. Landfills with LFG Projects
9. Wastewater Treatment Plants
10. Waste to Energy Plants
11. Combustion Plants
12. District Energy Systems
13. Food Processors
14. Food Retailers
15. Power Plants
16. Food Banks
17. Farmers' Markets

### Transportation Layers (6 total)
1. Rail Lines
2. Freight Terminals
3. Freight Routes
4. Petroleum Pipelines
5. Crude Oil Pipelines
6. Natural Gas Pipelines

## Tileset Generation Workflow

### Recommended Process

1. **Prepare Source Data**
   - Validate geometry (no invalid polygons/lines)
   - Ensure WGS84 coordinate system
   - Clean attribute data (trim whitespace, handle nulls)

2. **Add Required Attributes**
   - For LandIQ: Calculate and add residue attributes
   - For all layers: Ensure all required fields are present
   - Use exact field names from specifications

3. **Validate Data**
   - Check field names match exactly
   - Verify data types are correct
   - Test with sample features

4. **Generate Tileset**
   - Use Mapbox Tiling Service or tippecanoe
   - Apply appropriate zoom levels (typically 0-14)
   - Optimize for file size and performance

5. **Test in Application**
   - Verify layers load correctly
   - Test popup functionality
   - Check filters work as expected
   - Validate visual rendering

6. **Upload to Mapbox**
   - Account: `sustainasoft`
   - Follow standardized naming convention: `sustainasoft.cal-bioscape-{source}-{category}-{YYYY-MM}`
   - Use **stable** source layer names (no version suffixes)
   - Notify frontend team of new tileset ID for registry update

## Tools and Technologies

### Recommended Tools
- **Mapbox Tiling Service** - Official Mapbox tileset generation
- **Tippecanoe** - Open-source vector tile generator
- **GDAL/OGR** - Geospatial data processing
- **GeoPandas** (Python) - Data manipulation and calculations
- **PostGIS** - Spatial database operations

### Mapbox Upload
```bash
# Example using Mapbox CLI
mapbox upload sustainasoft.cal-bioscape-landiq-cropland-2024-10 cropland_data.mbtiles

# Or for GeoJSON source
mapbox upload sustainasoft.cal-bioscape-epa-wastewater-2024-10 wastewater.geojson
```

**Important**: When generating the tileset, ensure the internal source layer name is stable (e.g., `cropland_land_iq` without version suffix).

## Quality Assurance Checklist

Before uploading a tileset:

- [ ] All required fields are present with exact field names
- [ ] Data types match specifications
- [ ] Coordinate system is WGS84 (EPSG:4326)
- [ ] Geometries are valid (no errors)
- [ ] Calculated fields are accurate (for LandIQ)
- [ ] Null handling is consistent
- [ ] File size is optimized
- [ ] Tested sample features in application
- [ ] Documentation updated with any changes

## Support and Questions

### If Field Names Are Unclear
- Check the exact spelling in TILESET_SPECIFICATIONS.md
- Look for the field in labelMappings.js (shows display labels)
- Field names are case-sensitive and must match exactly

### If Residue Calculations Don't Match
- Verify crop name mapping is correct
- Check that correct residue factor table is used (Orchard/Row/Field)
- Ensure calculations use exact formula: `acres × residueFactor`
- Review calculation examples in CROP_RESIDUE_FACTORS.md

### If Tileset Won't Load
- Verify geometry is valid
- Check coordinate system is WGS84
- Ensure zoom levels are appropriate (0-14)
- Test with a small sample first

## Tileset Update Process

When updating tilesets (e.g., quarterly data refresh):

### Backend Team
1. Generate new tileset with updated version identifier (e.g., `2024-10` → `2025-01`)
2. Keep source layer name stable (no version suffix)
3. Upload to Mapbox account: `sustainasoft`
4. Notify frontend team with new tileset ID

### Frontend Team
1. Update `src/lib/tileset-registry.ts` with new tileset ID
2. Update TILESET_SPECIFICATIONS.md with new version
3. Test locally before deploying
4. Deploy to staging, then production

For detailed procedures, see [TILESET_UPDATE_GUIDE.md](./TILESET_UPDATE_GUIDE.md).

## See Also

- [TILESET_SPECIFICATIONS.md](./TILESET_SPECIFICATIONS.md) - Complete tileset specifications
- [TILESET_QUICK_REFERENCE.md](./TILESET_QUICK_REFERENCE.md) - Quick reference guide
- [CROP_RESIDUE_FACTORS.md](./CROP_RESIDUE_FACTORS.md) - Residue factors and JSON template

## Contact

For questions or clarifications:
- Review the detailed specifications in TILESET_SPECIFICATIONS.md
- Check calculation examples in CROP_RESIDUE_FACTORS.md
- Contact the development team with specific questions

---

**Document Version**: 2.0  
**Last Updated**: 2025-12-16  
**Status**: Production Ready

### Version History
- **v2.0** (2025-12-16): **MAJOR UPDATE** - Implemented Three-Tier Data Architecture. Vector tiles now contain only visualization attributes (`feedstock_id`, `residue_type`, `total_yield`). Chemical composition moved to static `feedstock_definitions.json`. Real-time data via FastAPI. Added `feedstock_id` UUID as critical join key. Defined shared `ResidueType` Enum for data consistency.
- **v1.2** (2024-10-16): Updated to reflect new standardized naming convention (`sustainasoft.cal-bioscape-*`), stable source layer names, and tileset registry management system. Added reference to TILESET_UPDATE_GUIDE.md.
- **v1.1** (2024-10-16): Added 23 chemical composition fields (Proximate, Ultimate, Compositional, Elemental analysis) to LandIQ tileset requirements per backend engineer feedback. **Note**: Superseded by v2.0 which moves these to static JSON.
- **v1.0**: Initial documentation release
