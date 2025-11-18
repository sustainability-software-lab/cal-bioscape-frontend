# Tileset Update Guide

This guide provides step-by-step procedures for updating tilesets in the Cal-Bioscape Siting Tool.

## Overview

The Cal-Bioscape Siting Tool uses a simplified tileset management system based on:
1. **Standardized naming convention** with date-based versioning
2. **Stable source layer names** across tileset versions
3. **Centralized registry** in the frontend code
4. **Optional environment variable overrides** for testing

---

## Quick Reference

### Naming Convention

```
sustainasoft.cal-bioscape-{dataset-source}-{category}-{YYYY-MM}
```

**Examples:**
- `sustainasoft.cal-bioscape-landiq-cropland-2024-10`
- `sustainasoft.cal-bioscape-epa-wastewater-2025-01`
- `sustainasoft.cal-bioscape-ftot-raillines-2024-12`

### Key Principle

- ✅ **Tileset ID changes** with each version (increment YYYY-MM)
- ✅ **Source layer name stays stable** across all versions

---

## Complete Update Workflow

### Step 1: Backend Team - Generate New Tileset

#### 1.1 Prepare Source Data
```bash
# Ensure you have the latest source data
# Example: Updated LandIQ crop mapping data
```

#### 1.2 Generate Tileset
Follow the specifications in `TILESET_SPECIFICATIONS.md` to generate the tileset with:
- All required feature attributes
- Correct geometry types
- Proper coordinate system (EPSG:4326 / WGS 84)

#### 1.3 Name the Tileset
Use the standardized naming format with current year-month:

```
sustainasoft.cal-bioscape-{source}-{category}-{YYYY-MM}
```

**Example:**
```
sustainasoft.cal-bioscape-landiq-cropland-2025-01
```

#### 1.4 Set Source Layer Name
**CRITICAL**: Use the **stable** source layer name (without version suffixes):

| Tileset Category | Source Layer Name |
|------------------|-------------------|
| Crop Residues | `cropland_land_iq` |
| Wastewater Plants | `us_wwt_pts` |
| Anaerobic Digesters | `agstar_ad_pts` |
| Biorefineries | `current_biorefineries` |
| SAF/RD Plants | `renewable_diesel_saf_plants` |
| Rail Lines | `us_rail_lines_ftot` |
| ... | (see TILESET_SPECIFICATIONS.md for complete list) |

#### 1.5 Upload to Mapbox
```bash
# Using Mapbox CLI
mapbox upload sustainasoft.cal-bioscape-landiq-cropland-2025-01 tileset_data.mbtiles

# Or use Mapbox Studio web interface
```

#### 1.6 Verify Upload
- Check tileset appears in Mapbox account
- Verify source layer name is correct
- Test a few features to ensure attributes are present

#### 1.7 Notify Frontend Team
Provide the frontend team with:
- New tileset ID
- Source layer name (should match the stable name)
- Generation date
- Any changes to attributes or data structure

---

### Step 2: Frontend Team - Update Application

#### 2.1 Update Tileset Registry

Edit `src/lib/tileset-registry.ts`:

```typescript
// Find the entry for the tileset being updated
export const DEFAULT_TILESET_REGISTRY: Record<string, TilesetConfig> = {
  feedstock: {
    tilesetId: 'sustainasoft.cal-bioscape-landiq-cropland-2025-01', // ← Update this
    sourceLayer: 'cropland_land_iq',  // ← Keep stable
    displayName: 'Crop Residues',
    category: 'feedstock',
    version: '2025-01'  // ← Update this
  },
  // ... other tilesets
};
```

**Only change:**
- `tilesetId`: Update the version identifier (YYYY-MM)
- `version`: Update to match

**Do NOT change:**
- `sourceLayer`: This must remain stable
- `displayName`, `category`: Only change if semantics have changed

#### 2.2 Update Documentation

Update `TILESET_SPECIFICATIONS.md`:
- Update the tileset ID in the relevant section
- Add entry to Change Log
- Document any new or changed attributes

