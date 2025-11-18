# Tileset Specification Documentation

This directory contains comprehensive specifications for all tilesets used in the Cal-Bioscape Siting Tool. These documents are intended for backend engineers who will be generating or updating tilesets when underlying data sources are refreshed.

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

### Priority: LandIQ Feedstock Tileset

The **most important enhancement** is adding calculated residue attributes to the LandIQ feedstock tileset:

#### Current Attributes (existing in tileset)
- `main_crop_name` - Crop type name
- `main_crop_code` - Crop code
- `acres` - Field area
- `county` - County name
- `region` - Geographic region
- `hydro_region` - Hydrologic region

#### New Attributes to Add (calculated/looked up from databases)

**Tier 1A: Residue Quantity (HIGHEST PRIORITY)**
- `residue_wet_tons` - Total wet tons of residue for this field
- `residue_dry_tons` - Total dry tons of residue for this field
- `residue_type` - Type of residue (e.g., "Prunings", "Stover", "Vines and Leaves")
- `moisture_content` - Moisture content as decimal (0-1)

**Tier 1B: Proximate Analysis (HIGHEST PRIORITY)**
- `ash_content` - Ash content as percentage (0-100)
- `volatile_solids` - Volatile solids as percentage (0-100)
- `fixed_carbon` - Fixed carbon as percentage (0-100)

**Note**: Moisture content is the MOST CRITICAL attribute for filtering, as it has a massive effect on all downstream processing decisions.

**Tier 2: Ultimate & Compositional Analysis (HIGH PRIORITY)**
- `carbon_pct` - Carbon percentage of dry residue
- `hydrogen_pct` - Hydrogen percentage of dry residue
- `nitrogen_pct` - Nitrogen percentage of dry residue
- `oxygen_pct` - Oxygen percentage of dry residue
- `sulfur_pct` - Sulfur percentage of dry residue
- `glucose_pct` - Glucose percentage (compositional)
- `xylose_pct` - Xylose percentage (compositional)
- `lignin_pct` - Lignin percentage (compositional)
- `energy_content_mj_kg` - Energy content in MJ/kg (dry basis)

**Tier 3: Additional Elemental Analysis (OPTIONAL - Lower Priority)**
- `phosphorus_pct` - Phosphorus percentage (if data available)
- `potassium_pct` - Potassium percentage (if data available)
- `silica_pct` - Silica percentage (if data available)

**Calculation Process:**
1. Read the crop name from `main_crop_name`
2. Look up standardized name in mapping table (CROP_RESIDUE_FACTORS.md)
3. Find residue factors in appropriate table (Orchard/Row/Field crops)
4. Calculate: `residue_wet_tons = acres × wetTonsPerAcre`
5. Calculate: `residue_dry_tons = acres × dryTonsPerAcre`
6. Look up chemical composition data from biomass databases (by residue type)
7. Add all attributes to the feature

**Example:**
```javascript
// Input feature
{
  "main_crop_name": "Almonds",
  "acres": 150.5
}

// After processing (with residue factors & composition data)
{
  "main_crop_name": "Almonds",
  "acres": 150.5,
  // Tier 1A: Quantity
  "residue_wet_tons": 376.25,
  "residue_dry_tons": 225.75,
  "residue_type": "Prunings",
  "moisture_content": 0.40,
  // Tier 1B: Proximate Analysis
  "ash_content": 3.2,
  "volatile_solids": 78.5,
  "fixed_carbon": 18.3,
  // Tier 2: Ultimate & Compositional
  "carbon_pct": 48.5,
  "hydrogen_pct": 6.1,
  "nitrogen_pct": 0.8,
  "oxygen_pct": 41.4,
  "sulfur_pct": 0.1,
  "glucose_pct": 42.0,
  "xylose_pct": 18.5,
  "lignin_pct": 22.0,
  "energy_content_mj_kg": 18.2,
  // Tier 3: Optional
  "phosphorus_pct": null,
  "potassium_pct": null,
  "silica_pct": null
}
```

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

## Contact

For questions or clarifications:
- Review the detailed specifications in TILESET_SPECIFICATIONS.md
- Check calculation examples in CROP_RESIDUE_FACTORS.md
- Contact the development team with specific questions

---

**Document Version**: 1.2  
**Last Updated**: 2024-10-16  
**Status**: Production Ready

### Version History
- **v1.2** (2024-10-16): Updated to reflect new standardized naming convention (`sustainasoft.cal-bioscape-*`), stable source layer names, and tileset registry management system. Added reference to TILESET_UPDATE_GUIDE.md.
- **v1.1** (2024-10-16): Added 23 chemical composition fields (Proximate, Ultimate, Compositional, Elemental analysis) to LandIQ tileset requirements per backend engineer feedback
- **v1.0**: Initial documentation release
