# API Integration Plan: CA Biositing Backend → Frontend

## Overview

This document describes the plan for wiring the CA Biositing backend REST API into the `cal-bioscape-frontend` Next.js application. The goal is to replace hardcoded static data (residue yield factors, feedstock characteristics, availability windows) with live data fetched from the backend API.

**Backend API Base URL:** `https://biocirv-webservice-194468397458.us-west1.run.app`  
**API Docs (Swagger):** `https://biocirv-webservice-194468397458.us-west1.run.app/docs`  
**OpenAPI Spec:** `https://biocirv-webservice-194468397458.us-west1.run.app/openapi.json`

---

## API Endpoint Reference

### Group 1: USDA Census Data
Data sourced from USDA NASS Agricultural Census (5-year cadence).

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/feedstocks/usda/census/crops/{crop}/geoid/{geoid}/parameters` | List all census parameters for a USDA crop name + geography |
| GET | `/v1/feedstocks/usda/census/crops/{crop}/geoid/{geoid}/parameters/{parameter}` | Get a single census parameter (e.g. "ACRES HARVESTED") |
| GET | `/v1/feedstocks/usda/census/resources/{resource}/geoid/{geoid}/parameters` | Same as above but using internal resource name |
| GET | `/v1/feedstocks/usda/census/resources/{resource}/geoid/{geoid}/parameters/{parameter}` | Get single census parameter by resource name |

**Response shape (`CensusDataResponse`):**
```json
{
  "usda_crop": "ALMONDS",           // if queried by crop
  "resource": "almond_hulls",       // if queried by resource
  "geoid": "06019",
  "parameter": "ACRES HARVESTED",
  "value": 123456.0,
  "unit": "ACRES",
  "dimension": "IRRIGATED",         // optional
  "dimension_value": 100000.0,      // optional
  "dimension_unit": "ACRES"         // optional
}
```

---

### Group 2: USDA Survey Data
Data sourced from USDA NASS Annual Survey (more recent/frequent than census).

Same 4 routes as Census but under `/v1/feedstocks/usda/survey/...`.  
Same response shape as Census.

---

### Group 3: Analysis Data
Proximate/ultimate analysis data: moisture content, ash content, volatile matter, fixed carbon, heating value (BTU/lb or MJ/kg), etc.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/feedstocks/analysis/resources/{resource}/geoid/{geoid}/parameters` | List all analysis parameters for a resource + geography |
| GET | `/v1/feedstocks/analysis/resources/{resource}/geoid/{geoid}/parameters/{parameter}` | Get a single analysis parameter |

**Response shapes:**

`AnalysisListResponse`:
```json
{
  "resource": "almond_hulls",
  "geoid": "06019",
  "data": [
    { "parameter": "moisture_content", "value": 8.5, "unit": "%" },
    { "parameter": "heating_value", "value": 7800.0, "unit": "BTU/lb" }
  ]
}
```

`AnalysisDataResponse`:
```json
{
  "resource": "almond_hulls",
  "geoid": "06019",
  "parameter": "moisture_content",
  "value": 8.5,
  "unit": "%"
}
```

---

