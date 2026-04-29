const PRODUCTION_API_BASE_URL = 'https://api.calbioscape.org';

function normalizeApiBaseUrl(value: string | undefined): string {
  return value?.replace(/\/+$/, '') ?? '';
}

export function isCountyFeedstockPanelEnabled(
  apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL
): boolean {
  return normalizeApiBaseUrl(apiBaseUrl) !== PRODUCTION_API_BASE_URL;
}

export const COUNTY_FEEDSTOCK_PANEL_ENABLED = isCountyFeedstockPanelEnabled();