#### 2.3 Test Locally

```bash
# Install dependencies if needed
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

**Verify:**
- ✅ Map loads correctly
- ✅ Tileset layer appears
- ✅ Popups show correct data
- ✅ Filters work as expected
- ✅ No console errors

#### 2.4 Commit Changes

```bash
git add src/lib/tileset-registry.ts
git add TILESET_SPECIFICATIONS.md
git commit -m "Update [tileset-name] to version YYYY-MM"
```

#### 2.5 Deploy

Follow standard deployment procedures:

**Staging:**
```bash
git push origin staging
# Triggers Cloud Build for staging environment
```

**Production:**
```bash
git push origin main
# Triggers Cloud Build for production environment
```

---

## Environment Variable Overrides

For testing different tileset versions without code changes:

### Local Development

Create `.env.local`:

```bash
NEXT_PUBLIC_TILESET_FEEDSTOCK=sustainasoft.cal-bioscape-landiq-cropland-2025-01-test
NEXT_PUBLIC_TILESET_WASTEWATER=sustainasoft.cal-bioscape-epa-wastewater-2024-12-beta
```

### Cloud Build (Staging/Production)

Update environment variables in Google Cloud Build:

```yaml
# cloudbuild-staging.yaml or cloudbuild-prod.yaml
substitutions:
  _NEXT_PUBLIC_TILESET_FEEDSTOCK: 'sustainasoft.cal-bioscape-landiq-cropland-2025-01'
