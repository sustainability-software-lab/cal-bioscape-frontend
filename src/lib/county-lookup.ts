/**
 * Mapping from California county name (as it appears in the Mapbox tileset feature
 * properties) to its 5-digit FIPS GEOID (state FIPS "06" + 3-digit county code).
 *
 * Source: US Census Bureau FIPS codes for California counties.
 * These GEOIDs are used as the `geoid` parameter in all backend API calls.
 */

const COUNTY_GEOID: Record<string, string> = {
  Alameda: '06001',
  Alpine: '06003',
  Amador: '06005',
  Butte: '06007',
  Calaveras: '06009',
  Colusa: '06011',
  'Contra Costa': '06013',
  'Del Norte': '06015',
  'El Dorado': '06017',
  Fresno: '06019',
  Glenn: '06021',
  Humboldt: '06023',
  Imperial: '06025',
  Inyo: '06027',
  Kern: '06029',
  Kings: '06031',
  Lake: '06033',
  Lassen: '06035',
  'Los Angeles': '06037',
  Madera: '06039',
  Marin: '06041',
  Mariposa: '06043',
  Mendocino: '06045',
  Merced: '06047',
  Modoc: '06049',
  Mono: '06051',
  Monterey: '06053',
  Napa: '06055',
  Nevada: '06057',
  Orange: '06059',
  Placer: '06061',
  Plumas: '06063',
  Riverside: '06065',
  Sacramento: '06067',
  'San Benito': '06069',
  'San Bernardino': '06071',
  'San Diego': '06073',
  'San Francisco': '06075',
  'San Joaquin': '06077',
  'San Luis Obispo': '06079',
  'San Mateo': '06081',
  'Santa Barbara': '06083',
  'Santa Clara': '06085',
  'Santa Cruz': '06087',
  Shasta: '06089',
  Sierra: '06091',
  Siskiyou: '06093',
  Solano: '06095',
  Sonoma: '06097',
  Stanislaus: '06099',
  Sutter: '06101',
  Tehama: '06103',
  Trinity: '06105',
  Tulare: '06107',
  Tuolumne: '06109',
  Ventura: '06111',
  Yolo: '06113',
  Yuba: '06115',
};

/**
 * Return the 5-digit FIPS GEOID for a California county name,
 * or `null` if the name is not recognised.
 *
 * Lookup is case-insensitive and trims leading/trailing whitespace.
 */
export function getCountyGeoid(countyName: string): string | null {
  if (!countyName) return null;

  const normalised = countyName.trim();

  // Exact match first (most common path)
  if (COUNTY_GEOID[normalised]) return COUNTY_GEOID[normalised];

  // Case-insensitive fallback
  const lower = normalised.toLowerCase();
  for (const [key, value] of Object.entries(COUNTY_GEOID)) {
    if (key.toLowerCase() === lower) return value;
  }

  return null;
}

/** Return the full county → GEOID map (read-only). */
export function getAllCountyGeoids(): Readonly<Record<string, string>> {
  return COUNTY_GEOID;
}