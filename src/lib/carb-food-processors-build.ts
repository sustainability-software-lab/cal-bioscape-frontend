import { parse } from 'csv-parse/sync';

export const CURATED_COLUMNS = [
  'name',
  'address',
  'city',
  'county',
  'zip',
  'state',
  'primary_ag_product',
  'process_type',
  'byproducts',
  'quantities',
  'air_district',
  'general_source_info',
  'CARB_facility_id',
  'latitude',
  'longitude',
] as const;

export interface CarbFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: Record<string, string | number>;
}

export function buildCarbFeatures(csvText: string): CarbFeature[] {
  const rows = parse(csvText, { columns: true, skip_empty_lines: true }) as Record<string, string>[];
  const features: CarbFeature[] = [];

  for (const row of rows) {
    const latStr = row['latitude']?.trim() ?? '';
    const lonStr = row['longitude']?.trim() ?? '';
    const lat = Number(latStr);
    const lon = Number(lonStr);

    if (!latStr || !lonStr || isNaN(lat) || isNaN(lon)) {
      continue;
    }

    const properties: Record<string, string | number> = {};
    for (const col of CURATED_COLUMNS) {
      const val = row[col as string];
      if (val !== undefined && val.trim() !== '') {
        properties[col as string] = val.trim();
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