```

---

## Common Scenarios

### Scenario 1: Quarterly Data Update

**Situation**: LandIQ releases new crop mapping data for 2025

**Steps:**
1. Backend: Generate new tileset with `2025-01` version
2. Frontend: Update `DEFAULT_TILESET_REGISTRY` with new tileset ID
3. Test and deploy

**Timeline**: ~1 hour

---

### Scenario 2: Testing New Attributes

**Situation**: Backend team adds new chemical composition fields to test

**Steps:**
1. Backend: Generate test tileset with `-test` suffix (e.g., `2024-10-test`)
2. Frontend: Set environment variable locally:
   ```bash
   NEXT_PUBLIC_TILESET_FEEDSTOCK=sustainasoft.cal-bioscape-landiq-cropland-2024-10-test
   ```
3. Test locally without committing code changes
4. Once validated, remove `-test` suffix and deploy normally

**Timeline**: Immediate testing, ~1 hour to finalize

---

### Scenario 3: Rollback to Previous Version

**Situation**: New tileset has issues, need to revert

**Steps:**
1. Frontend: Edit `tileset-registry.ts` to revert version identifier
2. Commit and deploy

**Timeline**: ~15 minutes

---

### Scenario 4: Multi-Environment Testing

**Situation**: Staging needs to test new tileset while prod uses old version

**Steps:**
1. Backend: Generate new tileset (e.g., `2025-01`)
2. Frontend: Keep `DEFAULT_TILESET_REGISTRY` with old version (e.g., `2024-10`)
3. Update `cloudbuild-staging.yaml` with environment override:
   ```yaml
   substitutions:
     _NEXT_PUBLIC_TILESET_FEEDSTOCK: 'sustainasoft.cal-bioscape-landiq-cropland-2025-01'
   ```
4. Deploy to staging (uses new tileset)
5. Production continues using old tileset from registry
6. Once validated, update registry and deploy to production

**Timeline**: Flexible, no rush to update production

---

## Troubleshooting

### Issue: "Source layer not found"

**Symptoms:**
- Map layer doesn't render
- Console error: "Source layer 'xyz' does not exist on source"

**Causes:**
- Source layer name mismatch between tileset and code
- Backend used wrong source layer name during generation

**Solutions:**
1. Check tileset in Mapbox Studio - verify actual source layer name
2. Ensure `tileset-registry.ts` uses correct `sourceLayer` value
3. If backend used wrong name, regenerate tileset OR temporarily update registry

---

### Issue: "Attributes missing in popups"

**Symptoms:**
- Popup shows "undefined" for certain fields
- Data not appearing as expected

**Causes:**
- Field names changed in new tileset
- Attributes not included during tileset generation

**Solutions:**
1. Inspect feature properties in Mapbox Studio
2. Check `TILESET_SPECIFICATIONS.md` for required attributes
3. Verify backend included all required fields
4. Update `labelMappings.js` if field names changed

---

### Issue: "Map still showing old data"

**Symptoms:**
- Updates not reflected on map
- Old data still visible

**Causes:**
- Browser caching
- CDN caching
- Incorrect tileset ID in registry

**Solutions:**
1. Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+R)
2. Check `tileset-registry.ts` has correct tileset ID
3. Wait a few minutes for CDN propagation
4. Check browser network tab to verify correct tileset URL

---

### Issue: "Environment override not working"

**Symptoms:**
- Setting environment variable doesn't change tileset

**Causes:**
- Environment variable name mismatch
- Need to rebuild application
- Variable not prefixed with `NEXT_PUBLIC_`

**Solutions:**
1. Ensure variable name matches exactly (e.g., `NEXT_PUBLIC_TILESET_FEEDSTOCK`)
2. Restart dev server (`npm run dev`)
3. For Cloud Build, verify substitution syntax is correct
4. Check that variable is actually being loaded (console.log in registry file)

---

## Best Practices

### ✅ DO

- Use date-based version identifiers (YYYY-MM)
- Keep source layer names stable across versions
- Update both `tilesetId` and `version` fields in registry
- Test locally before deploying to staging
- Document any attribute changes in TILESET_SPECIFICATIONS.md
- Verify tileset in Mapbox Studio before notifying frontend team
- Use environment variables for testing

### ❌ DON'T

- Don't change source layer names when updating tilesets
- Don't hardcode tileset IDs directly in Map.js or components
- Don't skip testing after updates
- Don't deploy to production without staging validation
- Don't forget to update documentation
- Don't use random hash suffixes (use date-based versions instead)

---

## Registry File Reference

### Location
```
src/lib/tileset-registry.ts
```

### Structure

```typescript
export interface TilesetConfig {
  tilesetId: string;          // Full Mapbox tileset ID
  sourceLayer: string;         // Stable source layer name (no version suffix)
  displayName: string;         // Human-readable name for UI
  category: 'feedstock' | 'infrastructure' | 'transportation';
  version: string;             // Date-based version (YYYY-MM)
}

export const DEFAULT_TILESET_REGISTRY: Record<string, TilesetConfig> = {
  feedstock: {
    tilesetId: 'sustainasoft.cal-bioscape-landiq-cropland-2024-10',
    sourceLayer: 'cropland_land_iq',
    displayName: 'Crop Residues',
    category: 'feedstock',
    version: '2024-10'
  },
  wastewater: {
    tilesetId: 'sustainasoft.cal-bioscape-epa-wastewater-2024-10',
    sourceLayer: 'us_wwt_pts',
    displayName: 'Wastewater Treatment Plants',
    category: 'infrastructure',
    version: '2024-10'
  },
  // ... additional tilesets
};

// Environment variable overrides
const ENV_OVERRIDES: Record<string, string | undefined> = {
  feedstock: process.env.NEXT_PUBLIC_TILESET_FEEDSTOCK,
  wastewater: process.env.NEXT_PUBLIC_TILESET_WASTEWATER,
  // ... add overrides as needed
};

// Final registry with overrides applied
export const TILESET_REGISTRY: Record<string, TilesetConfig> = 
  Object.keys(DEFAULT_TILESET_REGISTRY).reduce(
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
```

---

## Contact & Support

For questions or issues with tileset updates:

**Backend Team**: Tileset generation, data processing, Mapbox upload
**Frontend Team**: Registry updates, deployment, UI integration

---

## Version History

- **v1.0 (2024-10-16)**: Initial guide for simplified tileset management system
