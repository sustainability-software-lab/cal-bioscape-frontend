# Plan: Add CARB Food Processors as a New Mapbox Point Layer

## Context

Cal BioScape renders processing facilities as point layers on a Mapbox GL map. Under the
"Food Processing Facilities" group in the left sidebar there are currently two point
subtypes:

- **Tomato Processors** (`tomatoProcessors`) — tileset `sustainasoft.84ikw8pw` on the
  sustainasoft (default) Mapbox account, source layer `tomato-processor-facilities-3srkr8`.
- **Other Processors** (`foodProcessors`) — tileset `tylerhuntington222.4vo6hho9` on the
  legacy account, source layer `food_manufactureres_and_processors_epa`.

The user supplied a new CSV of California food manufacturers/processors sourced from CARB
(`food_manufacturers_and_processor_facilities_carb.csv`, 6047 rows, ~96% wineries from the
CA Dept of Alcoholic Beverage Control 2024, plus almond hullers, walnut/cotton/tomato
processors, etc.). This dataset must be added as a third point subtype, rendered from a
tileset on the **sustainasoft** Mapbox account (NOT the legacy account), with reasonable
popups derived from human-readable column names.

The two existing "Other Processors" / new dataset must be relabeled in the sidebar to
differentiate them by source.

## Intended outcome

A new "Other Processors (CARB)" point layer renders on the map (teal markers), toggled
under "Food Processing Facilities", with click popups showing human-readable facility
details. The tileset lives on the sustainasoft account and is produced by a committed,
re-runnable CSV-to-tileset pipeline.

## Scope

- Build a re-runnable pipeline that converts the committed CSV to a Mapbox tileset on the
  sustainasoft account via the Mapbox Tiling Service (MTS) REST API.
- Wire the new tileset into the app as a third "Food Processing Facilities" subtype:
  registry entry, map source + circle layer, click/hover interactivity, popup title,
  visibility binding, root-state visibility key, infrastructure master toggle, sidebar UI.
- Relabel sidebar entries: `foodProcessors` "Other Processors" -> "Other Processors (EPA)";
  new layer labeled "Other Processors (CARB)". Tomato Processors unchanged. Master label
  "Food Processing Facilities" unchanged.
- Add a popup field-label mapping for the CARB layer's curated columns.

## Out of scope

- Changing the existing tomato or EPA tilesets, or migrating EPA off the legacy account.
- Backend/API changes (this is a static tileset, no `/api/proxy` involvement).
- Siting-buffer spatial analysis of CARB facilities (these are infrastructure points, not
  feedstock; not part of the inventory query).
- MapLegend changes (the legend does not enumerate processor subtypes today; leave as-is).

## Canonical identifiers (fixed up front so code and pipeline agree)

These names are decided now so the app-wiring workstream does not block on the actual
Mapbox upload completing. The MTS recipe and the registry entry MUST both use them
verbatim:

- Root-state / registry key: `carbFoodProcessors`
- Map source id: `carb-food-processors-source`
- Map layer id: `carb-food-processors-layer`
- Popup label-mapping key (layer id minus `-layer`): `carb-food-processors`
- Tileset id: `sustainasoft.cal-bioscape-carb-food-processors-2026-06`
- Source layer name (stable, no version suffix): `carb_food_processors`
- Marker color: teal `#14B8A6`
- Sidebar label: `Other Processors (CARB)`
- Popup title: `Food Processor (CARB) Details`

## Curated GeoJSON properties (emitted by the build script; all others dropped)

Only these CSV columns are carried into the tileset (chosen for being populated and
meaningful; internal/empty columns are dropped at build time so popups stay clean):

`name, address, city, county, zip, state, primary_ag_product, process_type, byproducts,
quantities, air_district, general_source_info, CARB_facility_id, latitude, longitude`

Dropped columns: `processing_facility_id, geom, processing_capacity_products,
processing_capacity_ton_hr, source_url, EPA_facility_id, NAICS_code, NAICS_code_description,
phone_number, website, excess_food_estimate_low, excess_food_estimate_high, etl_run_id,
lineage_group_id, created_at, updated_at` (all either 0% populated or internal lineage IDs).