### Group 4: Availability Data
Seasonal window during which a feedstock resource is harvestable/collectible.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/feedstocks/availability/resources/{resource}/geoid/{geoid}` | Get seasonal availability window |

**Response shape (`AvailabilityResponse`):**
```json
{
  "resource": "almond_hulls",
  "geoid": "06019",
  "from_month": 8,
  "to_month": 10
}
```

`from_month` and `to_month` are integers 1–12. The window may wrap around the year (e.g., `from_month: 11, to_month: 2` means Nov–Feb).

---

## Key Integration Notes

### GeoID Format
- **County FIPS:** 5-digit string, e.g., `"06019"` (Fresno County, CA)
- **State FIPS:** 2-digit string, e.g., `"06"` (California)
- GEOIDs come from the LandIQ Mapbox tileset feature properties when a user clicks on the map

### Resource vs. Crop Name
- The API supports two naming conventions:
  - **USDA crop name** (e.g., `"ALMONDS"`, `"WHEAT"`, `"TOMATOES"`) — used with `/crops/` routes
  - **Internal resource name** (e.g., `"almond_hulls"`, `"wheat_straw"`) — used with `/resources/` routes
- The frontend currently uses LandIQ crop names (e.g., `"Almonds"`, `"Wheat"`) defined in `CROP_NAME_MAPPING` in `src/lib/constants.ts`
- A new mapping layer is needed: **LandIQ crop name → API resource name**

### Error Handling / Graceful Degradation
- The API returns `{"detail": "Resource not found: X"}` (404) when no data exists for a given resource+geoid combination
- The API returns `{"detail": "Parameter 'any parameter' not found for crop X in geoid Y"}` when the crop is known but has no data for that geography
- **The frontend must always fall back to static hardcoded data** when the API returns an error, so the app continues to function even if the backend is unavailable or data is sparse

---

## What To Replace / Augment

### 🔴 High Priority

#### 1. Residue Yield Factors (dry/wet tons per acre)
- **Current location:** `src/lib/residue-data.ts` — static hardcoded `dryTonsPerAcre` and `wetTonsPerAcre` per crop
- **Used in:** `SitingInventory.tsx` via `getCropResidueFactors()` from `src/lib/constants.ts`
- **Replace with:** Query `/v1/feedstocks/usda/census/resources/{resource}/geoid/{geoid}/parameters` for production/yield data, cross-referenced with acreage data from the same endpoint
- **When to fetch:** When the siting analysis buffer zone is drawn and the crop inventory list is built — use the county GEOID(s) overlapping the buffer
- **Fallback:** If API returns no data, use the existing static factors from `residue-data.ts`

#### 2. Feedstock Analysis Characteristics
- **Current location:** `getFeedstockCharacteristics()` in `src/lib/constants.ts` — static hardcoded moisture/energy content per resource
- **Used in:** `LayerControls.tsx` for the moisture content and energy content filter sliders
- **Replace with:** Query `/v1/feedstocks/analysis/resources/{resource}/geoid/{geoid}/parameters` for live analysis data
- **When to fetch:** When a user clicks on a feedstock feature (use county GEOID from the feature + mapped resource name)
- **Fallback:** If API returns no data, use the existing static characteristics

#### 3. Seasonal Availability
- **Current state:** Not currently shown in the UI — **entirely new feature**
- **Source:** `/v1/feedstocks/availability/resources/{resource}/geoid/{geoid}`
- **Where to add:**
  - Map popup when user clicks a feedstock parcel — show "Available: Aug–Oct" line
  - `SitingInventory.tsx` — add an "Availability" column showing the harvest window per crop
- **When to fetch:** On map feature click, or alongside inventory generation

---

### 🟡 Medium Priority

#### 4. County-Level Acres from USDA Census
- **Current state:** Acres are computed client-side from vector tile feature geometry within the buffer polygon
- **Augment with:** `/v1/feedstocks/usda/census/crops/{crop}/geoid/{geoid}/parameters` — fetch "ACRES HARVESTED" as a county-level data point for popup context and validation
- **When to fetch:** When a user clicks on a county-level crop feature on the map

#### 5. Richer Map Feature Popups
- **Current state:** Popups in `Map.js` show only crop type name and color swatch
- **Augment with:** On click, derive county FIPS from feature properties, map crop name to API resource name, then fetch:
  - Availability window (from Availability endpoint)
  - Key analysis parameters — moisture %, heating value (from Analysis endpoint)
  - USDA harvested acres for the county (from Census endpoint)
- **Rendering:** Add a small data table inside the popup with these fetched values; show loading spinner while fetching; show "No data available" gracefully if all calls return 404

---

## Files to Create

### `src/lib/api-types.ts`
TypeScript interfaces matching all API response schemas:
- `CensusDataResponse`
- `CensusListResponse`
- `AnalysisDataResponse`
- `AnalysisListResponse`
- `AvailabilityResponse`
- `DataItemResponse` (item in `AnalysisListResponse.data`)

### `src/lib/api.ts`
Centralized typed API client. Exports async functions:
```typescript
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://biocirv-webservice-194468397458.us-west1.run.app';

// Census
getCensusByCrop(crop: string, geoid: string): Promise<CensusDataResponse[] | null>
getCensusByCropParam(crop: string, geoid: string, parameter: string): Promise<CensusDataResponse | null>
getCensusByResource(resource: string, geoid: string): Promise<CensusDataResponse[] | null>
getCensusByResourceParam(resource: string, geoid: string, parameter: string): Promise<CensusDataResponse | null>

// Survey (same signatures, different base path)
getSurveyByCrop(...)
getSurveyByCropParam(...)
getSurveyByResource(...)
getSurveyByResourceParam(...)

// Analysis
getAnalysisByResource(resource: string, geoid: string): Promise<AnalysisListResponse | null>
getAnalysisByResourceParam(resource: string, geoid: string, parameter: string): Promise<AnalysisDataResponse | null>

// Availability
getAvailability(resource: string, geoid: string): Promise<AvailabilityResponse | null>
```
All functions return `null` on error (404, network failure, etc.) to enable clean fallback logic.

### `src/lib/resource-mapping.ts`
Maps LandIQ/DWR crop names → API resource names and USDA crop names:
```typescript
// Example entries
export const LANDIQ_TO_API_RESOURCE: Record<string, string> = {
  "Almonds": "almond_hulls",
  "Walnuts": "walnut_shells",
  "Rice": "rice_straw",
  "Wheat": "wheat_straw",
  "Cotton": "cotton_gin_trash",
  "Tomatoes": "tomato_pomace",
  "Corn, Sorghum and Sudan": "corn_stover",
  "Alfalfa & Alfalfa Mixtures": "alfalfa",
  // ...
};

