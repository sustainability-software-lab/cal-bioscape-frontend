# AGENTS.md — Cal BioScape Frontend

Authoritative reference for AI agents working in this repository. Read this file before making any changes.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Repository Structure](#3-repository-structure)
4. [Environment Variables](#4-environment-variables)
5. [Application Architecture](#5-application-architecture)
6. [Pages & Routing](#6-pages--routing)
7. [Root Page State](#7-root-page-state)
8. [Components](#8-components)
9. [Library Files](#9-library-files)
10. [API Layer](#10-api-layer)
11. [API Routes](#11-api-routes)
12. [Data Flows](#12-data-flows)
13. [External Data Sources](#13-external-data-sources)
14. [Constants & Mappings](#14-constants--mappings)
15. [Tileset Registry](#15-tileset-registry)
16. [Deployment](#16-deployment)
17. [Development Setup](#17-development-setup)
18. [Conventions Agents Must Follow](#18-conventions-agents-must-follow)

---

## 1. Project Overview

**Cal BioScape** is an interactive geospatial analysis tool for biomass resource planning and biorefinery siting in California. It helps users:

- Visualize agricultural crop residues and processing facilities on a Mapbox map
- Filter crops by composition properties (moisture, cellulose, lignin, ash, HHV)
- Analyze feedstock resources within a configurable buffer radius around a candidate site
- Calculate energy potential and rank conversion technologies (AD, combustion, pyrolysis, fermentation, composting)
- View USDA census/survey crop statistics by county
- Report bugs directly to the GitHub repository

**Organization:** Sustainability Software Lab, Lawrence Berkeley National Laboratory  
**GitHub (Enterprise):** `lbl.github.com/sustainability-software-lab/cal-bioscape-frontend`  
**Production backend:** `api.calbioscape.org` (USDA data, biomass composition, seasonal availability)
**Staging backend:** `api-staging.calbioscape.org`

---

## 2. Tech Stack

| Category | Package | Version |
|---|---|---|
| Framework | next | ^16.0.10 |
| UI library | react, react-dom | ^19.2.3 |
| Language | typescript | ^5 |
| Styling | tailwindcss | ^4 |
| Styling | @tailwindcss/postcss | ^4 |
| Styling | tailwindcss-animate | ^1.0.7 |
| Styling | class-variance-authority | ^0.7.1 |
| Styling | clsx, tailwind-merge | latest |
| UI primitives | @radix-ui/react-accordion | ^1.2.8 |
| UI primitives | @radix-ui/react-checkbox | ^1.2.3 |
| UI primitives | @radix-ui/react-dialog | ^1.1.15 |
| UI primitives | @radix-ui/react-label | ^2.1.4 |
| UI primitives | @radix-ui/react-select | ^2.2.2 |
| UI primitives | @radix-ui/react-slider | ^1.3.2 |
| UI primitives | @radix-ui/react-tooltip | ^1.0.7 |
| Map | mapbox-gl | ^3.14.0 |
| Geospatial | @turf/turf, @turf/buffer, @turf/circle, @turf/bbox | ^7.2.0 |
| Icons | lucide-react | ^0.503.0 |
| GitHub API | @octokit/rest | ^22.0.1 |
| Data fetching | swr | ^2.3.3 |
| Google (partial) | google-auth-library, googleapis | installed |
| Scripts | tsx | ^4.20.6 |

**Package manager:** npm (use `package-lock.json`, never yarn or pnpm).

---

## 3. Repository Structure

```
cal-bioscape-frontend/
├── src/
│   ├── app/                              # Next.js App Router
│   │   ├── layout.tsx                    # Root layout: Geist fonts, Google Analytics
│   │   ├── page.tsx                      # Main map page — single root state holder
│   │   ├── globals.css                   # Global CSS reset + Tailwind base
│   │   ├── favicon.ico
│   │   ├── about/page.tsx                # Static about page
│   │   ├── contact/page.tsx              # Static contact page
│   │   └── api/
│   │       ├── page.tsx                  # API documentation page (rendered)
│   │       ├── proxy/[...path]/route.ts  # Catch-all proxy → backend (injects auth)
│   │       ├── bug-reports/route.ts      # POST: FormData → GitHub issue
│   │       ├── bug-reports/test/route.ts # GET: dev smoke-test endpoint
│   │       └── auth/token/route.ts       # GET: debug token exchange
│   ├── components/
│   │   ├── Header.tsx                    # Nav bar, "Report Bug" button
│   │   ├── Map.js                        # Mapbox GL map — primary interactive canvas
│   │   ├── LayerControls.tsx             # Left sidebar: layer toggles + all filters
│   │   ├── SitingButton.tsx              # "New Siting Analysis" map overlay button
│   │   ├── SitingAnalysis.tsx            # Siting panel: radius + unit controls
│   │   ├── SitingInventory.tsx           # Buffer-zone resource inventory table
│   │   ├── EnergyPotentialCard.tsx       # Energy totals card (GJ / MMBTU / MWh)
│   │   ├── FeedstockCompositionPanel.tsx # Per-crop biochemical breakdown (expandable)
│   │   ├── TechnologyRecommender.tsx     # Scored conversion technology list
│   │   ├── SeasonalSupplyTimeline.tsx    # Gantt chart of crop availability windows
│   │   ├── CountyFeedstockPanel.tsx      # County USDA stats overlay (floating card)
│   │   ├── MapLegend.js                  # Static map legend
│   │   ├── bug-report/
│   │   │   └── ReportBugModal.tsx        # Bug report form (Radix Dialog)
│   │   └── ui/                           # Unstyled Radix primitives
│   │       ├── accordion.tsx
│   │       ├── card.tsx
│   │       ├── checkbox.tsx
│   │       ├── dialog.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       ├── select.tsx
│   │       ├── slider.tsx
│   │       └── tooltip.tsx
│   ├── lib/
│   │   ├── api.ts                        # All typed fetch wrappers → /api/proxy
│   │   ├── api-types.ts                  # Response interface definitions
│   │   ├── composition-fallbacks.ts      # Literature composition values (~100 crops)
│   │   ├── composition-filters.ts        # CompositionData, filters, batch fetch
│   │   ├── constants.ts                  # Crop name map, feedstock characteristics
│   │   ├── county-analysis.ts            # fetchCountyFeedstockStats()
│   │   ├── county-lookup.ts              # 58-county FIPS GEOID map
│   │   ├── energy-calculations.ts        # computeEnergyTotals(), HHV_FALLBACKS
│   │   ├── github.ts                     # createGitHubIssueFromBugReport()
│   │   ├── labelMappings.js              # Popup field labels per infrastructure layer
│   │   ├── residue-data.ts               # Async loader: resource_info.json
│   │   ├── residue-fallbacks.ts          # Static residue factor fallbacks
│   │   ├── resource-mapping.ts           # LANDIQ_TO_API_RESOURCE, LANDIQ_TO_USDA_CROP
│   │   ├── service-token.ts              # Server-only backend credential helper
│   │   ├── technology-matcher.ts         # rankTechnologies(), computeMixSummary()
│   │   ├── tileset-registry.ts           # 25 Mapbox layer configs
│   │   └── utils.ts                      # cn(), formatNumberWithCommas(), downloadCSV()
│   └── data/
│       └── tomato-processor-facilities.json  # Static GeoJSON (tomato processors)
├── scripts/
│   └── fetch-tomato-processor-facilities.ts  # npm run fetch-data (compiled .js also present)
│   # Note: scripts/data-manipulation.ts does NOT exist — npm run merge-data will fail
├── public/
├── docs/                         # Architecture and implementation docs (19 markdown files)
│   ├── API_INTEGRATION_PLAN.md
│   ├── CLOUDBUILD.md
│   ├── CROP_RESIDUE_FACTORS.md
│   ├── DEPLOYMENT_ARCHITECTURE.md
│   ├── FEEDSTOCK_FILTERS_IMPLEMENTATION.md
│   ├── TILESET_SPECIFICATIONS.md
│   ├── TILESET_UPDATE_GUIDE.md
│   └── ... (12 more)
├── task-summaries-archive/       # Historical task summary files
├── Dockerfile
├── cloudbuild.yaml               # GCP Cloud Build: dev
├── cloudbuild-staging.yaml       # GCP Cloud Build: staging
├── cloudbuild-prod.yaml          # GCP Cloud Build: production
├── .github/
│   └── workflows/
│       ├── google-cloudrun-source.yml  # Unconfigured stub (not used)
│       └── security.yml               # Runs npm audit
├── next.config.*
├── tailwind.config.*
├── tsconfig.json
└── package.json
```

---

## 4. Environment Variables

Create `.env.local` for local development. Never commit secrets.

### Browser-exposed (NEXT_PUBLIC_*)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Yes | Backend base URL. Staging/prod Cloud Build set this explicitly; code fallback is `https://api.calbioscape.org`. |
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | Yes | Current Mapbox token (sustainasoft account) |
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN_LEGACY` | No | Legacy Mapbox token (tylerhuntington222 account) |
| `NEXT_PUBLIC_TILESET_FEEDSTOCK` | No | Override feedstock tileset ID (for testing) |
| `NEXT_PUBLIC_TILESET_WASTEWATER` | No | Override wastewater tileset ID (for testing) |

### Server-only (never NEXT_PUBLIC)

| Variable | Required | Description |
|---|---|---|
| `CA_BIOSITE_API_KEY` | Staging/prod | API key auth — if set, used instead of OAuth2 JWT. Takes priority over username/password. |
| `CA_BIOSITE_API_USER` | Legacy/local fallback | Service account username for backend JWT exchange (used only when `CA_BIOSITE_API_KEY` is absent) |
| `CA_BIOSITE_API_PASSWORD` | Legacy/local fallback | Service account password for backend JWT exchange (used only when `CA_BIOSITE_API_KEY` is absent) |
| `GITHUB_TOKEN` | No | PAT with `repo` scope from `lbl.github.com/settings/tokens` |
| `GITHUB_REPO_OWNER` | No | GitHub org, e.g. `sustainability-software-lab` |
| `GITHUB_REPO_NAME` | No | GitHub repo name, e.g. `cal-bioscape-frontend` |
| `GITHUB_ISSUE_CREATE_ENABLED` | No | Must be `"true"` to activate GitHub issue creation |
| `GITHUB_BASE_URL` | No | Override for GitHub Enterprise API, e.g. `https://lbl.github.com/api/v3` |

**Auth mode selection**: Deployed staging and production services should set `CA_BIOSITE_API_KEY`. If it is set, the proxy sends `X-API-Key: <key>` and never retries on 401. If only username/password are set, the proxy uses the legacy OAuth2 JWT fallback with one retry on 401.

---

## 5. Application Architecture

### State management

**No Redux, Zustand, or Context.** All state lives in `src/app/page.tsx` (the root `Home` component) and flows down as props. Callbacks bubble changes back up. This is intentional — the surface is well-understood and the component tree is shallow.

### Mapbox GL global reference

`Map.js` sets `window.mapboxMap` after initialization. `LayerControls.tsx` reads this global to call `map.setLayoutProperty()` and `map.setFilter()` directly, bypassing the React prop cycle for immediate layer updates. Any new code that manipulates Mapbox layers outside `Map.js` must use `window.mapboxMap`.

### Backend credential isolation

All calls to the Cal BioScape backend go through the Next.js server route `src/app/api/proxy/[...path]/route.ts`. This route injects the backend credential selected by `service-token.ts`: `X-API-Key` when `CA_BIOSITE_API_KEY` is configured, otherwise the legacy `Authorization: Bearer <jwt>` fallback. The client never sees credentials.

### Server-only modules

The following files must **only** be imported in server-side code (API routes, Server Components):
- `src/lib/service-token.ts`
- `src/lib/github.ts`

Both files use Node.js APIs and environment variables that are not exposed to the browser.

### Data fallback chain

When live API data is unavailable, the app degrades gracefully:
```
API response (county-specific, fresh)
  ↓ if null / hasData: false
COMPOSITION_FALLBACKS (src/lib/composition-fallbacks.ts — peer-reviewed literature)
  ↓ if crop not in fallbacks
Pass through — crop is never hidden for missing data
```

The same pattern applies to residue factors:
```
resource_info.json (live JSON from GitHub Pages)
  ↓ if not found or yield = 0
RESIDUE_FALLBACKS (src/lib/residue-fallbacks.ts)
```

---

## 6. Pages & Routing

| Route | File | Type | Notes |
|---|---|---|---|
| `/` | `src/app/page.tsx` | Client component | Main map — all state |
| `/about` | `src/app/about/page.tsx` | Server component | Static |
| `/contact` | `src/app/contact/page.tsx` | Server component | Static |
| `/api` | `src/app/api/page.tsx` | Server component | API docs |

**Root layout** (`src/app/layout.tsx`):
- Loads Geist Sans and Geist Mono fonts via `next/font/google`
- Injects Google Analytics (ID: `G-D0K4GNNQCJ`) via `next/script` with `afterInteractive` strategy
- Sets metadata: `title: "Cal BioScape"`, `description: "Bio-circular economy siting and analysis tool..."`
- Sets `suppressHydrationWarning={true}` on `<body>`

---

## 7. Root Page State

`src/app/page.tsx` is the sole state holder for the application. All meaningful state is defined here.

### Layer visibility

```typescript
const [layerVisibility, setLayerVisibility] = useState({
  feedstock: true,
  transportation: false,
  railLines: false,
  anaerobicDigester: false,
  biodieselPlants: false,
  freightTerminals: false,
  freightRoutes: false,
  petroleumPipelines: false,
  crudeOilPipelines: false,
  naturalGasPipelines: false,
  biorefineries: false,
  safPlants: false,
  renewableDiesel: false,
  mrf: false,
  cementPlants: false,
  landfillLfg: false,
  wastewaterTreatment: false,
  wasteToEnergy: false,
  combustionPlants: false,
  districtEnergySystems: false,
  foodProcessors: false,
  foodRetailers: false,
  powerPlants: false,
  foodBanks: false,
  farmersMarkets: false,
})
```

### Composition & filtering

```typescript
const [visibleCrops, setVisibleCrops] = useState<string[]>(allCropNames) // All 57 crop names on mount
const [croplandOpacity, setCroplandOpacity] = useState<number>(0.6)
const [compositionLookup, setCompositionLookup] = useState<CompositionLookup>({})
const [compositionFilters, setCompositionFilters] = useState<CompositionFilters>(DEFAULT_COMPOSITION_FILTERS)
```

### Siting & UI state

```typescript
const [isPanelCollapsed, setIsPanelCollapsed] = useState(false)
const [bufferGeoids, setBufferGeoids] = useState<string[]>([])           // Counties in siting buffer
const [selectedCounty, setSelectedCounty] = useState<{ name: string; geoid: string } | null>(null)
```

### Derived values

```typescript
// Memoized list of all 57 crop names (sorted) — used to initialize visibleCrops
const allCropNames = useMemo(() => [...new Set(CROP_NAME_MAPPING values)].sort(), [])

// useMemo booleans — true if any layer in the group is visible
const infrastructureMaster = useMemo(
  () => layerVisibility.anaerobicDigester || layerVisibility.biodieselPlants || ...,
  [layerVisibility]
)
const transportationMaster = useMemo(
  () => layerVisibility.railLines || layerVisibility.freightTerminals || ...,
  [layerVisibility]
)
```

Note: there are no `INFRASTRUCTURE_LAYER_KEYS` or `TRANSPORTATION_LAYER_KEYS` constant arrays — the checks are explicit `||` chains inside `useMemo`.

### Handler functions

| Handler | Signature | What it does |
|---|---|---|
| `handleLayerToggle` | `(layerId: string, isVisible: boolean)` | Updates individual entry in `layerVisibility` |
| `handleInfrastructureToggle` | `(isVisible: boolean)` | Toggles all infrastructure layer keys |
| `handleTransportationToggle` | `(isVisible: boolean)` | Toggles all transportation layer keys |
| `handleCropFilterChange` | `(crops: string[])` | Sets `visibleCrops` from LayerControls |
| `handleClosePopupForLayer` | `(layerId: string)` | Signals LayerControls to close a layer's popup |
| `togglePanelCollapse` | `()` | Toggles `isPanelCollapsed` + schedules window resize after 350ms CSS transition |
| `handleShowAllLayers` | `()` | Sets all layer visibility to true |
| `handleHideAllLayers` | `()` | Sets all layer visibility to false |

`setCompositionFilters` is passed directly as `onCompositionFiltersChange` — there is no wrapper handler for it.

### Effects

- On mount: calls `fetchResidueData()` (residue-data.ts) and `batchFetchCompositionData('06')` (composition-filters.ts) to pre-populate `compositionLookup`
- On `isPanelCollapsed` change: schedules `window.dispatchEvent(new Event('resize'))` inside a 350ms `setTimeout` to fire after the CSS transition completes; cleans up the timeout on re-render

---

## 8. Components

### `src/components/Header.tsx`

Navigation bar at the top of the page.

**Props:** None  
**Internal state:** `isBugModalOpen: boolean`

**Behavior:**
- Renders app logo/name as a home link
- Nav links: Map, About, API, Contact (active link highlighted via `usePathname`)
- "Report Bug" button (amber styled) opens `ReportBugModal`
- Button label hidden on small screens (responsive)

---

### `src/components/Map.js`

The primary Mapbox GL interactive map. This is the largest component in the codebase.

**Props:**

| Prop | Type | Description |
|---|---|---|
| `layerVisibility` | `object` | All 25 layer visibility flags |
| `visibleCrops` | `string[]` | Crop names to show on feedstock layer |
| `croplandOpacity` | `number` | Opacity for the feedstock layer (0–1) |
| `compositionFilters` | `CompositionFilters` | Applied biochemical filter ranges |
| `onGeoidsChange` | `(geoids: string[]) => void` | Emits county GEOIDs inside siting buffer |
| `onCountySelect` | `(name: string, geoid: string) => void` | Emits when user clicks a county |

**Internal state (refs + useState):**
- `map` ref — the Mapbox `Map` instance; also set as `window.mapboxMap`
- `mapContainer` ref — the DOM element for Mapbox to mount into
- Siting mode: `isSitingMode`, `hasPlacedMarker`, `bufferRadius`, `bufferUnit`
- Siting refs: `markerRef`, `bufferLayerRef` for cleanup

**Key behaviors:**

- **Initialization:** Creates Mapbox map with style `mapbox://styles/mapbox/light-v11` on mount. Loads all source tilesets from `tileset-registry.ts` and adds layers in order.
- **Layer management:** Watches `layerVisibility` prop; calls `map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none')` for each layer. Direct DOM manipulation bypasses React for speed.
- **Crop filter expression:** When `visibleCrops` or `compositionFilters` change, builds Mapbox filter: `['all', ['!=', ['get', 'main_crop_code'], 'U'], ['match', ['get', 'main_crop_name'], visibleCrops, true, false]]`
- **Siting mode:** Activated by `SitingButton`. Sets cursor to crosshair. On click, places a Mapbox `Marker`, draws a `@turf/circle` buffer, queries features within the buffer via `map.querySourceFeatures()`, and emits county GEOIDs via `onGeoidsChange`.
- **County click:** On click of county feature, emits `onCountySelect(countyName, geoid)`.
- **Popups:** `createPopupForFeature()` builds layer-specific popups using `layerLabelMappings` from `labelMappings.js` for human-readable field names. Handles phone number formatting and URL detection.
- **Cleanup:** `cleanupSitingElements()` removes markers, buffer layers, resets cursor.
- **`window.mapboxMap`:** Set after map loads so `LayerControls.tsx` can call `map.setLayoutProperty()`/`map.setFilter()` directly.

**Layer IDs managed by Map.js** (matches keys in `layerVisibility`):
feedstock, anaerobicDigester, biorefineries, safPlants, renewableDiesel, mrf, cementPlants, biodieselPlants, landfillLfg, wastewaterTreatment, wasteToEnergy, combustionPlants, districtEnergySystems, foodProcessors (two subtypes: tomato + general), foodBanks, farmersMarkets, foodRetailers, powerPlants, railLines, freightTerminals, freightRoutes, petroleumPipelines, crudeOilPipelines, naturalGasPipelines.

---

### `src/components/LayerControls.tsx`

Left sidebar panel with all layer toggles and resource filters.

**Props:**

| Prop | Type | Description |
|---|---|---|
| `initialVisibility` | `object` | Mirror of `layerVisibility` from page.tsx |
| `onLayerToggle` | `(id: string, visible: boolean) => void` | Bubbles individual toggle to page.tsx |
| `onCropFilterChange` | `(crops: string[]) => void` | Bubbles visible crop list to page.tsx |
| `onCompositionFiltersChange` | `React.Dispatch<SetStateAction<CompositionFilters>>` | `setCompositionFilters` passed directly |
| `compositionLookup` | `CompositionLookup` | Crop name → CompositionData for filter application |
| `compositionFilters` | `CompositionFilters` | Current filter state (controlled) |
| `croplandOpacity` | `number` | Current feedstock layer opacity |
| `setCroplandOpacity` | `(opacity: number) => void` | Bubbles opacity change (note: prop is named `setCroplandOpacity`, not `onOpacityChange`) |
| `infrastructureMaster` | `boolean` | Whether any infrastructure layer is visible (note: prop is `infrastructureMaster`, not `computedInfrastructureMaster`) |
| `transportationMaster` | `boolean` | Whether any transportation layer is visible (note: prop is `transportationMaster`, not `computedTransportationMaster`) |
| `onInfrastructureToggle` | `(visible: boolean) => void` | Toggles all infrastructure |
| `onTransportationToggle` | `(visible: boolean) => void` | Toggles all transportation |
| `onShowAllLayers` | `() => void` | Show all layers (note: `onShowAllLayers`, not `onShowAll`) |
| `onHideAllLayers` | `() => void` | Hide all layers (note: `onHideAllLayers`, not `onHideAll`) |
| `onClosePopupForLayer` | `(layerId: string) => void` | Signals the component to close a specific layer's popup |

**UI Sections:**

1. **Layers accordion** — Show All / Hide All buttons
2. **Crop Residues** — master toggle, opacity slider, search box, per-crop checkboxes with color squares
3. **Infrastructure** — master checkbox + 17 facility subtypes
4. **Transportation** — master checkbox + 6 subtypes
5. **Filters accordion**:
   - Seasonal Availability: dual-handle month range slider (Jan=1 to Dec=12)
   - Feedstock Type: 5 category checkboxes (Tree/Vine/Nut, Grain/Field, Vegetable/Specialty, Pasture/Forage, Idle/Fallow)
   - Biomass Composition: 5 range sliders (moisture 0–80%, cellulose 0–60%, lignin 0–40%, ash 0–30%, HHV 8–22 MJ/kg)

**Filter logic** (applied in `applyAllFilters()`):

```
For each crop:
  1. isCropAvailableInRange(crop, monthRange) — checks residue harvest window
  2. getFeedstockCharacteristics(crop).category matches selected categories
  3. cropPassesCompositionFilters(crop, compositionLookup, compositionFilters)
  → If all pass: include in visibleCrops
```

**Direct layer manipulation:**  
Calls `window.mapboxMap.setLayoutProperty()` for immediate response without waiting for React prop propagation.

---

### `src/components/SitingButton.tsx`

Small floating button rendered as a map overlay.

**Props:**
- `onClick: () => void` — activates siting mode
- `isActive: boolean` — shows blue (active) vs white (inactive) styling

**Renders:** MapPin icon + "New Siting Analysis" label. Prevents event bubbling on click.

---

### `src/components/SitingAnalysis.tsx`

Floating card shown during siting analysis with buffer radius controls.

**Props:**

| Prop | Type | Description |
|---|---|---|
| `onClose` | `() => void` | Closes/cancels siting mode |
| `onRadiusChange` | `(radius: number) => void` | Updates buffer radius |
| `onUnitChange` | `(unit: 'miles' \| 'kilometers') => void` | Updates buffer unit |
| `onRemoveSite` | `(() => void) \| undefined` | Removes current marker |
| `radius` | `number` | Current radius value |
| `unit` | `'miles' \| 'kilometers'` | Current unit |
| `isActive` | `boolean` | Whether awaiting map click |
| `hasPlacedMarker` | `boolean` | Whether a marker is already placed |

**Internal state:** `isCollapsed: boolean`

**UI:**
- Number input + unit select dropdown side-by-side
- Slider (max 50 mi / 80 km)
- Status text based on `isActive` and `hasPlacedMarker`
- "Cancel" button (when active, no marker placed)
- "Remove Current Site" button (when marker placed)

---

### `src/components/SitingInventory.tsx`

Detailed inventory table for all crop residues within the siting buffer zone, plus energy and technology analysis.

**Props:**

| Prop | Type | Description |
|---|---|---|
| `isVisible` | `boolean` | Whether to show the panel |
| `inventory` | `CropInventory[]` | `{ name, acres, color }` from Map.js spatial query |
| `totalAcres` | `number` | Sum of all crop acres in buffer |
| `bufferRadius` | `number` | Radius value |
| `bufferUnit` | `string` | "miles" or "km" |
| `location` | `{ lng, lat } \| null` | Marker coordinates |
| `geoids` | `string[]` (optional) | County FIPS codes in buffer |
| `compositionFilters` | `CompositionFilters` (optional) | Applied filters |

**Internal state (useState):**
- `isCollapsed` — whether the panel is collapsed
- `residueReady` — whether residue data has finished loading
- `availabilityMap` — `Record<cropName, string>` e.g. `"Aug–Oct"` (formatted)
- `rawAvailabilityMap` — `Record<cropName, { fromMonth, toMonth }>` (raw month numbers)
- `availabilityLoading` — whether availability data is still fetching
- `compositionByResource` — `Record<apiResource, CompositionData>` fetched per unique resource
- `compositionLoading` — whether composition data is still fetching
- `expandedCrops` — `Set<string>` of crop names with expanded composition rows

**Derived values (useMemo):**
- `baseResidueRows` — crops augmented with dry/wet ton estimates (equivalent to `inventoryWithResidues`)
- `filteredInventory` — `baseResidueRows` after composition filter applied
- `compositionLookupFromInventory` — composition lookup scoped to crops in the buffer
- `energyTotals` — result of `computeEnergyTotals()`
- `techScores` — result of `rankTechnologies()`
- `totalDryResidue`, `totalWetResidue` — aggregate tonnage

**Data fetched on mount / when geoids change:**
1. `getAvailability(apiResource, geoid)` for each crop's API resource
2. `getAnalysisByResource(apiResource, geoid)` for each unique resource
3. `getCropResidueFactors(cropName)` (synchronous from cached residue-data.ts)

**Table columns:** Crop Type | Acres | % of Area | Dry Residue (tons/yr) | Wet Residue (tons/yr) | Availability

**Sub-panels rendered below table:**
- `EnergyPotentialCard` — energy totals
- `TechnologyRecommender` — scored technology list
- `SeasonalSupplyTimeline` — Gantt chart
- `FeedstockCompositionPanel` — expandable per-crop detail

**Export:** `handleExportCSV()` generates CSV with metadata header + full inventory.

---

### `src/components/EnergyPotentialCard.tsx`

Displays energy potential from all crops in the siting buffer.

**Props:**
- `totals: EnergyTotals | null`
- `isLoading: boolean`

**Internal state:** `unit: 'GJ' | 'MMBTU' | 'MWh'`

**Displays:**
- Unit toggle buttons
- Total energy in selected unit
- Top 5 crops by energy share with percentage bars
- Estimated electricity equivalent at 28% thermal efficiency
- Footnote if any HHV values came from literature fallbacks

---

### `src/components/FeedstockCompositionPanel.tsx`

Per-crop biochemical breakdown table, rendered as an expandable row in SitingInventory.

**Props:**
- `composition: CompositionData` — the data to display
- `source: 'api' | 'fallback'` — shown as badge

**Displays 12 metrics** (where defined): Cellulose, Hemicellulose, Lignin, Ash, Moisture, Carbon, Hydrogen, Nitrogen, Sulfur, Volatile Matter, Fixed Carbon, HHV (MJ/kg).

**Color coding:** Green = ideal, Amber = acceptable, Red = below target, Neutral = no preference. Thresholds are technology-agnostic reference ranges.

---

### `src/components/TechnologyRecommender.tsx`

Shows ranked conversion technology scores for the feedstock mix in the buffer zone.

**Props:**
- `scores: TechScore[]`
- `isLoading: boolean`

**Displays:** Top 3 technologies with score bars, color indicators (green ≥60, amber 35–59, gray <35), and expandable rationale.

Technologies: Anaerobic Digestion, Direct Combustion / CHP, Pyrolysis / Gasification, Fermentation (Ethanol), Composting.

---

### `src/components/SeasonalSupplyTimeline.tsx`

Horizontal Gantt-style chart showing when each crop's residues are available.

**Props:**
- `crops: TimelineCrop[]` — `{ name, color, dryTons, fromMonth, toMonth }`
- `isLoading: boolean`

**Displays:** Top 12 crops by dry tons. Month columns Jan–Dec. Bar height proportional to tonnage. Monthly cumulative tonnage bar at bottom. Peak month highlighted.

Handles wrap-around seasons (e.g., Nov → Feb).

---

### `src/components/CountyFeedstockPanel.tsx`

Floating card (bottom-right) showing USDA agricultural statistics for a clicked county.

**Props:**
- `countyName: string`
- `geoid: string` — 5-digit FIPS code
- `onClose: () => void`

**Internal state:** `stats: CountyCropStat[]`, `loading: boolean`, `error: string | null`

**On mount:** Calls `fetchCountyFeedstockStats(geoid)`. Displays table with columns: Crop | Acres Harvested | Production | Source. Sources are shown for the selected visible metrics, so one row can show both census and survey badges. Max height 320px, scrollable. CSV export button.

---

### `src/components/MapLegend.js`

Static map legend. No props, no state.

---

### `src/components/bug-report/ReportBugModal.tsx`

Bug report form rendered in a Radix Dialog modal.

**Props:**
- `isOpen: boolean`
- `onClose: () => void`

**Internal state:** `title`, `description`, `reporterName`, `reporterEmail`, `screenshots: ScreenshotFile[]`, `isSubmitting`, `error`, `submitted`

**On submit:**
1. Validates title and description (required)
2. POSTs FormData to `POST /api/bug-reports`
3. Shows success state or error message
4. Resets form on close

**File constraints:** PNG, JPEG, GIF only. Max 10 MB per file. Multiple files supported via drag-drop or file picker.

---

### `src/components/ui/*`

All components are thin wrappers around Radix UI primitives styled with Tailwind. They accept standard Radix props. Do not add logic here — they are pure presentational primitives.

---

## 9. Library Files

### `src/lib/api.ts`

All typed fetch wrappers. Every function routes through `/api/proxy` to the backend.

**Internal helper:**
```typescript
async function apiFetch<T>(path: string): Promise<T | null>
// Sets cache: 'no-store'. Returns null on any error.
```

**Exported functions:**

| Function | Backend path (via `/api/proxy`) | Returns |
|---|---|---|
| `getCensusByCrop(crop, geoid)` | `/v1/feedstocks/usda/census/crops/{crop}/geoid/{geoid}/parameters` | `CensusListResponse \| null` |
| `getCensusByCropParam(crop, geoid, param)` | `/v1/feedstocks/usda/census/crops/{crop}/geoid/{geoid}/parameters/{param}` | `CensusDataResponse \| null` |
| `getCensusByResource(resource, geoid)` | `/v1/feedstocks/usda/census/resources/{resource}/geoid/{geoid}/parameters` | `CensusListResponse \| null` |
| `getCensusByResourceParam(resource, geoid, param)` | `/v1/feedstocks/usda/census/resources/{resource}/geoid/{geoid}/parameters/{param}` | `CensusDataResponse \| null` |
| `getSurveyByCrop(crop, geoid)` | `/v1/feedstocks/usda/survey/crops/{crop}/geoid/{geoid}/parameters` | `SurveyListResponse \| null` |
| `getSurveyByCropParam(crop, geoid, param)` | `/v1/feedstocks/usda/survey/crops/{crop}/geoid/{geoid}/parameters/{param}` | `SurveyDataResponse \| null` |
| `getSurveyByResource(resource, geoid)` | `/v1/feedstocks/usda/survey/resources/{resource}/geoid/{geoid}/parameters` | `SurveyListResponse \| null` |
| `getSurveyByResourceParam(resource, geoid, param)` | `/v1/feedstocks/usda/survey/resources/{resource}/geoid/{geoid}/parameters/{param}` | `SurveyDataResponse \| null` |
| `getAnalysisByResource(resource, geoid)` | `/v1/feedstocks/analysis/resources/{resource}/geoid/{geoid}/parameters` | `AnalysisListResponse \| null` |
| `getAnalysisByResourceParam(resource, geoid, param)` | `/v1/feedstocks/analysis/resources/{resource}/geoid/{geoid}/parameters/{param}` | `AnalysisDataResponse \| null` |
| `getAvailability(resource, geoid)` | `/v1/feedstocks/availability/resources/{resource}/geoid/{geoid}` | `AvailabilityResponse \| null` |

---

### `src/lib/api-types.ts`

All TypeScript interfaces for API responses.

```typescript
interface DataItemResponse {
  parameter: string;   // e.g. "cellulose", "HHV", "moisture"
  value: number | null;
  unit: string;        // e.g. "%", "MJ/kg"
  dimension?: string | null;
  dimension_value?: number | null;
  dimension_unit?: string | null;
}

// Census/survey single-row response
interface CensusDataResponse {
  usda_crop?: string | null;
  resource?: string | null;
  geoid: string;
  parameter: string;
  value: number | null;
  unit: string;
  dimension?: string | null;
  dimension_value?: number | null;
  dimension_unit?: string | null;
}

// Census list response — an object with a nested data array
interface CensusListResponse {
  usda_crop?: string | null;
  resource?: string | null;
  geoid: string;
  data: DataItemResponse[];
}

interface SurveyDataResponse extends CensusDataResponse {
  survey_program_id?: number | null;
  survey_period?: string | null;
  reference_month?: string | null;
  seasonal_flag?: boolean | null;
}

interface SurveyListResponse extends CensusListResponse {
  survey_program_id?: number | null;
  survey_period?: string | null;
  reference_month?: string | null;
  seasonal_flag?: boolean | null;
}

// Analysis list response — an object with a nested data array
interface AnalysisListResponse {
  resource: string;
  geoid: string;
  data: DataItemResponse[];
}

// Analysis single-row response — simpler than CensusDataResponse (no dimension fields)
interface AnalysisDataResponse {
  resource: string;
  geoid: string;
  parameter: string;
  value: number | null;
  unit: string;
}

interface AvailabilityResponse {
  resource: string;
  geoid: string;
  from_month: number;  // 1–12
  to_month: number;    // 1–12
}

interface ApiErrorResponse { detail: string }
```

---

### `src/lib/composition-filters.ts`

Core composition data types, filter types, batch fetch, and filter application.

**Key types:**
```typescript
interface CompositionData {
  cellulose?: number;       // % dry basis
  hemicellulose?: number;
  lignin?: number;
  extractives?: number;
  moisture?: number;        // % as-received
  ash?: number;             // % dry basis
  volatileMatter?: number;
  fixedCarbon?: number;
  carbon?: number;
  hydrogen?: number;
  oxygen?: number;
  nitrogen?: number;
  sulfur?: number;
  hhv?: number;             // MJ/kg dry basis
  lhv?: number;
  hasData: boolean;
}

interface CompositionFilters {
  moisture: [number, number];   // [min, max]
  cellulose: [number, number];
  lignin: [number, number];
  ash: [number, number];
  hhv: [number, number];
}

type CompositionLookup = Record<string, CompositionData>;  // landiqCropName → data

const COMPOSITION_FILTER_BOUNDS = {
  moisture: [0, 80],
  cellulose: [0, 60],
  lignin: [0, 40],
  ash: [0, 30],
  hhv: [8, 22],
};

const DEFAULT_COMPOSITION_FILTERS = COMPOSITION_FILTER_BOUNDS;  // full range = no filtering
```

**Exported functions:**

| Function | Description |
|---|---|
| `batchFetchCompositionData(geoid?)` | Fetches all LandIQ crops at once (deduped by resource). Returns `CompositionLookup`. |
| `parseCompositionData(response)` | Extracts typed fields from `AnalysisListResponse`. Returns `{ hasData: false }` if null. |
| `cropPassesCompositionFilters(cropName, lookup, filters)` | Returns boolean. API data first, then COMPOSITION_FALLBACKS. Never hides crops without data. |
| `isCompositionFiltersActive(filters)` | Returns true if any filter is narrower than defaults. |

---

### `src/lib/composition-fallbacks.ts`

Static literature values for ~100 crop types. Used when API returns no composition data.

Sources: Phyllis2/ECN (TNO Netherlands), NREL, BioResources, MDPI Polymers/Energies, ScienceDirect.

All values on dry basis (moisture as-received). Grouped by crop category.

**Export:** `COMPOSITION_FALLBACKS: Record<string, Partial<CompositionData>>`

---

### `src/lib/constants.ts`

**Exports:**

| Export | Description |
|---|---|
| `FEEDSTOCK_TILESET_ID` | Mapbox tileset ID for the LandIQ cropland layer (deprecated — use `TILESET_REGISTRY`) |
| `CROP_NAME_MAPPING` | `Record<string, string>` — 76 LandIQ crop name standardizations |
| `FEEDSTOCK_CATEGORIES` | `{ TREE_VINE_NUT, GRAIN_FIELD, VEGETABLE_SPECIALTY, PASTURE_FORAGE, FALLOW_IDLE } as const` — an object with named keys, not a `string[]` |
| `FEEDSTOCK_CHARACTERISTICS` | `Record<string, { category, processingSuitability[] }>` — 68 crops |
| `PROCESSING_TYPES` | `{ ANAEROBIC_DIGESTION, PYROLYSIS, COMBUSTION, COMPOSTING, ANIMAL_BEDDING } as const` — feedstock suitability categories (distinct from the scored technology names in `technology-matcher.ts`) |
| `getFeedstockCharacteristics(cropName)` | Lookup function → `{ category, processingSuitability }` |
| `getCropResidueFactors(cropName)` | Returns `ResidueFactorsResult \| null` where `ResidueFactorsResult = { factors: ResidueFactors[]; source: 'api' \| 'fallback' }` — `factors` is an array |

---

### `src/lib/county-analysis.ts`

**Exports:**

| Export | Description |
|---|---|
| `fetchCountyFeedstockStats(geoid)` | Fetches both census and survey stats for each mapped resource at a county, merges parameter-level facts, and returns rows with displayable acres or production metrics. |
| `getCountyMetric(stat, metric)` | Selects the exact displayed acres or production metric. Production ignores `operations` unit rows such as `area in production`. |
| `getDisplaySources(...metrics)` | Returns the unique census/survey sources used by the selected visible metrics. |
| `CountyCropStat` | `{ landiqName, resource, parameters: CountyParameterStat[], source: 'census' \| 'survey' \| 'mixed' }` |
| `CountyParameterStat` | `{ parameter, value, unit, source: 'census' \| 'survey' }` |
| `CountyMetricValue` | `{ parameter, value, unit, source: 'census' \| 'survey' }` |
| `PRIORITY_PARAMS` | `['area harvested', 'area planted', 'production', 'yield', 'price received']` |

---

### `src/lib/county-lookup.ts`

**Exports:**

| Export | Description |
|---|---|
| `getCountyGeoid(countyName)` | Returns 5-digit FIPS GEOID for a CA county name. Case-insensitive. Returns `null` if not found. |
| `getAllCountyGeoids()` | Returns the full `Record<string, string>` map (58 CA counties). |

GEOID format: `"06"` (CA state FIPS) + 3-digit county code. Example: `Alameda → "06001"`.

---

### `src/lib/energy-calculations.ts`

**Exports:**

| Export | Type | Description |
|---|---|---|
| `HHV_FALLBACKS` | `Record<string, number>` | Literature HHV values in MJ/kg for 16 crops |
| `computeEnergyTotals(crops, hhvLookup)` | Function | Aggregates energy across crops. Prefers API HHV, falls back to `HHV_FALLBACKS`. |
| `EnergyTotals` | Interface | `{ totalGj, totalMmbtu, totalMwh, electricityMwh, allApiData, cropBreakdown }` |
| `CropEnergyResult` | Interface | `{ cropName, dryTons, hhv, hhvSource: 'api' \| 'fallback', energyGj }` |

**Unit conversions:** 1 short ton = 907.185 kg. 1 GJ = 0.947817 MMBTU = 0.277778 MWh. Electricity = total thermal × 0.28 efficiency.

**Formula:** `energyGj = dryTons × 907.185 kg/ton × hhv MJ/kg ÷ 1000`

---

### `src/lib/github.ts`

Server-only. Creates GitHub issues from bug reports with optional screenshot attachments.

**Exports:**

| Export | Description |
|---|---|
| `createGitHubIssueFromBugReport(bugReport, screenshots)` | Creates issue + uploads images to `bug-report-assets` branch. Returns `{ issueNumber, issueUrl } \| null`. All errors are caught and logged — never throws. |

**Process:**
1. Validates config (no-ops if `GITHUB_ISSUE_CREATE_ENABLED !== 'true'` or tokens missing)
2. Ensures labels `bug` and `user-reported` exist
3. Uploads each screenshot: creates blob → tree → commit → updates `bug-report-assets` branch ref
4. Creates issue with formatted markdown body including image links
5. Supports GitHub Enterprise via `GITHUB_BASE_URL`

---

### `src/lib/labelMappings.js`

Maps raw Mapbox feature property keys to human-readable popup labels for each infrastructure layer type.

**Exports:**
- Individual label objects per layer type: `ANAEROBIC_DIGESTERS_LABELS`, `BIOREFINERIES_LABELS`, `BIODIESEL_PLANTS_LABELS`, `CEMENT_PLANTS_LABELS`, `FOOD_BANKS_LABELS`, `FOOD_PROCESSORS_LABELS`, `FOOD_RETAILERS_LABELS`, `FARMERS_MARKETS_LABELS`, `LANDFILLS_LABELS`, `MATERIAL_RECOVERY_FACILITIES_LABELS`, `POWER_PLANTS_LABELS`, `RAIL_LINES_LABELS`, `RENEWABLE_DIESEL_PLANTS_LABELS`, `SUSTAINABLE_AVIATION_FUEL_PLANTS_LABELS`, `WASTEWATER_TREATMENT_PLANTS_LABELS`
- `layerLabelMappings` — combined lookup: `Record<layerId, labelObject>`

Used by `Map.js` `createPopupForFeature()`.

---

### `src/lib/residue-data.ts`

Async loader for the live `resource_info.json` from GitHub Pages.

**Data source:** `https://sustainability-software-lab.github.io/ca-biositing/resource_info.json`

**Raw JSON fields per record:** `resource`, `resource_code`, `landiq_crop_name`, `residue_type`, `collected`, `from_month`, `to_month`, `residue_yield_wet_ton_per_ac`, `moisture_content`, `residue_yield_dry_ton_per_ac`

**Exports:**

| Export | Description |
|---|---|
| `fetchResidueData()` | Fetches and caches the JSON. Idempotent. |
| `getResidueData(standardizedCropName)` | Returns `ResidueFactors[]` for a crop (empty array if not found). Synchronous after load. |
| `onResidueDataLoaded(callback)` | Subscribe to load completion. Fires immediately if already loaded. |
| `ResidueFactors` | `{ resourceName, wetTonsPerAcre, moistureContent, dryTonsPerAcre, seasonalAvailability, fromMonth?, toMonth?, residueType, collected, category? }` |

---

### `src/lib/residue-fallbacks.ts`

Static fallback residue factors for crops not present in `resource_info.json` or where yield = 0.

**Export:** `RESIDUE_FALLBACKS: Record<string, ResidueFactors>`

---

### `src/lib/resource-mapping.ts`

Two key lookup tables that map LandIQ crop names to API identifiers.

**Exports:**

| Export | Description |
|---|---|
| `LANDIQ_TO_API_RESOURCE` | `Record<string, string>` — 18 crops → internal resource name (e.g. `"Almonds" → "almond hulls"`) |
| `LANDIQ_TO_USDA_CROP` | `Record<string, string>` — 35 crops → USDA NASS canonical name (e.g. `"Almonds" → "ALMONDS"`) |
| `getApiResource(landiqCropName)` | Returns resource name or `null` |
| `getUsdaCropName(landiqCropName)` | Returns USDA name or `null` |

**When adding a new crop:** Add entries to both maps, then add fallback values to `composition-fallbacks.ts` and `residue-fallbacks.ts`.

---

### `src/lib/service-token.ts`

Server-only backend credential helper for the Cal BioScape backend.

**Exports:**

| Export | Description |
|---|---|
| `getServiceToken()` | Returns API key or cached JWT. If `CA_BIOSITE_API_KEY` is set, returns it immediately (no network call). Otherwise fetches a JWT via `POST {BASE_URL}/v1/auth/token`, caches it for `expires_in - 60s` (max 55 min), and deduplicates in-flight requests. Returns `""` on failure. |
| `invalidateServiceToken()` | Clears the JWT cache (called by proxy route after 401 in JWT mode). No-op in API key mode. |
| `isApiKeyAuth()` | Returns `true` if `CA_BIOSITE_API_KEY` is set. Used by the proxy route to select the auth header (`X-API-Key` vs `Authorization: Bearer`) and disable retry-on-401 in API key mode. |

**Legacy JWT fallback credentials:** `CA_BIOSITE_API_USER` + `CA_BIOSITE_API_PASSWORD` → `grant_type=password` form POST. Do not use this mode for Cloud Run staging or production deploys.

**Never import this in client components.**

---

### `src/lib/technology-matcher.ts`

Scores and ranks biomass conversion technologies for a given feedstock mix.

**Exports:**

| Export | Description |
|---|---|
| `computeMixSummary(crops, compositionByResource)` | Weighted-average composition by dry tons. Skips crops without data. Returns `FeedstockMixSummary`. |
| `rankTechnologies(summary)` | Scores all 5 technologies. Returns `TechScore[]` sorted by score descending. |
| `FeedstockMixSummary` | `{ moisture?, ash?, cellulose?, hemicellulose?, lignin?, carbon?, nitrogen?, volatileMatter?, hhv?, totalDryTons }` |
| `TechScore` | `{ name, shortName, score: 0–100, rationale: string[], color: 'green' \| 'amber' \| 'gray' }` |

**Scoring rules summary:**

| Technology | Key drivers |
|---|---|
| Anaerobic Digestion | Moisture >50% (+35), N >2% (+25), volatile matter >75% (+20) |
| Combustion / CHP | Moisture <15% (+30), ash <5% (+20), HHV >17 MJ/kg (+20), baseline 20 |
| Pyrolysis / Gasification | Moisture <15% (+30), carbon >48% (+20), cellulose >30% (+20), baseline 15 |
| Fermentation | Cellulose >35% (+40), lignin <15% (+25), hemicellulose >20% (+15) |
| Composting | Baseline 30, N >1.5% (+20), moisture >40% (+15), HHV <14 MJ/kg (+10) |

Color thresholds: green ≥60, amber 35–59, gray <35.

---

### `src/lib/tileset-registry.ts`

Registry of all 25 Mapbox layer configs used by the application. There are 24 unique custom tileset IDs because the SAF plants and renewable diesel layers share one Mapbox tileset/source layer.

**TilesetConfig interface:**
```typescript
interface TilesetConfig {
  tilesetId: string;      // e.g. "tylerhuntington222.cropland_landiq_2023"
  sourceLayer: string;    // Stable source layer name (does not change with version)
  displayName: string;
  category: 'feedstock' | 'infrastructure' | 'transportation';
  version: string;        // e.g. "2024-01"
  accountType?: 'legacy' | 'default';  // 'legacy' = tylerhuntington222 account
}
```

Most tilesets use the legacy `tylerhuntington222.*` Mapbox account. Tomato processor facilities use the `sustainasoft.*` account. Source layer names are stable — only the tileset ID changes when data is updated.

**Exports:**
- `TILESET_REGISTRY: Record<string, TilesetConfig>` — the active registry (with env overrides applied); keyed by layer name (e.g. `"feedstock"`, `"anaerobicDigester"`)
- `DEFAULT_TILESET_REGISTRY: Record<string, TilesetConfig>` — base registry before env overrides
- `FEEDSTOCK_TILESET_ID` — deprecated compatibility export for the feedstock tileset ID
- `INFRASTRUCTURE_LAYERS` — deprecated compatibility export for a small subset of infrastructure layers

`ENV_OVERRIDES` is an internal, non-exported map of `NEXT_PUBLIC_TILESET_*` env var overrides applied at module load time.

---

### `src/lib/utils.ts`

General utilities.

**Exports:**

| Export | Description |
|---|---|
| `cn(...classes)` | Merges Tailwind class strings via `clsx` + `tailwind-merge` |
| `formatNumberWithCommas(n)` | Locale-aware number formatting |
| `downloadCSV(data, filename, metadata?)` | Generates and triggers browser download of a CSV file |

---

## 10. API Layer

### Proxy architecture

```
Browser (client component)
  → fetch('/api/proxy/v1/feedstocks/analysis/resources/almond%20hulls/geoid/06001/parameters')
  → src/app/api/proxy/[...path]/route.ts (server, GET only)
      → isApiKeyAuth()?
          YES → X-API-Key: <key>  (no retry on 401)
          NO  → Authorization: Bearer <jwt>  (retry once on 401)
      → fetch('https://api-staging.calbioscape.org/v1/feedstocks/...', { headers })
      → stream response back to browser
```

- **Only GET is exported** from the proxy route — POST is not supported
- Auth header selection: `isApiKeyAuth()` → `X-API-Key` (API key mode) vs `Authorization: Bearer` (JWT mode)
- On 401 in JWT mode: calls `invalidateServiceToken()` and retries once
- On 401 in API key mode: returns 401 immediately — a revoked key cannot recover
- Preserves all query params
- `NEXT_PUBLIC_API_BASE_URL` controls the backend target

### Token lifecycle

**Legacy JWT fallback mode** (when `CA_BIOSITE_API_KEY` is not set):
1. First call → `POST /v1/auth/token` with username/password
2. Token cached in module-level variable with `expiresAt`
3. Subsequent calls return cached token (no network)
4. On 401 from backend → `invalidateServiceToken()` → next call re-fetches
5. In-flight deduplication: concurrent calls share one `Promise`

**API key mode** (when `CA_BIOSITE_API_KEY` is set):
1. `getServiceToken()` returns the key string immediately — no network, no caching needed
2. `isApiKeyAuth()` returns `true`
3. No retry on 401

---

## 11. API Routes

### `GET /api/proxy/[...path]`

**File:** `src/app/api/proxy/[...path]/route.ts`

Proxies any GET path to the backend. Injects `X-API-Key` (API key mode) or `Authorization: Bearer` (JWT mode). In JWT mode, retries once on 401. Only `GET` is exported — no POST handler. Forwards query params.

### `POST /api/bug-reports`

**File:** `src/app/api/bug-reports/route.ts`

Accepts `multipart/form-data`:
- `title` (required)
- `description` (required)
- `reporterName` (optional)
- `reporterEmail` (optional)
- `screenshot-N` (optional, PNG/JPEG/GIF, max 10 MB each)

Calls `createGitHubIssueFromBugReport()` fire-and-forget (does not await).  
Returns: `{ success: true, issueUrl }` or `400`/`500` JSON error.

### `GET /api/bug-reports/test`

**File:** `src/app/api/bug-reports/test/route.ts`

Dev-only smoke test. Returns current GitHub config status (without secrets).

### `GET /api/auth/token`

**File:** `src/app/api/auth/token/route.ts`

Debug endpoint. Calls `getServiceToken()` and returns `{ hasToken: boolean }`. Never returns the token itself.

---

## 12. Data Flows

### Siting analysis (user clicks map to place a site)

```
1. User clicks "New Siting Analysis" (SitingButton)
   → Map.js enters siting mode (cursor = crosshair)

2. User clicks on map
   → Map.js: creates Marker at click coords
   → @turf/circle: creates buffer polygon (radius × unit)
   → map.querySourceFeatures('feedstock-source'): finds crops in buffer
   → crop inventory built: { name, acres, color }[]
   → onGeoidsChange(countyFips[]) emitted to page.tsx
   → setBufferGeoids(geoids)

3. SitingInventory mounts (isVisible = true)
   → useEffect: for each unique apiResource:
       getAnalysisByResource(resource, geoids[0]) → compositionByResource
       getAvailability(resource, geoids[0]) → availabilityMap
   → getCropResidueFactors(cropName) (sync) → residue tons per acre
   → inventoryWithResidues computed
   → filteredInventory = apply compositionFilters
   → energyTotals = computeEnergyTotals(filteredInventory, hhvLookup)
   → techScores = rankTechnologies(computeMixSummary(filteredInventory, compositionByResource))
   → All sub-panels render

4. User adjusts buffer radius
   → Map.js redraws buffer, re-queries features
   → SitingInventory re-fetches with new inventory

5. User clicks "Remove Current Site" or closes analysis
   → cleanupSitingElements(): removes marker, buffer layers
   → SitingInventory unmounts
```

### Composition filter (user moves a slider)

```
1. User adjusts slider in LayerControls "Biomass Composition" section
   → onCompositionFiltersChange(newFilters) bubbles to page.tsx
   → setCompositionFilters(newFilters)

2. LayerControls.applyAllFilters() runs:
   → For each crop: cropPassesCompositionFilters(crop, compositionLookup, newFilters)
   → Builds Mapbox filter expression with passing crops
   → window.mapboxMap.setFilter('feedstock-layer', expression) — direct, no React cycle

3. If SitingInventory is open:
   → compositionFilters prop changes
   → filteredInventory recomputed
   → energyTotals and techScores recomputed
```

### County selection (user clicks a county on map)

```
1. User clicks on county polygon in Map.js
   → onCountySelect(countyName, geoid) emitted to page.tsx
   → setSelectedCounty({ name, geoid })

2. CountyFeedstockPanel mounts
   → fetchCountyFeedstockStats(geoid):
       for each resource in LANDIQ_TO_API_RESOURCE:
         getCensusByResource(resource, geoid, { throwOnAuthError: true })
         getSurveyByResource(resource, geoid, { throwOnAuthError: true })
       → merges census and survey parameters into CountyParameterStat[]
       → filters to rows with displayable acres or production metrics
   → getCountyMetric(stat, 'acres' | 'production') selects exact metrics:
       Acres Harvested: area harvested/acres harvested in acres, with planted-acre fallback
       Production: exact production parameter only; operation-count rows are ignored
   → Table renders USDA statistics and source badges for the selected metrics

3. User clicks close
   → setSelectedCounty(null)
   → CountyFeedstockPanel unmounts
```

### Residue data preload (app startup)

```
1. page.tsx useEffect (on mount):
   → fetchResidueData()
       → fetch(resource_info.json from GitHub Pages)
       → parse: build Record<landiqCropName, ResidueFactors[]>
       → fire onResidueDataLoaded callbacks

2. LayerControls subscribes via onResidueDataLoaded()
   → Re-applies seasonal availability filter when data loads

3. SitingInventory uses getCropResidueFactors(cropName) synchronously
   → If data already loaded: returns from cache
   → Falls back to RESIDUE_FALLBACKS if crop not in JSON or yield = 0
```

---

## 13. External Data Sources

### Cal BioScape Backend API

- **Base URL:** `NEXT_PUBLIC_API_BASE_URL` (Cloud Build sets staging/prod explicitly; code fallback is `https://api.calbioscape.org`)
- **Auth:** API key mode (`CA_BIOSITE_API_KEY` → `X-API-Key`) for deployed staging/production; legacy OAuth2 password grant → JWT fallback only when the API key is absent
- **Endpoints used:** `/v1/auth/token` (JWT fallback only), `/v1/feedstocks/usda/census/*`, `/v1/feedstocks/usda/survey/*`, `/v1/feedstocks/analysis/*`, `/v1/feedstocks/availability/*`
- **All access via:** `/api/proxy` route — never called directly from browser

### Mapbox GL

- **Style:** `mapbox://styles/mapbox/light-v11`
- **Token:** `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`
- **25 registry entries:** 1 feedstock (LandIQ 2023 cropland), 18 infrastructure, 6 transportation
- **24 unique custom tileset IDs:** SAF plants and renewable diesel plants share one Mapbox tileset/source layer
- **Accounts:** Most tilesets on `tylerhuntington222` (legacy), tomato processors on `sustainasoft`
- **Source layers are stable** — only tileset IDs change between data updates

### GitHub (Enterprise)

- **Host:** `lbl.github.com` (GitHub Enterprise)
- **API base:** `https://lbl.github.com/api/v3` (set via `GITHUB_BASE_URL`)
- **Usage:** Bug report issue creation, screenshot uploads to `bug-report-assets` branch
- **Auth:** Personal Access Token with `repo` scope

### Resource Info JSON

- **URL:** `https://sustainability-software-lab.github.io/ca-biositing/resource_info.json`
- **Purpose:** Live residue yield factors, seasonal availability windows, residue types
- **Fetched:** Once on app startup, cached in module memory

### USDA NASS Data

- **Not fetched directly** — routed through Cal BioScape backend
- **Data types:** Census (decennial) and Survey (annual estimates) for crop acreage, production, yield, price

---

## 14. Constants & Mappings

### CROP_NAME_MAPPING (`src/lib/constants.ts`)

76 entries mapping raw LandIQ crop name strings to standardized internal names used throughout the app.

### LANDIQ_TO_API_RESOURCE (`src/lib/resource-mapping.ts`)

18 entries mapping LandIQ crop names to internal API resource identifiers (e.g. `"Almonds" → "almond hulls"`). Used in all API calls.

**When adding a crop that has backend API support:** add an entry here.

### LANDIQ_TO_USDA_CROP (`src/lib/resource-mapping.ts`)

35 entries mapping LandIQ crop names to USDA NASS canonical crop names (ALLCAPS). Used by census/survey endpoints.

### COUNTY_GEOID (`src/lib/county-lookup.ts`)

All 58 California counties → 5-digit FIPS GEOID. Hardcoded (no API). Used as the `geoid` parameter in all backend calls.

### COMPOSITION_FALLBACKS (`src/lib/composition-fallbacks.ts`)

~100 crops with literature composition values. Applied when `getAnalysisByResource()` returns no data. Sources: Phyllis2 database (ECN/TNO), NREL, peer-reviewed publications.

### HHV_FALLBACKS (`src/lib/energy-calculations.ts`)

16 crops with HHV values in MJ/kg (dry basis). Applied when API returns no HHV for energy calculations.

### layerLabelMappings (`src/lib/labelMappings.js`)

15 infrastructure layer types → field name → human-readable label. Used to format Mapbox popup content.

### RESIDUE_FALLBACKS (`src/lib/residue-fallbacks.ts`)

Static residue yield factors for crops not in the live `resource_info.json`.

---

## 15. Tileset Registry

All layer configs are defined in `src/lib/tileset-registry.ts` (25 registry entries; 24 unique Mapbox tileset IDs):

| Category | Count | Account | Notes |
|---|---|---|---|
| Feedstock | 1 | tylerhuntington222 (legacy) | LandIQ 2023 CA cropland |
| Infrastructure | 17 | tylerhuntington222 (legacy) | All facility types except tomato processors |
| Infrastructure | 1 | sustainasoft | Tomato processor facilities |
| Transportation | 6 | tylerhuntington222 (legacy) | Rail lines, freight terminals, freight routes, petroleum, crude oil, natural gas pipelines |

Total: 25 registry entries (1 feedstock + 18 infrastructure + 6 transportation). SAF plants and renewable diesel plants share the same Mapbox tileset ID (`tylerhuntington222.6x05ytem`), so there are 24 unique custom tileset IDs.

**Source layer names are stable across versions.** Only the tileset ID (which includes a `YYYY-MM` date suffix) changes when data is updated. Update `tilesetId` in the registry without changing any other code.

Infrastructure tilesets: anaerobic digesters, biorefineries, SAF plants, renewable diesel plants, material recovery facilities, cement plants, biodiesel plants, landfills (LFG), wastewater treatment plants, waste-to-energy, combustion plants, district energy systems, food processors (general), tomato processors (separate tileset), food banks, farmers markets, food retailers, power plants.

Transportation tilesets: rail lines, freight terminals, freight routes, petroleum pipelines, crude oil pipelines, natural gas pipelines.

---

## 16. Deployment

### Docker

`Dockerfile` uses `node:20.20.0-slim` as the base image:
1. `npm install` — installs dependencies
2. Verifies `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` is non-empty (exits 1 if missing) — prevents silent broken builds
3. `npm run build` — produces the Next.js production bundle
4. Exposes port 3000, starts with `npm start`

Mapbox tokens are passed as `--build-arg` at build time (baked into the client bundle).

### Google Cloud Run

Three Cloud Build pipelines deploy to Cloud Run:

| Config file | Cloud Run service | Backend API |
|---|---|---|
| `cloudbuild.yaml` | `cal-bioscape-frontend-dev` | Not set by Cloud Build; code fallback is `https://api.calbioscape.org` |
| `cloudbuild-staging.yaml` | `cal-bioscape-frontend-staging` | `https://api-staging.calbioscape.org` |
| `cloudbuild-prod.yaml` | `cal-bioscape-frontend-prod` | `https://api.calbioscape.org` |

**Pipeline steps** (common to all three):
1. Pull `MAPBOX_ACCESS_TOKEN` and `MAPBOX_ACCESS_TOKEN_LEGACY` from GCP Secret Manager
2. `docker build` with those tokens as `--build-arg`
3. Push to Google Container Registry with `$SHORT_SHA` and `{env}-latest` tags
4. `gcloud run deploy --allow-unauthenticated`
5. `gcloud run services update-traffic --to-latest` (staging and prod only)

Runtime secrets are injected differently per environment:

| Environment | Runtime secrets injected |
|---|---|
| dev | None — only sets `ENVIRONMENT=development` env var |
| staging | `CA_BIOSITE_API_KEY` (API key auth), `GITHUB_TOKEN` |
| prod | `CA_BIOSITE_API_KEY` (API key auth), `GITHUB_TOKEN` |

Staging and production use API key auth (`CA_BIOSITE_API_KEY`). Production expects Secret Manager secret `biocirv-production-frontend-api-key`. Dev gets no backend credential from Cloud Build and will fail backend calls without `.env.local`.

The Cloud Run service runs under a **dedicated service account** (not the Compute Engine default SA).

`.github/workflows/google-cloudrun-source.yml` is an unconfigured stub — CI uses Cloud Build directly. `.github/workflows/security.yml` runs npm audit.

### npm scripts

| Script | Command | Description |
|---|---|---|
| `npm run dev` | `next dev` | Local development server |
| `npm run build` | `next build` | Production build |
| `npm run start` | `next start` | Run production build |
| `npm run lint` | `next lint` | Configured script, but currently invalid under Next.js 16 because `next lint` was removed |
| `npm run fetch-data` | `tsx scripts/fetch-tomato-processor-facilities.ts` | Refresh tomato processor GeoJSON |
| `npm run merge-data` | `tsx scripts/data-manipulation.ts` | **Broken** — `scripts/data-manipulation.ts` does not exist |
| `npm audit` | `npm audit --audit-level=high` | Security audit (high severity) |

---

## 17. Development Setup

```bash
# 1. Install dependencies
npm install

# 2. Create environment file
cp .env.example .env.local  # or create manually
# Required vars:
# NEXT_PUBLIC_API_BASE_URL=https://api-staging.calbioscape.org
# NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=<mapbox token>
# CA_BIOSITE_API_KEY=<backend API key>
# Optional (for bug reporting):
# GITHUB_ISSUE_CREATE_ENABLED=true
# GITHUB_TOKEN=<PAT>
# GITHUB_REPO_OWNER=sustainability-software-lab
# GITHUB_REPO_NAME=cal-bioscape-frontend
# GITHUB_BASE_URL=https://lbl.github.com/api/v3

# 3. Start dev server
npm run dev
# App available at http://localhost:3000
```

---

## 18. Conventions Agents Must Follow

### Security

- **Never** put secrets in `NEXT_PUBLIC_*` variables — those are exposed to the browser
- **Never** call the Cal BioScape backend directly from client components — always go through `/api/proxy`
- **Never** import `service-token.ts` or `github.ts` in client components (they are server-only)

### API calls

- All typed API functions are in `src/lib/api.ts` — use them, don't write `fetch()` calls inline
- All functions return `null` on failure — always null-check before using results
- Use `getApiResource(landiqCropName)` from `resource-mapping.ts` to get the resource identifier before any API call
- Use `getCountyGeoid(countyName)` from `county-lookup.ts` to get GEOIDs

### Mapbox layer manipulation

- Direct map manipulation goes through `window.mapboxMap` (set by `Map.js` after load)
- Use `map.setLayoutProperty(layerId, 'visibility', 'visible' | 'none')` to show/hide layers
- Use `map.setFilter(layerId, expression)` to filter features
- Layer IDs in `Map.js` must match the keys used in `layerVisibility` state in `page.tsx`

### Composition & fallback data

- Fallback chain is: API data → COMPOSITION_FALLBACKS → pass through. Never hide a crop solely because it has no composition data.
- The `hasData` field on `CompositionData` indicates whether API data exists — use it to show/hide source badges
- `isCompositionFiltersActive(filters)` — use this to show "ACTIVE" indicators in the UI

### Adding new data

- New crop → API resource mappings go in `src/lib/resource-mapping.ts` (`LANDIQ_TO_API_RESOURCE`)
- New crop → USDA name mappings go in `src/lib/resource-mapping.ts` (`LANDIQ_TO_USDA_CROP`)
- New composition fallback values go in `src/lib/composition-fallbacks.ts`
- New residue factor fallbacks go in `src/lib/residue-fallbacks.ts`
- New Mapbox tileset configs go in `src/lib/tileset-registry.ts`
- New infrastructure layer popup field labels go in `src/lib/labelMappings.js`

### State management

- State lives in `page.tsx`. Do not introduce new React Context or global state libraries without strong justification.
- New state that affects multiple components belongs in `page.tsx`, passed down as props
- Component-local UI state (collapsed/expanded, loading, error) stays in the component

### TypeScript

- Define interfaces for all API responses in `src/lib/api-types.ts`
- Define component prop interfaces inline or in the same file (no separate `types/` directory needed)
- Prefer `null` over `undefined` for missing values (consistent with API return pattern)

### Styling

- Use Tailwind utility classes exclusively — no inline styles, no CSS modules
- Use `cn()` from `src/lib/utils.ts` to conditionally merge class names
- Radix UI primitives in `src/components/ui/` are unstyled — pass Tailwind classes as `className`
- Do not add emoji to the UI unless the design explicitly calls for it

### Commits & branches

- Branch prefix conventions: `feature/`, `fix/`, `refactor/`
- Main branch is `main`. Default development branch is `staging`.
- PRs target `staging` for review before merging to `main`