Rows with non-numeric/missing `latitude` or `longitude` are skipped (224 of 6047 rows).
GeoJSON coordinates use `[longitude, latitude]` order.

---

## Workstreams

### Workstream 1: CSV-to-GeoJSON build module + committed CSV  [Tier: T0]

Create the committed source data and a tested, pure transform that converts the CARB CSV
into GeoJSON features with curated properties. This is the deterministic, offline-testable
core of the pipeline.

**Files:**
  - `src/data/food_manufacturers_and_processor_facilities_carb.csv` -- commit the raw CSV
    (copy from `.context/attachments/rKASck/food_manufacturers_and_processor_facilities_carb.csv`).
  - `src/lib/carb-food-processors-build.ts` -- NEW. Export a pure function
    `buildCarbFeatures(csvText: string): GeoJSON.Feature[]` that parses CSV, skips rows
    without numeric `latitude`/`longitude`, and emits Point features with `[lon, lat]`
    geometry and ONLY the curated properties listed above (verbatim CSV keys preserved).
    Also export `CURATED_COLUMNS: string[]`.
  - `src/lib/__tests__/carb-food-processors-build.test.ts` -- NEW test file.
  - `scripts/build-carb-food-processors.ts` -- NEW. Thin CLI wrapper: reads the committed
    CSV, calls `buildCarbFeatures`, writes newline-delimited GeoJSON (one feature per line,
    required by MTS) to `src/data/carb-food-processor-facilities.geojson.ld`. Logs feature
    count and dropped-row count.
  - `package.json` -- add devDependency `csv-parse` and a script
    `"build-carb-data": "tsx scripts/build-carb-food-processors.ts"`.
  - `.gitignore` -- add `src/data/carb-food-processor-facilities.geojson.ld` (generated
    artifact; do not commit).

**Implementation approach:**
  - Use `csv-parse/sync` (`parse(csvText, { columns: true, skip_empty_lines: true })`) to
    get row objects keyed by the CSV header. The header is the first line of the CSV (see
    column list in the plan); fields like `byproducts`/`quantities` contain quoted commas,
    so a real CSV parser is required -- do NOT split on commas manually.
  - For each row: coerce `latitude`/`longitude` with `Number()`; skip if either is `NaN` or
    the trimmed source string is empty.
  - Build `properties` by copying ONLY `CURATED_COLUMNS` keys whose value is a non-empty
    string; omit empty values entirely (keeps tiles small and popups clean).
  - Follow the structure/style of `scripts/fetch-tomato-processor-facilities.ts` (same
    `type: "Feature"` / `geometry.type: "Point"` shape, `.filter()` to drop invalid coords).
  - Do NOT: hand-roll CSV splitting; emit dropped/internal columns; commit the generated
    `.geojson.ld`.
  - Do NOT: touch `src/lib/tileset-registry.ts` or any UI file (owned by Workstream 3).

**TDD Contract:**
  - Name: `"buildCarbFeatures drops rows without numeric coordinates and curates properties"`
  - Type: unit
  - File: `src/lib/__tests__/carb-food-processors-build.test.ts`
  - Asserts: given an inline 3-row CSV fixture (one valid, one missing latitude, one with an
    empty dropped-column), the result has exactly 1 feature, its `geometry.coordinates` is
    `[lon, lat]` in that order, its `properties` contains the curated populated keys and
    excludes both empty values and dropped columns (e.g. `etl_run_id`).
  - Red trigger: `buildCarbFeatures` and the module do not exist yet, so the import fails.

**Acceptance criteria:**
  - [ ] `src/data/food_manufacturers_and_processor_facilities_carb.csv` is committed.
  - [ ] `npm run build-carb-data` writes a `.geojson.ld` with ~5823 feature lines and logs
        the 224 dropped (no-coordinate) rows.
  - [ ] The build test passes; the generated `.geojson.ld` is gitignored.
  - [ ] No file outside the list above is modified.

