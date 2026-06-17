# Plan: Integrate updated LandIQ 2024 cropland data

## Context

Peter (collaborator) produced an updated **LandIQ 2024** California cropland dataset and gave us two options:
1. A **cleaned GeoJSON** (`landiq_tileset_20260609_122659.geojson`, 625 MB, 456,223 polygons) -- already flattened to `main_crop`, `acres`, `county`, `geoid`, `tileset_id`, and a new `resources` array (residue feedstocks mapped to the crop).
2. The **full provisional LandIQ 2024 shapefile** (raw, all attributes, likely projected CRS).

The app's cropland layer is a **Mapbox vector tileset** (`tylerhuntington222.cropland_landiq_2023`, source layer `cropland_land_iq_2023`) referenced from the frontend registry. We need to swap in the 2024 data with minimal disruption to the existing wiring.

### Recommendation: use Peter's GeoJSON (do NOT chase the shapefile)

- tippecanoe (the standard Mapbox tile-cutting tool; `tippecanoe`/`ogr2ogr`/`tile-join` are installed locally) ingests GeoJSON **directly**; a shapefile must first be `ogr2ogr`-converted anyway.
- Peter already did the flatten/join we need (polygon + the 4 columns the app reads), and the GeoJSON is already in WGS84/CRS84 (web-ready). The shapefile is raw and likely EPSG:3310, needing reprojection + re-flattening.
- **Decisive finding:** the new data uses the *identical crop taxonomy* the frontend already hardcodes -- just lowercased. Every one of the 56 real crop classes maps 1:1 to an existing canonical `main_crop_name`. So the frontend's color map, crop-name->residue mapping, and resource mapping all keep working with **no vocabulary changes**.

### Why this is fundamentally a value-normalization job

The frontend's canonical crop vocabulary lives in three mutually-consistent places:
- `src/components/LayerControls.tsx:100-118` -- `cropColorMapping` (56 keys; drives the checkbox UI via `allCropNames`)
- `src/components/Map.js:1253-1308` -- `fill-color` `match` on `main_crop_name` (same 56 keys)
- `src/lib/constants.ts:13-95` -- `CROP_NAME_MAPPING` keys (Title-Case LandIQ names -> residue lookup)

Peter's GeoJSON `main_crop` values are the same names, lowercased (`"almonds"`, `"corn, sorghum and sudan"`, `"idle - long term"`, ...). Mapping lowercase->canonical is deterministic.

### Schema gaps between Peter's GeoJSON and what the frontend reads

| Frontend reads | New GeoJSON has | Reconciliation |
|---|---|---|
| `main_crop_name` (Title Case, e.g. "Almonds") | `main_crop` (lowercase, e.g. "almonds") | Rename + normalize value to canonical during preprocessing |
| `main_crop_code` (filter `!= 'U'` hides urban) | *(absent)* | Synthesize: `'U'` for `{"u","ul2"}`, `''` otherwise |
| `county` (case-insensitive lookup) | `county` (lowercase, incl. `"****"` masked) | Keep as-is |
| `acres` | `acres` | Keep as-is |
| `region`, `hydro_region` (popup only) | *(absent)* | Optional; popups simply omit them (graceful) |
| (derives geoid client-side from county) | `geoid` (100% null) | Drop -- unused |
| (computes residues client-side) | `resources` (~40% populated) | Encode as pipe-delimited string |

**Value-normalization mechanism:** build the lookup as `{ canonical.toLowerCase(): canonical }` over the 56 `cropColorMapping` keys. Run the script in **UTF-8** (Python3 default) and compare exact strings.

Explicit overrides:
- `"citrus"` -> `"Citrus and Subtropical"`
- `"u"`/`"ul2"` -> urban: set `main_crop_code='U'`, `main_crop_name='Unclassified'`

**Assert 100% coverage** against the 58 distinct values (56 crops + `u` + `ul2`); abort on any unmapped non-urban value.

## Confirmed decisions

1. **Upload target:** `sustainasoft` account -> `sustainasoft.landiq-cropland-2026-06`, `accountType: 'default'`. User provides a sustainasoft secret write-token.
2. **`resources` array is a new PRIMARY tier.** When a polygon carries `resources`, query the API per-resource for residue quantities first, fall back to the existing three-tier chain.

## Workstream 1: Rebuild and swap the tileset (ships independently)

### Phase A: Preprocess the GeoJSON (local)

Write a streaming Python script (`scripts/preprocess_landiq.py`) that reads the 625 MB / 456k feature GeoJSON via streaming (must not load whole file) and emits newline-delimited GeoJSONSeq. Per feature:

- `main_crop_name` = canonical name from the lowercase->canonical lookup
- `main_crop_code` = `'U'` for `{u, ul2}`, else `''`
- `acres`, `county` (passthrough; `county='****'` is acceptable)
- `resources` = pipe-delimited string (`"almond hulls|almond shells|almond branches"`); omit property entirely if null

Assert 100% coverage; fail loud / abort on any unmapped non-urban value.

### Phase B: Cut the tileset (local, tippecanoe)

Source layer name (stable): **`cropland_land_iq`** (drops the `_2023` suffix).

```
tippecanoe -o landiq_2024.mbtiles -l cropland_land_iq \
  -Z6 -z14 \
  --drop-densest-as-needed \
  --coalesce-smallest-as-needed \
  --extend-zooms-if-still-dropping \
  --no-tile-size-limit
```