export const LANDIQ_TO_USDA_CROP: Record<string, string> = {
  "Almonds": "ALMONDS",
  "Walnuts": "WALNUTS",
  "Rice": "RICE",
  "Wheat": "WHEAT",
  // ...
};
```

### `src/lib/county-lookup.ts`
Utility to extract county FIPS (geoid) from Mapbox feature properties:
```typescript
// LandIQ features have a county FIPS property — this normalizes it to 5-digit string
export function getCountyGeoid(featureProperties: Record<string, unknown>): string | null
```

---

## Files to Modify

### `src/lib/constants.ts`
- Keep `getCropResidueFactors()` and `getFeedstockCharacteristics()` as static fallback functions
- No breaking changes required; API functions will call these as fallbacks

### `src/lib/residue-data.ts`
- No changes — kept as static fallback data source
- The API client layer will try the backend first, then fall back to this

### `src/components/Map.js`
- Import `getAvailability`, `getAnalysisByResource`, `getCensusByCrop` from `src/lib/api.ts`
- Import `getCountyGeoid` from `src/lib/county-lookup.ts`
- Import `LANDIQ_TO_API_RESOURCE`, `LANDIQ_TO_USDA_CROP` from `src/lib/resource-mapping.ts`
- On feedstock feature click:
  1. Extract county FIPS from feature properties via `getCountyGeoid()`
  2. Map crop name to resource name and USDA crop name
  3. Fetch availability, analysis params, and census acres in parallel (`Promise.allSettled`)
  4. Render enriched popup with loading state and graceful "no data" fallback

### `src/components/SitingInventory.tsx`
- Currently uses only `getCropResidueFactors()` (static) for residue calculations
- Add a prop `geoids?: string[]` — the set of county FIPS codes overlapping the buffer
- When `geoids` is provided, attempt to fetch analysis data from the API per resource per geoid, aggregate, and use those values instead of (or in addition to) the static factors
- Add an "Availability" column to the table showing harvest window from the API

### `src/components/LayerControls.tsx`
- Currently uses `getFeedstockCharacteristics()` (static) to populate moisture/energy filter ranges
- Consider fetching aggregate analysis stats from the API to dynamically set filter bounds
- Low urgency — static fallback is acceptable here for v1

### `src/app/page.tsx`
- Pass county GEOID(s) from active siting buffer into `SitingInventory` as `geoids` prop
- The county GEOIDs overlapping the buffer need to be derived when the buffer is drawn in `Map.js` and propagated up to page state

---

## Environment Variable

Add to `.env.local` (and corresponding cloud build / deployment config):
```
NEXT_PUBLIC_API_BASE_URL=https://biocirv-webservice-194468397458.us-west1.run.app
```

For staging vs. production, use different base URLs if the backend is deployed in multiple environments.

---

## Implementation Sequence

1. **`src/lib/api-types.ts`** — Define all response interfaces (no side effects, safe first step)
2. **`src/lib/api.ts`** — Implement typed fetch client with error handling/fallback pattern
3. **`src/lib/resource-mapping.ts`** — Build LandIQ → API name mapping (requires confirming valid API resource names with the backend team)
4. **`src/lib/county-lookup.ts`** — Utility to extract FIPS from Mapbox tile feature properties
5. **`src/components/Map.js`** — Enrich map popups with API data (availability + analysis + census acres)
6. **`src/components/SitingInventory.tsx`** — Integrate API-sourced residue/yield data + availability window
7. **`src/app/page.tsx`** — Wire county GEOID(s) from buffer into `SitingInventory`
8. **`.env.local`** — Add `NEXT_PUBLIC_API_BASE_URL`

---

## Open Questions / Blockers

1. **Valid resource names:** The API does not expose an endpoint listing all valid resource/crop identifiers. We were unable to get successful data responses during probing (all resources returned "not found"). This needs to be resolved with the backend team — either:
   - An endpoint like `/v1/feedstocks/resources` listing all valid resource identifiers should be added, OR
   - The backend team should provide a mapping table of valid resource names and geoids that have data
2. **LandIQ feature properties:** We need to confirm which property key on the Mapbox tileset features holds the county FIPS code (likely `COUNTY_FPS`, `GEOID`, `COUNTYFP`, or similar — needs verification against the actual tileset schema)
3. **USDA crop name format:** The API appears to use uppercase (e.g., `"ALMONDS"`, `"WHEAT"`) but not all crop names tested were recognized — the exact canonical list needs confirmation from the backend team
4. **Data coverage:** The backend database appears partially populated. The frontend fallback strategy (static data when API returns 404) is essential until the database is fully loaded

---

## Testing Strategy

- **Unit tests:** Mock `fetch` in `api.ts` tests; verify fallback behavior when API returns 404
- **Integration:** Manually test with real geoids once the backend team confirms valid resource+geoid combinations
- **Graceful degradation:** Verify the app works identically to current behavior when `NEXT_PUBLIC_API_BASE_URL` is unset or when the API is unreachable