### Workstream 2: MTS upload script -> sustainasoft tileset  [Tier: T0]

Provide a re-runnable script that publishes the newline-delimited GeoJSON to a tileset on
the sustainasoft Mapbox account via the Mapbox Tiling Service REST API, using the canonical
tileset id and source-layer name. Script code lands in this workstream; the actual
authenticated run against Mapbox is the gated manual infra step in Verification (it needs a
secret token and a Mapbox round-trip that unit tests cannot cover).

**Files:**
  - `scripts/upload-carb-tileset.ts` -- NEW. Orchestrates the MTS publish sequence below
    using `fetch` and a secret token from `process.env.MAPBOX_SECRET_TOKEN`.
  - `package.json` -- add script `"upload-carb-tileset": "tsx scripts/upload-carb-tileset.ts"`.
  - `.env` and AGENTS.md env table -- document `MAPBOX_SECRET_TOKEN` (sustainasoft `sk.*`
    token with `tilesets:write`, `tilesets:read`; server/CLI-only, never `NEXT_PUBLIC_`).
  - `docs/CARB_FOOD_PROCESSORS_PIPELINE.md` -- NEW. Document the end-to-end pipeline:
    `npm run build-carb-data` then `npm run upload-carb-tileset`, the canonical ids, and how
    to re-run on data refresh.

**Implementation approach:**
  - MTS REST sequence (base `https://api.mapbox.com`, append `?access_token=$MAPBOX_SECRET_TOKEN`):
    1. Upload tileset source: `POST /tilesets/v1/sources/sustainasoft/carb_food_processors`
       with `Content-Type: multipart/form-data`, the `.geojson.ld` file as the `file` field.
    2. Create tileset + recipe: `PUT /tilesets/v1/sustainasoft.cal-bioscape-carb-food-processors-2026-06`
       with JSON body `{ recipe, name }` where the recipe maps the uploaded source to a
       layer named `carb_food_processors` (the stable source-layer), e.g.
       `{ version: 1, layers: { carb_food_processors: { source: "mapbox://tileset-source/sustainasoft/carb_food_processors", minzoom: 0, maxzoom: 12 } } }`.
    3. Publish: `POST /tilesets/v1/sustainasoft.cal-bioscape-carb-food-processors-2026-06/publish`.
    4. Poll `GET /tilesets/v1/sustainasoft.cal-bioscape-carb-food-processors-2026-06/status`
       until `status === "success"`; log the job id and exit non-zero on failure.
  - Make the script idempotent: if the source or tileset already exists, PUT/replace rather
    than hard-failing (handle 409/422 by updating). Log each step.
  - Reference `docs/TILESET_UPDATE_GUIDE.md` for the naming convention and the stable
    source-layer principle.
  - Do NOT: hardcode the token; print the token to logs; change the canonical ids; touch app
    code or the registry.

**TDD Contract:**
  - No new app behavior; this is an infra/CLI script whose effect (a published tileset) is a
    Mapbox-side artifact. Covered by the gated infra smoke step in Verification. (Optional:
    a unit test asserting the recipe object names the layer `carb_food_processors` and the
    tileset id matches the canonical constant, if the recipe builder is factored into a pure
    exported function.)

**Acceptance criteria:**
  - [ ] `scripts/upload-carb-tileset.ts` performs source-upload -> recipe/create -> publish
        -> poll, reading the token only from `MAPBOX_SECRET_TOKEN`.
  - [ ] `MAPBOX_SECRET_TOKEN` is documented in `.env` and the AGENTS.md env table as a
        server/CLI-only secret.
  - [ ] `docs/CARB_FOOD_PROCESSORS_PIPELINE.md` documents the two-command pipeline and ids.
  - [ ] Running the script with a valid token publishes
        `sustainasoft.cal-bioscape-carb-food-processors-2026-06` with source layer
        `carb_food_processors` (verified in the gated step).