Verify with `tippecanoe-decode`/Mapbox Studio: source layer `cropland_land_iq`, all four properties present, urban polygons carry code `U`.

### Phase C: Upload to Mapbox (blocked: sustainasoft write-token from user)

- Account: `sustainasoft`
- Tileset ID: `sustainasoft.landiq-cropland-2026-06`
- Upload method: Mapbox Uploads API via curl, or `pip install mapbox-tilesets`
- No env changes needed: Cloud Build already injects `mapbox-access-token` from Secret Manager

### Phase D: Frontend wiring (one file edit)

In `src/lib/tileset-registry.ts`, update the `feedstock` entry:

- `tilesetId` -> `sustainasoft.landiq-cropland-2026-06`
- `sourceLayer` -> `cropland_land_iq`
- `version` -> `2026-06`
- `accountType` -> `default`

No changes to Map.js color match, LayerControls, constants, resource-mapping, or county-lookup.

### Phase E: Documentation

Update `docs/TILESET_SPECIFICATIONS.md` and `docs/TILESET_UPDATE_GUIDE.md`:
- New tileset ID and version
- Preprocessing mapping notes (source field names, normalization mechanism)
- Commit the preprocessing script pointer under `scripts/`

## Workstream 2: Four-tier residue wiring (blocked: Peter's API answers)

Goal: when a polygon carries `resources: string[]`, use those API resource names as the **primary** source for residue quantities/availability/composition; keep the current chain as fallback.

### Mechanics

- Vector tiles deliver `resources` as a pipe-delimited string -> add helper `parseFeatureResources(props)` returning `string[]` via `props.resources?.split('|') ?? []`
- New helper `getResidueFactorsByResourceNames(resourceNames, acres)` in `src/lib/resource-mapping.ts`: maps each API resource name -> residue factors/quantity, bypassing the `main_crop_name -> getApiResource` guess
- Carry `resources?: string[]` on the `CropInventory` type

### Four insertion points (all "resources-first, else existing")

1. `Map.js` popup ~2374-2438: residue calc + `apiResource` lookup
2. `Map.js` buffer analysis ~484-617: collect `resources` per intersecting feature
3. `SitingInventory.tsx` ~162-187 (`baseResidueRows`): residue rows from `crop.resources` first
4. `SitingInventory.tsx` ~107-157: availability + composition fetch loops key off `crop.resources` first

### Fallback order (four-tier system)

1. Per-polygon `resources` -> API per-resource -> quantity/availability/composition
2. `getApiResource(main_crop_name)` -> API
3. `getCropResidueFactors` dynamic JSON
4. Literature `RESIDUE_FALLBACKS`

### Open questions for Peter (gate quantity wiring)

- Which endpoint returns residue **tonnage** for a `{resource, geoid}`?
- Are all values in the `resources` arrays live, queryable API resource names?
- For multiple residues per crop in a buffer, sum across all or designate a primary?

## Blocking inputs from user

- **sustainasoft secret write-token** (Phase C only): gates tileset upload, not code changes
- **Peter's answers** to API questions: gates Workstream 2 quantity wiring only

## Verification checklist

1. Preprocess script reports 0 unmapped non-urban crop values across all 456k features; spot-check 5 crops (almonds, citrus, corn, sugar beets, one idle class).
2. `tippecanoe-decode`/Mapbox Studio confirms: source layer `cropland_land_iq`; `main_crop_name`/`main_crop_code`/`acres`/`county` present; urban polygons carry code `U`.
3. Local app (`npm run dev`) with registry pointing at new tileset:
   - Map renders crop polygons in correct colors; urban land hidden
   - Crop checkboxes (LayerControls) filter correctly
   - Click a polygon -> popup shows crop/acres/county + residue yields
   - Buffer/siting analysis tallies acreage by crop
   - No console errors; no "source layer not found"
4. Staging deploy succeeds and Cloud Build reports SUCCESS.

## Critical files

- `src/lib/tileset-registry.ts` -- the only required code edit (feedstock entry)
- `scripts/preprocess_landiq.py` -- new; reads canonical vocab to build the lookup
- Reference (unchanged, used to build the lookup): `src/components/LayerControls.tsx:100-118`, `src/components/Map.js:1253-1308`, `src/lib/constants.ts:13-95`
- `docs/TILESET_SPECIFICATIONS.md`, `docs/TILESET_UPDATE_GUIDE.md`

## Workstream 2 critical files

- `src/lib/resource-mapping.ts` -- new `getResidueFactorsByResourceNames`; add `parseFeatureResources` helper
- `src/components/Map.js` -- popup + buffer insertion points
- `src/components/SitingInventory.tsx` -- residue rows + availability/composition fetch loops; extend `CropInventory` type with `resources?: string[]`
- `src/lib/api.ts` -- possibly a new per-resource quantity call, pending Peter's endpoint answer

## Sub-issue map (backfilled after creation)

| Placeholder | Title | Issue # |
|---|---|---|
| S1 | Write streaming GeoJSON preprocessing script | #77 |
| S2 | Update frontend tileset registry for 2024 data | #71 |
| S3 | Update tileset specification docs | #72 |
| S4 | Cut tippecanoe tileset and upload to Mapbox | #73 |
| S5 | End-to-end verification and staging deploy | #74 |
| S6 | Workstream 2: four-tier residue wiring | #75 |
