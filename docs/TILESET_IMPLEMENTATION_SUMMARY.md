# Tileset Registry Implementation Summary

## ✅ What Was Implemented (Option A - Staged Rollout)

### 1. Created Centralized Tileset Registry
**File**: `src/lib/tileset-registry.ts`

- Created a single source of truth for all tileset configurations
- Uses **current** tileset IDs so the app continues to work
- Includes TODO comments showing the migration path to new naming convention
- Supports environment variable overrides for testing different versions
- Exports legacy constants for backward compatibility

**Key Features**:
- All 24 tilesets configured (1 feedstock + 17 infrastructure + 6 transportation)
- TypeScript interface `TilesetConfig` defines the structure
- `TILESET_REGISTRY` object is the main export to use throughout the app
- Environment variables can override specific tilesets (e.g., `NEXT_PUBLIC_TILESET_FEEDSTOCK`)

### 2. Updated constants.ts
**File**: `src/lib/constants.ts`

- Now imports and re-exports from the registry
- Maintains backward compatibility for existing code
- `FEEDSTOCK_TILESET_ID` and `INFRASTRUCTURE_LAYERS` now pull from registry

### 3. Updated Map.js
**File**: `src/components/Map.js`

- Imports `TILESET_REGISTRY`
- All tileset sources now use: `TILESET_REGISTRY.{layerName}.tilesetId`
- All layer definitions now use: `TILESET_REGISTRY.{layerName}.sourceLayer`
- **Zero breaking changes** - app works exactly as before, but now centrally managed

**Layers Updated (24 total)**:
- ✅ Feedstock (Crop Residues)
- ✅ Anaerobic Digesters
- ✅ Biorefineries
- ✅ SAF Plants
- ✅ Renewable Diesel Plants
- ✅ Material Recovery Facilities (MRF)
- ✅ Cement Plants
- ✅ Biodiesel Plants
- ✅ Landfills with LFG Projects
- ✅ Wastewater Treatment Plants
- ✅ Waste to Energy Plants
- ✅ Combustion Plants
- ✅ District Energy Systems
- ✅ Food Processors
- ✅ Food Retailers
- ✅ Power Plants
- ✅ Food Banks
- ✅ Farmers Markets
- ✅ Rail Lines
- ✅ Freight Terminals
- ✅ Freight Routes
- ✅ Petroleum Pipelines
- ✅ Crude Oil Pipelines
- ✅ Natural Gas Pipelines

---

## 📋 Next Steps

### Phase 1: Testing (Do This First)
1. **Test the application locally**
   ```bash
   npm run dev
   ```

2. **Verify all layers load correctly**
   - Check map loads without console errors
   - Toggle each layer on/off in the UI
   - Click on features to test popups
   - Test siting analysis functionality

3. **If everything works:**
   - Commit changes
   - Deploy to staging
   - Test on staging environment

### Phase 2: Backend Team - Generate New Tilesets

When backend team is ready to generate new tilesets with the new naming convention:

**New Tileset Naming Format:**
```
sustainasoft.cal-bioscape-{source}-{category}-{YYYY-MM}
```

**Examples:**
- `sustainasoft.cal-bioscape-landiq-cropland-2024-10`
- `sustainasoft.cal-bioscape-epa-wastewater-2024-10`
- `sustainasoft.cal-bioscape-ftot-raillines-2024-10`

**Critical Requirement:**
- **Source layer names MUST be stable** (no version suffixes)
- Example: Use `cropland_land_iq` instead of `cropland_land_iq_2023`

**For Each Tileset:**
1. Generate tileset with new naming convention
2. Use stable source layer name (see registry TODO comments for target names)
3. Upload to Mapbox under `sustainasoft` account
4. Notify frontend team with tileset ID

### Phase 3: Frontend Team - Update Registry

When backend provides new tileset ID, update is a **single line change**:

**Example - Updating Feedstock Tileset:**

Open `src/lib/tileset-registry.ts` and change:

```typescript
feedstock: {
  // Before
  tilesetId: 'tylerhuntington222.cropland_landiq_2023',
  sourceLayer: 'cropland_land_iq_2023',
  
  // After
  tilesetId: 'sustainasoft.cal-bioscape-landiq-cropland-2024-10',
  sourceLayer: 'cropland_land_iq', // Now stable!
  
  displayName: 'Crop Residues',
  category: 'feedstock',
  version: '2024-10' // Update version
},
```