### Workstream 3: App wiring -- registry, map layer, popups, sidebar relabel  [Tier: T1]

Render the new tileset in the app and relabel the sidebar. Depends on Workstream 2 only for
the agreed canonical ids (already fixed above), so it can be implemented in parallel and
verified once the tileset is published.

**Files:**
  - `src/lib/tileset-registry.ts` -- add a `carbFoodProcessors` entry to
    `DEFAULT_TILESET_REGISTRY` (after `tomatoProcessors`, ~line 164): `tilesetId:
    'sustainasoft.cal-bioscape-carb-food-processors-2026-06'`, `sourceLayer:
    'carb_food_processors'`, `displayName: 'Food Processing Facilities (CARB)'`, `category:
    'infrastructure'`, `version: '2026-06'`, `accountType: 'default'`.
  - `src/components/Map.js` --
    - Add source `carb-food-processors-source` next to the tomato source add (~line 1651),
      `type: 'vector'`, `url: mapbox://${TILESET_REGISTRY.carbFoodProcessors.tilesetId}`.
    - Add circle layer `carb-food-processors-layer` next to the tomato layer add (~line 2111),
      `source-layer: TILESET_REGISTRY.carbFoodProcessors.sourceLayer`, `circle-color:
      '#14B8A6'`, same radius/opacity/stroke as siblings, visibility bound to
      `layerVisibility?.carbFoodProcessors`.
    - Add to the `interactiveLayers` title map (~line 2577):
      `'carb-food-processors-layer': 'Food Processor (CARB) Details'`.
    - Add to the visibility `layerMapping` (~line 2759):
      `'carb-food-processors-layer': layerVisibility?.carbFoodProcessors`.
    - The popup uses the generic (non-tomato) branch, so no popup-code change is needed
      beyond the label mapping in Workstream-3's labelMappings edit.
  - `src/lib/labelMappings.js` -- add `CARB_FOOD_PROCESSORS_LABELS` mapping the curated keys
    to human-readable labels (e.g. `primary_ag_product` -> `Primary Agricultural Product`,
    `air_district` -> `Air District`, `general_source_info` -> `Data Source`,
    `CARB_facility_id` -> `CARB Facility ID`, `byproducts` -> `Byproducts`, `process_type` ->
    `Process Type`, `quantities` -> `Reported Quantities`, `zip` -> `ZIP Code`, `latitude`/
    `longitude` -> `Latitude`/`Longitude`, plus name/address/city/county/state). Register it
    in `layerLabelMappings` under key `'carb-food-processors'`.
  - `src/app/page.tsx` --
    - Add `carbFoodProcessors: false` to the `layerVisibility` initial state (~line 44).
    - Add `layerVisibility.carbFoodProcessors` to BOTH the `computedInfrastructureMaster`
      return expression (~line 99) and its dependency array (~line 119).
    - Add `carbFoodProcessors: isVisible` to `handleInfrastructureToggle` (~line 204).
    - `handleShowAllLayers`/`handleHideAllLayers` loop over keys generically -- no change.
  - `src/components/LayerControls.tsx` --
    - Relabel "Other Processors" (line 1218) -> `Other Processors (EPA)`.
    - Add a third subtype row "Other Processors (CARB)" (teal `#14B8A6` dot) bound to
      `carbFoodProcessors` via `directLayerToggle('carbFoodProcessors', !!checked)`, mirroring
      the existing EPA subtype block (lines 1199-1220).
    - Update the `foodProcessorsMaster` checkbox (lines 1147-1159): `checked` should reflect
      all THREE keys (true if all three on, `'indeterminate'` if some on), and
      `onCheckedChange` must also `directLayerToggle('carbFoodProcessors', isChecked, true)`.
    - If a TypeScript type/interface for the visibility prop enumerates keys, add
      `carbFoodProcessors`.
  - Tomato Processors label and the master label "Food Processing Facilities" are unchanged.

