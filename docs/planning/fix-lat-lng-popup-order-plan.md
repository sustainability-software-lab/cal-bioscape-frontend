# Plan: Fix popup lat/lon field ordering across all layers

## Context

Mapbox feature popups show lat/lon coordinates scattered among other fields (e.g., Longitude at position 5, Latitude at position 8 in the CARB Food Processors popup). The root cause: `createPopupForFeature` iterates over `feature.properties` in the order the Mapbox tileset stored them (arbitrary), not the `layerLabelMappings` key order. The fix is to drive popup field order from the label mapping, and move lat/lon keys to the end of every label mapping that has them mid-list.

No Mapbox tileset rebuild or re-upload needed — this is a pure frontend rendering fix.

---

## Visual Context

Screenshot shows "Food Processor (CARB) Details" popup with:
- Longitude at position 5 (mid-list)
- Latitude at position 8 (mid-list)

Expected: Name, Address, City, … other fields … Latitude, Longitude (always last, always together).

---

## Files to Change

### 1. `src/components/Map.js` — lines 340–350 (the else-branch of `createPopupForFeature`)

**Current behavior:** `for (const key in properties)` — iterates Mapbox tileset property order (unpredictable).

**New behavior:** When `labels` has keys, iterate `Object.keys(labels)` instead. This gives the popup the same order as the label mapping object, so moving lat/lon to the bottom of each mapping controls where they render. Fall back to property iteration only when no label mapping exists (`labels` is `{}`).

```javascript
} else {
  const excludedKeys = ['id', 'layer', 'source', 'source-layer', 'tile-id', 'Lat/Long Info'];
  const nullValues = ['NA', 'N/A', 'null', '', ' '];
  const labelKeys = Object.keys(labels);

  if (labelKeys.length > 0) {
    // Use label mapping key order so field sequence is deterministic
    labelKeys.forEach(key => {
      if (Object.prototype.hasOwnProperty.call(properties, key) &&
          !nullValues.includes(String(properties[key]).trim())) {
        content += formatAndBuildLine(key, properties[key]);
      }
    });
  } else {
    // No label mapping: fall back to tileset property order
    for (const key in properties) {
      if (Object.prototype.hasOwnProperty.call(properties, key) &&
          !excludedKeys.includes(key) &&
          !nullValues.includes(String(properties[key]).trim())) {
        content += formatAndBuildLine(key, properties[key]);
      }
    }
  }
}
```

### 2. `src/lib/labelMappings.js` — move lat/lon keys to end in 6 mappings

Six label mappings have lat/lon mid-list. Move both keys to the end of each:

| Mapping | Keys to move |
|---|---|
| `RENEWABLE_DIESEL_PLANTS_LABELS` | `lat`, `lon` (currently positions 9–10 of 14) |
| `SUSTAINABLE_AVIATION_FUEL_PLANTS_LABELS` | `latitude`, `longitude` (currently positions 8–9 of 13) |
| `CEMENT_PLANTS_LABELS` | `lat`, `lon` (currently positions 6–7 of 9) |
| `ANAEROBIC_DIGESTERS_LABELS` | `LATITUDE`, `LONGITUDE` (currently positions 11–12 of 22) |
| `LANDFILLS_LABELS` | `Latitude`, `Longitude` (currently positions 5–6 of 10) |
| `WASTEWATER_TREATMENT_PLANTS_LABELS` | `LATITUDE`, `LONGITUDE` (currently positions 4–5 of 8) |

Mappings already with lat/lon at end: MATERIAL_RECOVERY_FACILITIES_LABELS, BIOREFINERIES_LABELS, BIODIESEL_PLANTS_LABELS, FOOD_PROCESSORS_LABELS, CARB_FOOD_PROCESSORS_LABELS, FOOD_RETAILERS_LABELS, POWER_PLANTS_LABELS, FOOD_BANKS_LABELS, FARMERS_MARKETS_LABELS, WASTE_TO_ENERGY_LABELS, COMBUSTION_PLANTS_LABELS, DISTRICT_ENERGY_SYSTEMS_LABELS, FREIGHT_TERMINALS_LABELS — no change needed.

### 3. `tests/label-mappings.test.ts` — add lat/lon ordering assertions

Add two tests:
1. **Lat/lon keys appear last** — for every label mapping that contains lat/lon keys, assert that all lat/lon keys come after all non-lat/lon keys (by index).
2. **Lat/lon keys are adjacent** — assert the two lat/lon keys are consecutive (no other field between them).

Helper: detect lat/lon keys by matching against `['lat', 'lon', 'latitude', 'longitude', 'LATITUDE', 'LONGITUDE', 'Latitude', 'Longitude']`.

---

## Test Plan (TDD)

### Test 1 — `lat/lon keys appear at the end of every label mapping that includes them`
- **File:** `tests/label-mappings.test.ts`
- **Type:** unit
- **Asserts:** For each entry in `layerLabelMappings`, if any key is a lat/lon key, all lat/lon keys must have a higher index than all non-lat/lon keys in `Object.keys(mapping)`.
- **Why it catches the bug:** The 6 mid-list label mappings currently fail this assertion.

### Test 2 — `lat/lon keys are adjacent within each label mapping`
- **File:** `tests/label-mappings.test.ts`
- **Type:** unit
- **Asserts:** For each label mapping with exactly 2 lat/lon keys, `|index(lat) - index(lon)| === 1`.
- **Why it catches the bug:** Prevents future regressions where lat/lon are at the end but with other fields inserted between them.

> No Playwright E2E test: popup rendering uses `mapboxgl.Popup` which sets raw HTML on a Mapbox canvas — it is not accessible via DOM locators in headless Playwright and there is no existing popup E2E test pattern in this repo. Manual QA checklist below covers visual verification.

---

## Implementation Order

1. Write failing tests in `tests/label-mappings.test.ts`
2. Fix `src/lib/labelMappings.js` (move 6 mid-list lat/lon entries to end)
3. Fix `src/components/Map.js` (iterate label mapping keys in else-branch)
4. Run full verification gate: `npm run lint && npm run typecheck && npm run test && npm run build`

---

## AGENTS.md Impact

No update required — the fix adjusts popup field ordering logic within the existing `createPopupForFeature` convention documented in §14 and §18. No new env vars, file paths, or schema changes.

---

## Risks & Edge Cases

- **`labels` is empty `{}`:** Handled — the `labelKeys.length > 0` guard falls through to property iteration, preserving existing behavior for any unmapped layers.
- **Feature property key not in label mapping:** Silently skipped (consistent with intent — label mapping defines exactly what to show). No regression risk since all layers have exhaustive label mappings.
- **JavaScript object key order:** ES2015+ guarantees insertion order for string (non-integer) keys. All label mapping keys are non-integer strings. This is reliable.
- **`tomato-processors` special case:** Unchanged — that branch runs before the else-branch so it is unaffected.

---

## Verification

```bash
npm run test           # new label-mapping order tests must go red → green
npm run lint
npm run typecheck
npm run build
```

Manual QA: open staging app → click a CARB Food Processor point → confirm Latitude and Longitude appear last and adjacent. Repeat for a Wastewater Treatment Plant and a Landfill to confirm other affected layers are also fixed.
