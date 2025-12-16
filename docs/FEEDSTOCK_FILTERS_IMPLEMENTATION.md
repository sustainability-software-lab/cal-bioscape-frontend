# Feedstock Characteristic Filters Implementation

## Overview

This document describes the newly implemented feedstock characteristic filters that allow users to filter crop residues based on multiple attributes beyond seasonal availability.

## Implementation Date
November 21, 2025

## Three-Tier Data Architecture Integration

The feedstock filters work with the Three-Tier Data Architecture:

| Tier | Data Source | Filter Usage |
|------|-------------|--------------|
| **Tier 1** | Vector Tiles | Filter by `residue_type` (direct tile query) |
| **Tier 2** | `feedstock_definitions.json` | Filter by moisture, energy, processing (client-side join) |
| **Tier 3** | Backend API | Not used for filtering (real-time data) |

**How it works:**
1. User selects filter criteria (e.g., "High Energy", "Low Moisture")
2. Frontend looks up which `residue_type` values match the criteria using `feedstock_definitions.json`
3. Frontend applies Mapbox filter on `residue_type` field in tiles
4. Only matching polygons are displayed

## New Features

### 1. Feedstock Type Category Filter
Filters crops by the type of residue they produce:
- **Grain Crop Residues**: Corn, wheat, rice, barley, oats, etc.
- **Vegetable Crop Residues**: Carrots, broccoli, lettuce, tomatoes, etc.
- **Fruit Crop Residues**: Apples, grapes, citrus, berries, etc.
- **Nut Crop Residues**: Almonds, walnuts, pistachios, pecans
- **Fiber Crop Residues**: Cotton
- **Forage/Hay Residues**: Alfalfa, grass seed

### 2. Moisture Content Filter
Filters based on moisture content levels:
- **Low (<15%)**: Ideal for thermal processes like pyrolysis and direct combustion
  - Examples: Grain straws (wheat, barley, corn stover), cotton
- **Medium (15-30%)**: Suitable for various processes with moderate drying
  - Examples: Orchard prunings (fruit trees, nuts)
- **High (>30%)**: Best for anaerobic digestion and composting
  - Examples: Vegetable residues, fresh plant materials

### 3. Energy Content Filter
Filters by calorific value (heating value):
- **Low (<12 MJ/kg)**: Lower energy content
  - Examples: High-moisture vegetable residues
- **Medium (12-17 MJ/kg)**: Moderate energy content
  - Examples: Rice straw, cotton, alfalfa, fruit prunings
- **High (>17 MJ/kg)**: High energy content, excellent for combustion and energy generation
  - Examples: Corn stover, wheat straw, soybean stover, nut prunings

## Files Modified

### 1. `/src/lib/constants.ts`
**Added:**
- `FEEDSTOCK_CATEGORIES`: Object defining feedstock type categories
- `MOISTURE_CONTENT_LEVELS`: Object defining moisture content classifications
- `ENERGY_CONTENT_LEVELS`: Object defining energy content classifications
- `PROCESSING_TYPES`: Object defining processing method types
- `FEEDSTOCK_CHARACTERISTICS`: Comprehensive mapping of all crop residues to their characteristics
- `getFeedstockCharacteristics()`: Helper function to retrieve characteristics for any crop

**Characteristics Defined for 60+ Crop Types:**
Each crop's residue has been classified based on:
- Category (grain, vegetable, fruit, nut, fiber, forage)
- Moisture level (low, medium, high)
- Energy level (low, medium, high)
- Processing suitability (array of suitable processes)

### 2. `/src/components/LayerControls.tsx`
**Added:**
- Import statements for new constants
- State variables for each filter type:
  - `selectedFeedstockCategories`
  - `selectedMoistureLevels`
  - `selectedEnergyLevels`
  - `selectedProcessingTypes`
- `isCropMatchingFilters()`: Comprehensive filter function checking all criteria
- `applyAllFilters()`: Function to apply all filters to the map
- Handler functions for each filter type:
  - `handleFeedstockCategoryChange()`
  - `handleMoistureLevelChange()`
  - `handleEnergyLevelChange()`
  - `handleProcessingTypeChange()`
- useEffect hook to automatically apply filters when any filter state changes
- UI components for all four new filters in the Filters accordion section

## How the Filters Work

### Filter Logic
The filters use an **AND** logic between different filter types and **OR** logic within the same filter type:

1. **Between filter types (AND)**: A crop must match ALL selected filter types
   - Example: If you select "High Energy" AND "Pyrolysis", only crops with high energy that are suitable for pyrolysis will be shown

2. **Within filter types (OR)**: A crop must match AT LEAST ONE selected option
   - Example: If you select both "Low" and "High" moisture, crops with either low OR high moisture will be shown

3. **Special case for Processing Suitability**: A crop is shown if it's suitable for ANY of the selected processing types

4. **Empty filter behavior**: If ALL checkboxes in a filter section are unchecked, NO crops will be shown
   - This is the expected behavior: no selection = no results
   - To see all crops again, check at least one box in each filter section

### Filter Interaction Flow
1. User changes any filter (checks/unchecks a box or moves the seasonal slider)
2. React state updates for that filter
3. useEffect detects the state change
4. `applyAllFilters()` is called
5. `isCropMatchingFilters()` checks each crop against all active filters
6. Mapbox layer filter is updated to show only matching crops
7. Map automatically re-renders with filtered results