**Implementation approach:**
  - Copy the tomato/EPA source+layer+title+visibility patterns verbatim, swapping ids/color.
  - The popup field formatter (`formatAndBuildLine` in Map.js) already title-cases unmapped
    keys, formats numbers, detects URLs, and skips empty/zero values; the curated GeoJSON
    plus `CARB_FOOD_PROCESSORS_LABELS` are sufficient for clean popups.
  - Do NOT: alter the tomato popup display-order branch; change EPA/tomato tilesets; rename
    the master toggle.

**TDD Contract:**
  - Name: `"Food Processing Facilities group shows Tomato, Other Processors (EPA), and Other Processors (CARB)"`
  - Type: e2e
  - File: `e2e/tests/carb-food-processors.spec.ts`
  - Asserts: with the Infrastructure section expanded, the sidebar shows labels
    `Tomato Processors`, `Other Processors (EPA)`, and `Other Processors (CARB)`; toggling
    the CARB checkbox via `getByLabel('Other Processors (CARB)')` sets the
    `carb-food-processors-layer` Mapbox layer visibility to `visible`
    (assert via `window.mapboxMap.getLayoutProperty('carb-food-processors-layer','visibility')`).
  - Red trigger: the CARB label and layer do not exist yet, so `getByLabel` finds no element.
  - Use the authenticated fixture from `e2e/fixtures/index.ts` and `getByRole`/`getByLabel`
    locators only. (If no e2e harness exists in the repo, create the spec file and a minimal
    fixture; otherwise extend the existing layer-controls spec.)

**Acceptance criteria:**
  - [ ] Sidebar shows the three subtypes with correct labels; Tomato + master unchanged.
  - [ ] Toggling "Other Processors (CARB)" shows/hides teal markers on the map.
  - [ ] Clicking a CARB marker opens a popup titled "Food Processor (CARB) Details" with
        human-readable fields (Name, Address, City, County, Primary Agricultural Product,
        Byproducts, Air District, Data Source, etc.) and no raw column names or internal ids.
  - [ ] The CARB tileset loads via the sustainasoft token (no legacy-token request; verify in
        the Network tab that the tile request carries the sustainasoft access token).
  - [ ] Infrastructure master + Show All / Hide All include the new layer.

---

## Verification (integrated, after all workstreams land)

1. **Gated infra step (requires sustainasoft `MAPBOX_SECRET_TOKEN`):** run
   `npm run build-carb-data` then `npm run upload-carb-tileset`; confirm in Mapbox Studio
   (sustainasoft account) that `sustainasoft.cal-bioscape-carb-food-processors-2026-06`
   exists with source layer `carb_food_processors` and ~5823 points.
2. `npm run dev`, open the map, expand Infrastructure -> Food Processing Facilities; verify
   the three labeled subtypes and that Tomato/EPA still render.
3. Toggle "Other Processors (CARB)"; confirm teal points appear across CA (wine country
   density highest). Click several points; confirm clean, human-readable popups.
4. Confirm no console errors and that the CARB tile request uses the sustainasoft token
   (Network tab), not the legacy token.
5. Run the unit + e2e tests; all green.

## Rollback

- Revert the feature branch / PR. Code rollback is self-contained (registry entry + UI +
  popup mapping + scripts). The published Mapbox tileset can be left in place (harmless) or
  deleted from the sustainasoft account; no other layer references it.

## Manual / gated notes

- The Mapbox upload (Verification step 1) is a manual infra step requiring the sustainasoft
  secret token; it is not run by an autonomous agent. The canonical tileset id + source-layer
  are fixed in this plan so the app-wiring workstream can land and be code-reviewed before the
  upload runs, then verified end-to-end once the tileset is published.
- `csv-parse` is added as a devDependency (build-time only; never bundled into the client).

---

## GitHub tracking (backfilled)

- Milestone: CARB Food Processors Layer (#1)
- Epic: #64
- Sub-issues: Workstream 1 -> #65 (T0), Workstream 2 -> #66 (T0, depends on #65), Workstream 3 -> #67 (T1, depends on #66)
