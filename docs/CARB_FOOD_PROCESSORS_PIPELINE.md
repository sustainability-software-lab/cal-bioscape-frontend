# CARB Food Processors Pipeline

Pipeline for converting the CARB food processors CSV into a Mapbox tileset and rendering it in Cal BioScape.

## Canonical identifiers

| Item | Value |
|---|---|
| Tileset ID | `sustainasoft.carb-food-processors-2026-06` |
| Source layer | `carb_food_processors` |
| Source CSV | `src/data/food_manufacturers_and_processor_facilities_carb.csv` |
| App visibility key | `carbFoodProcessors` |
| Map source ID | `carb-food-processors-source` |
| Map layer ID | `carb-food-processors-layer` |

## Commands

### Step 1: Build GeoJSON-LD

```bash
npm run build-carb-data
```

Reads `src/data/food_manufacturers_and_processor_facilities_carb.csv`, drops the 224 rows without valid coordinates, and writes newline-delimited GeoJSON to `src/data/carb-food-processor-facilities.geojson.ld` (~5823 features). The `.geojson.ld` file is gitignored; re-run this command any time you need to regenerate it.

### Step 2: Upload tileset to sustainasoft Mapbox account

```bash
MAPBOX_SECRET_TOKEN=sk.ey... npm run upload-carb-tileset
```

Requires a sustainasoft `sk.*` token with `tilesets:write` and `tilesets:read` scopes. The script:
1. Uploads the GeoJSON-LD as a tileset source named `carb_food_processors`
2. Creates/updates the tileset recipe
3. Publishes the tileset
4. Polls until the publish job completes

This is a gated manual infra step requiring the sustainasoft secret token. It is not run by CI.

## Data refresh

When the source CSV is updated:
1. Overwrite `src/data/food_manufacturers_and_processor_facilities_carb.csv`
2. Run `npm run build-carb-data`
3. Run `npm run upload-carb-tileset` with the sustainasoft token
4. The tileset ID and source layer name stay the same; no app code changes needed.

## Environment variable

`MAPBOX_SECRET_TOKEN` -- sustainasoft `sk.*` Mapbox token with `tilesets:write` and `tilesets:read` scopes. Server/CLI-only; never expose as `NEXT_PUBLIC_`.

Stored in GCP Secret Manager: `mapbox-secret-token` (project `biocirv-470318`).

To fetch it locally:
```bash
export MAPBOX_SECRET_TOKEN=$(gcloud secrets versions access latest --secret=mapbox-secret-token --project=biocirv-470318)
```