That's it! Rebuild and redeploy.

---

## 🔄 Future Tileset Updates

When tilesets need to be regenerated (e.g., quarterly data updates):

### Backend Team:
1. Generate new tileset with updated version: `sustainasoft.cal-bioscape-landiq-cropland-2025-01`
2. **Keep source layer name the same**: `cropland_land_iq`
3. Upload to Mapbox
4. Notify frontend team

### Frontend Team:
1. Update ONE line in `src/lib/tileset-registry.ts`:
   ```typescript
   tilesetId: 'sustainasoft.cal-bioscape-landiq-cropland-2025-01', // Just change version
   ```
2. Rebuild and redeploy

**No other code changes needed!**

---

## 🧪 Testing Different Tileset Versions

To test a new tileset version without committing code:

### Local Development
Create `.env.local`:
```bash
NEXT_PUBLIC_TILESET_FEEDSTOCK=sustainasoft.cal-bioscape-landiq-cropland-2025-01-test
```

Restart dev server:
```bash
npm run dev
```

### Staging Environment
Update `cloudbuild-staging.yaml`:
```yaml
substitutions:
  _NEXT_PUBLIC_TILESET_FEEDSTOCK: 'sustainasoft.cal-bioscape-landiq-cropland-2025-01'
```

This allows staging to use a different tileset version than production!

---

## 📊 Tileset Registry Structure Reference

```typescript
export interface TilesetConfig {
  tilesetId: string;        // Full Mapbox tileset ID
  sourceLayer: string;       // Stable name within tileset (no version suffix)
  displayName: string;       // Human-readable name for UI
  category: string;          // 'feedstock', 'infrastructure', or 'transportation'
  version: string;           // Date-based version (YYYY-MM) or 'current'
}
```

**Access in Code:**
```typescript
import { TILESET_REGISTRY } from '@/lib/tileset-registry';

// Get tileset ID
const tilesetId = TILESET_REGISTRY.feedstock.tilesetId;

// Get source layer
const sourceLayer = TILESET_REGISTRY.feedstock.sourceLayer;

// Get display name
const displayName = TILESET_REGISTRY.feedstock.displayName;
```

---

## 🎯 Benefits of This Approach

1. **Works Now**: App continues to function with current tilesets
2. **Easy Migration**: Backend can generate new tilesets at their own pace
3. **Simple Updates**: One-line changes per tileset
4. **Multi-Environment Support**: Different tileset versions in dev/staging/prod
5. **No Code Duplication**: Single source of truth
6. **Type Safety**: TypeScript interfaces prevent errors
7. **Future-Proof**: Scales easily as more tilesets are added

---

## ❗ Important Notes

1. **DO NOT** change source layer names in the registry unless backend also updates them in the tileset
2. **TEST** locally before deploying any registry changes
3. **DOCUMENT** any tileset updates in the TILESET_SPECIFICATIONS.md file
4. **COORDINATE** with backend team on naming and timing
5. **VERSION** tracking: Update the `version` field when changing `tilesetId`

---

## 📚 Related Documentation

- `TILESET_SPECIFICATIONS.md` - Complete tileset specifications for backend
- `TILESET_UPDATE_GUIDE.md` - Step-by-step update procedures
- `TILESET_QUICK_REFERENCE.md` - Quick lookup for all tilesets
- `CROP_RESIDUE_FACTORS.md` - Crop residue calculation methodology

---

## 🆘 Troubleshooting

### Map not loading?
1. Check browser console for errors
2. Verify Mapbox token is set: `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`
3. Check registry imports in Map.js
4. Ensure tileset IDs are correct in registry

### Layer not appearing?
1. Check tileset ID exists in Mapbox
2. Verify source layer name matches what's in the tileset
3. Check layer visibility settings in Map.js
4. Inspect network tab for 404 errors

### Environment override not working?
1. Ensure variable starts with `NEXT_PUBLIC_`
2. Restart dev server after changing `.env.local`
3. Check variable name matches exactly in `ENV_OVERRIDES`
4. Verify you're using the `TILESET_REGISTRY` not `DEFAULT_TILESET_REGISTRY`

---

**Implementation Date**: 2024-10-16  
**Status**: ✅ Complete and Ready for Testing  
**Next Action**: Test locally, then deploy to staging
