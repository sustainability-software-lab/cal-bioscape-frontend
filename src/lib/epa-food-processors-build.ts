import { parse } from 'csv-parse/sync';

// Columns carried onto each GeoJSON feature, in popup display order. Property
// names are clean snake_case (unlike the legacy EPA tileset, whose truncated
// `NAICS_Code`/`NAICS_Co_1` columns held swapped values). latitude/longitude are
// last so the popup renders them after the descriptive fields.
export const CURATED_COLUMNS = [
  'name',
  'address',
  'city',
  'county',
  'zip',
  'state',
  'naics_code',
  'naics_description',
  'phone',
  'website',
  'excess_food_low',
  'excess_food_high',
  'data_source',
  'latitude',
  'longitude',
] as const;

// Generous California bounding box. Mirrors the geocoder guard so the build is a
// second, independent gate: any feature outside this box is dropped, guaranteeing
// zero out-of-state features even if a bad coordinate slips into the CSV.
export const CA_BBOX = { minLon: -124.55, maxLon: -114.0, minLat: 32.4, maxLat: 42.1 };

export interface EpaFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: Record<string, string | number>;
}

// Round noisy float columns for clean popups: excess-food estimates to 1 decimal
// (tons/year), latitude/longitude to 6 decimals. Everything else passes through.
function formatColumn(col: string, value: string): string {
  if (col === 'excess_food_low' || col === 'excess_food_high') {
    const n = Number(value);
    return Number.isFinite(n) ? String(Math.round(n * 10) / 10) : value;
  }
  if (col === 'latitude' || col === 'longitude') {
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(6) : value;
  }
  return value;
}

export function buildEpaFeatures(csvText: string): EpaFeature[] {
  const rows = parse(csvText, { columns: true, skip_empty_lines: true }) as Record<string, string>[];
  const features: EpaFeature[] = [];

  for (const row of rows) {
    const latStr = row['latitude']?.trim() ?? '';
    const lonStr = row['longitude']?.trim() ?? '';
    const lat = Number(latStr);
    const lon = Number(lonStr);

    if (!latStr || !lonStr || isNaN(lat) || isNaN(lon)) {
      continue;
    }

    // Skip facilities where geocoding failed.
    const geocodeStatus = row['geocode_status']?.trim() ?? '';
    if (geocodeStatus && geocodeStatus !== 'success') {
      continue;
    }

    // California bounding-box guard: drop anything outside CA.
    if (
      lon < CA_BBOX.minLon || lon > CA_BBOX.maxLon ||
      lat < CA_BBOX.minLat || lat > CA_BBOX.maxLat
    ) {
      continue;
    }

    const properties: Record<string, string | number> = {};
    for (const col of CURATED_COLUMNS) {
      const val = row[col as string];
      if (val !== undefined && val.trim() !== '') {
        properties[col as string] = formatColumn(col, val.trim());
      }
    }

    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lon, lat] },
      properties,
    });
  }

  return features;
}