## Usage Examples

### Example 1: Find High-Energy Feedstocks for Combustion
1. Under "Energy Content", select only "High (>17 MJ/kg)"
2. Under "Processing Suitability", select only "Direct Combustion"
3. Result: Shows crops like corn stover, wheat straw, and grain residues

### Example 2: Find Feedstocks for Anaerobic Digestion
1. Under "Moisture Content", select "High (>30%)"
2. Under "Processing Suitability", select "Anaerobic Digestion"
3. Result: Shows vegetable residues and other high-moisture materials

### Example 3: Find Grain Residues Available in Summer
1. Under "Feedstock Seasonal Availability", set range to June-August
2. Under "Feedstock Type", select only "Grain Crop Residues"
3. Result: Shows grain crops harvested in summer (wheat, barley, etc.)

### Example 4: Find All Low-Moisture Options
1. Under "Moisture Content", select only "Low (<15%)"
2. Leave other filters with all options selected (default)
3. Result: Shows all dry residues including straws, stalks, and prunings

## Data Sources

The feedstock characteristics are based on:
- Agricultural biomass research literature
- Pyrolysis and biochar production studies
- Moisture content data from agricultural extension services
- Energy content values from biomass energy research
- Processing suitability based on industry best practices

Key references:
- onnu.com: Characteristics of good feedstocks for pyrolysis
- UC Agriculture & Natural Resources: Biochar feedstock profiles
- CalRecycle: Organic feedstock profiles

**Note**: As part of the Three-Tier Data Architecture, these characteristics are stored in the static `feedstock_definitions.json` file (Tier 2), NOT in the vector tiles. The frontend fetches this JSON once on load and uses it for:
1. Client-side joins to display detailed feedstock information
2. Determining which `residue_type` values match filter criteria
3. O(1) lookups for any chemical composition data

See [CROP_RESIDUE_FACTORS.md](./CROP_RESIDUE_FACTORS.md) for the complete `feedstock_definitions.json` template.

## Related Documentation

- [TILESET_SPECIFICATIONS.md](./TILESET_SPECIFICATIONS.md) - Complete tileset specifications
- [TILESET_QUICK_REFERENCE.md](./TILESET_QUICK_REFERENCE.md) - Quick reference guide
- [CROP_RESIDUE_FACTORS.md](./CROP_RESIDUE_FACTORS.md) - Residue factors and JSON template
- [FEEDSTOCK_FILTERS_QUICK_START.md](./FEEDSTOCK_FILTERS_QUICK_START.md) - Quick start guide for filters

## Technical Implementation Details

### Performance Considerations
- Filters are applied on the client side for instant responsiveness
- Direct Mapbox filter updates avoid full component re-renders
- useMemo and useCallback optimize re-renders where appropriate
- Debouncing with 100ms timeout prevents excessive filter applications

### Browser Compatibility
- Works in all modern browsers (Chrome, Firefox, Safari, Edge)
- Requires JavaScript enabled
- Responsive design adapts to different screen sizes

### Data Integrity
- All 60+ crop types have complete characteristic data
- Standardized crop name mapping ensures consistency
- Fallback behavior: If characteristics not defined, crop is shown by default

## Future Enhancements (Potential)

1. **Additional Filter Categories**
   - Ash content levels
   - Carbon-to-nitrogen ratio
   - Bulk density ranges
   - Transportation distance considerations

2. **Advanced Features**
   - Save filter presets
   - Export filtered results
   - Compare feedstock characteristics side-by-side
   - Integration with facility location to suggest nearest suitable feedstocks

3. **Data Enhancements**
   - Add actual calorific values (MJ/kg) as data points
   - Include ash content percentages
   - Add collection/harvest timing information

## Testing Checklist

- [ ] All filters appear in the UI
- [ ] Checkboxes respond to user interaction
- [ ] Filters update the map layer correctly
- [ ] Multiple filters work together (AND logic)
- [ ] Seasonal availability filter still works
- [ ] Crop type filter still works
- [ ] No console errors
- [ ] Mobile responsive layout works
- [ ] Tooltips provide helpful information
- [ ] Filter state persists during session

## Maintenance Notes

To add a new crop:
1. Add residue factors to appropriate constant in `/src/lib/constants.ts` (ORCHARD_VINEYARD_RESIDUES, ROW_CROP_RESIDUES, or FIELD_CROP_RESIDUES)
2. Add mapping entry in CROP_NAME_MAPPING
3. Add characteristics entry in FEEDSTOCK_CHARACTERISTICS with:
   - category
   - moistureLevel
   - energyLevel
   - processingSuitability array

To add a new filter category:
1. Define constants for the new category (like FEEDSTOCK_CATEGORIES)
2. Add new field to FEEDSTOCK_CHARACTERISTICS
3. Add state variable in LayerControls.tsx
4. Update isCropMatchingFilters() function with new logic
5. Add handler function
6. Add UI components in the Filters section
7. Add new state to useEffect dependencies

## Support

For questions or issues with the feedstock filters:
1. Check browser console for error messages
2. Verify all checkboxes are responding
3. Check that seasonal availability filter still works
4. Review this documentation
5. Contact development team with specific filter combination that's not working
