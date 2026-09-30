/**
 * Centralized typed API client for the CA Biositing backend.
 * All functions return `null` on any error (404, network failure, etc.)
 * so callers can fall back to static data cleanly.
 */

import {
  CensusDataResponse,
  CensusListResponse,
  SurveyDataResponse,
  SurveyListResponse,
  AnalysisListResponse,
  AnalysisDataResponse,
  AvailabilityResponse,
  UserResearchSubmission,
  UserResearchListResponse,
  UserResearchSuccessResponse,
} from './api-types';

export interface ApiFetchOptions {
  throwOnAuthError?: boolean;
}

export class ApiAuthError extends Error {
  status: number;
  path: string;

  constructor(status: number, path: string) {
    super(`API authentication failed (${status})`);
    this.name = 'ApiAuthError';
    this.status = status;
    this.path = path;
  }
}

// ---------------------------------------------------------------------------
// Internal fetch helper — routes through /api/proxy so auth and CORS
// are handled server-side; no credentials reach the browser.
// ---------------------------------------------------------------------------

async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T | null> {
  try {
    const url = `/api/proxy${path}`;
    const res = await fetch(url, { cache: 'default' });

    if (!res.ok) {
      if (options.throwOnAuthError && (res.status === 401 || res.status === 403)) {
        throw new ApiAuthError(res.status, path);
      }

      // 404 = "not found" is expected for sparse data; log quietly
      if (res.status !== 404) {
        console.warn(`[api] ${res.status} ${res.statusText} — ${path}`);
      }
      return null;
    }

    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof ApiAuthError) {
      throw err;
    }

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
  geoid: string,
  options?: ApiFetchOptions
): Promise<CensusListResponse | null> {
  return apiFetch<CensusListResponse>(
    `/v1/feedstocks/usda/census/resources/${encodeURIComponent(resource)}/geoid/${encodeURIComponent(geoid)}/parameters`,
    options
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
): Promise<SurveyListResponse | null> {
  return apiFetch<SurveyListResponse>(
    `/v1/feedstocks/usda/survey/crops/${encodeURIComponent(crop)}/geoid/${encodeURIComponent(geoid)}/parameters`
  );
}

/** Get a single survey parameter by USDA crop name */
export async function getSurveyByCropParam(
  crop: string,
  geoid: string,
  parameter: string
): Promise<SurveyDataResponse | null> {
  return apiFetch<SurveyDataResponse>(
    `/v1/feedstocks/usda/survey/crops/${encodeURIComponent(crop)}/geoid/${encodeURIComponent(geoid)}/parameters/${encodeURIComponent(parameter)}`
  );
}

/** List all survey parameters for an internal resource name + geography */
export async function getSurveyByResource(
  resource: string,
  geoid: string,
  options?: ApiFetchOptions
): Promise<SurveyListResponse | null> {
  return apiFetch<SurveyListResponse>(
    `/v1/feedstocks/usda/survey/resources/${encodeURIComponent(resource)}/geoid/${encodeURIComponent(geoid)}/parameters`,
    options
  );
}

/** Get a single survey parameter by internal resource name */
export async function getSurveyByResourceParam(
  resource: string,
  geoid: string,
  parameter: string
): Promise<SurveyDataResponse | null> {
  return apiFetch<SurveyDataResponse>(
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

// First-party feedback stays on the frontend server, separate from the data proxy.
// Never log payloads: they may contain contact information or private feedback.
export class UserResearchConflictError extends Error {
  constructor() {
    super('An earlier response was already saved for this submission.');
    this.name = 'UserResearchConflictError';
  }
}

async function researchRequest<T>(path: string, init?: RequestInit, requireSession = false): Promise<T | null> {
  try {
    const response = await fetch(path, {
      ...init,
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
    if (requireSession && response.status === 401) throw new ApiAuthError(401, path);
    if (path === '/api/user-research' && response.status === 409) throw new UserResearchConflictError();
    if (!response.ok) return null;
    return await response.json() as T;
  } catch (error) {
    if (error instanceof ApiAuthError || error instanceof UserResearchConflictError) throw error;
    return null;
  }
}

export function submitUserResearch(submission: UserResearchSubmission): Promise<UserResearchSuccessResponse | null> {
  return researchRequest('/api/user-research', { method: 'POST', body: JSON.stringify(submission) });
}

export function signInResearchAdmin(username: string, password: string): Promise<UserResearchSuccessResponse | null> {
  return researchRequest('/api/admin/login', { method: 'POST', body: JSON.stringify({ username, password }) });
}

export function signOutResearchAdmin(): Promise<UserResearchSuccessResponse | null> {
  return researchRequest('/api/admin/logout', { method: 'POST', body: '{}' }, true);
}

export function getUserResearch(cursor: string | null = null): Promise<UserResearchListResponse | null> {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  return researchRequest(`/api/admin/user-research${query}`, undefined, true);
}

export async function exportUserResearch(cursor: string | null = null): Promise<Blob | null> {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  const path = `/api/admin/user-research/export${query}`;
  try {
    const response = await fetch(path, { cache: 'no-store', credentials: 'same-origin' });
    if (response.status === 401) throw new ApiAuthError(401, path);
    return response.ok ? await response.blob() : null;
  } catch (error) {
    if (error instanceof ApiAuthError) throw error;
    return null;
  }
}
