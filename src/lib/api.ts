/**
 * Centralized typed API client for the CA Biositing backend.
 * All functions return `null` on any error (404, network failure, etc.)
 * so callers can fall back to static data cleanly.
 */

import {
  CensusDataResponse,
  CensusListResponse,
  AnalysisListResponse,
  AnalysisDataResponse,
  AvailabilityResponse,
} from './api-types';

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  'https://biocirv-webservice-194468397458.us-west1.run.app';

// ---------------------------------------------------------------------------
// Internal fetch helper
// ---------------------------------------------------------------------------

async function apiFetch<T>(path: string): Promise<T | null> {
  try {
    const url = `${BASE_URL}${path}`;
    const res = await fetch(url, {
      // next.js cache: no-store so we always get fresh data
      cache: 'no-store',
    });

    if (!res.ok) {
      // 404 = "not found" is expected for sparse data; log quietly
      if (res.status !== 404) {
        console.warn(`[api] ${res.status} ${res.statusText} — ${url}`);
      }
      return null;
    }

    return (await res.json()) as T;
  } catch (err) {
    console.warn('[api] fetch error:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// USDA Census endpoints
// ---------------------------------------------------------------------------

/** List all census parameters for a USDA crop name + geography */
export async function getCensusByCrop(
  crop: string,
  geoid: string
): Promise<CensusListResponse | null> {
  return apiFetch<CensusListResponse>(
    `/v1/feedstocks/usda/census/crops/${encodeURIComponent(crop)}/geoid/${encodeURIComponent(geoid)}/parameters`
  );
}

/** Get a single census parameter by USDA crop name */
export async function getCensusByCropParam(
  crop: string,
  geoid: string,
  parameter: string
): Promise<CensusDataResponse | null> {
  return apiFetch<CensusDataResponse>(
    `/v1/feedstocks/usda/census/crops/${encodeURIComponent(crop)}/geoid/${encodeURIComponent(geoid)}/parameters/${encodeURIComponent(parameter)}`
  );
}

/** List all census parameters for an internal resource name + geography */
export async function getCensusByResource(
  resource: string,
  geoid: string
): Promise<CensusListResponse | null> {
  return apiFetch<CensusListResponse>(
    `/v1/feedstocks/usda/census/resources/${encodeURIComponent(resource)}/geoid/${encodeURIComponent(geoid)}/parameters`
  );
}

/** Get a single census parameter by internal resource name */
export async function getCensusByResourceParam(
  resource: string,
  geoid: string,
  parameter: string
): Promise<CensusDataResponse | null> {
  return apiFetch<CensusDataResponse>(
    `/v1/feedstocks/usda/census/resources/${encodeURIComponent(resource)}/geoid/${encodeURIComponent(geoid)}/parameters/${encodeURIComponent(parameter)}`
  );
}

// ---------------------------------------------------------------------------
// USDA Survey endpoints (same shape, different path prefix)
// ---------------------------------------------------------------------------

/** List all survey parameters for a USDA crop name + geography */
export async function getSurveyByCrop(
  crop: string,
  geoid: string
): Promise<CensusListResponse | null> {
  return apiFetch<CensusListResponse>(
    `/v1/feedstocks/usda/survey/crops/${encodeURIComponent(crop)}/geoid/${encodeURIComponent(geoid)}/parameters`
  );
}

/** Get a single survey parameter by USDA crop name */
export async function getSurveyByCropParam(
  crop: string,
  geoid: string,
  parameter: string
): Promise<CensusDataResponse | null> {
  return apiFetch<CensusDataResponse>(
    `/v1/feedstocks/usda/survey/crops/${encodeURIComponent(crop)}/geoid/${encodeURIComponent(geoid)}/parameters/${encodeURIComponent(parameter)}`
  );
}

/** List all survey parameters for an internal resource name + geography */
export async function getSurveyByResource(
  resource: string,
  geoid: string
): Promise<CensusListResponse | null> {
  return apiFetch<CensusListResponse>(
    `/v1/feedstocks/usda/survey/resources/${encodeURIComponent(resource)}/geoid/${encodeURIComponent(geoid)}/parameters`
  );
}

/** Get a single survey parameter by internal resource name */
export async function getSurveyByResourceParam(
  resource: string,
  geoid: string,
  parameter: string
): Promise<CensusDataResponse | null> {
  return apiFetch<CensusDataResponse>(
    `/v1/feedstocks/usda/survey/resources/${encodeURIComponent(resource)}/geoid/${encodeURIComponent(geoid)}/parameters/${encodeURIComponent(parameter)}`
  );
}

// ---------------------------------------------------------------------------
// Analysis endpoints
// ---------------------------------------------------------------------------

/** List all analysis parameters for a resource + geography */
export async function getAnalysisByResource(
  resource: string,
  geoid: string
): Promise<AnalysisListResponse | null> {
  return apiFetch<AnalysisListResponse>(
    `/v1/feedstocks/analysis/resources/${encodeURIComponent(resource)}/geoid/${encodeURIComponent(geoid)}/parameters`
  );
}

/** Get a single analysis parameter for a resource + geography */
export async function getAnalysisByResourceParam(
  resource: string,
  geoid: string,
  parameter: string
): Promise<AnalysisDataResponse | null> {
  return apiFetch<AnalysisDataResponse>(
    `/v1/feedstocks/analysis/resources/${encodeURIComponent(resource)}/geoid/${encodeURIComponent(geoid)}/parameters/${encodeURIComponent(parameter)}`
  );
}

// ---------------------------------------------------------------------------
// Availability endpoint
// ---------------------------------------------------------------------------

/** Get the seasonal availability window for a resource + geography */
export async function getAvailability(
  resource: string,
  geoid: string
): Promise<AvailabilityResponse | null> {
  return apiFetch<AvailabilityResponse>(
    `/v1/feedstocks/availability/resources/${encodeURIComponent(resource)}/geoid/${encodeURIComponent(geoid)}`
  );
}