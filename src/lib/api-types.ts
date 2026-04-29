/**
 * TypeScript interfaces matching the CA Biositing backend API response schemas.
 * API Base URL: https://api.calbioscape.org
 */

// Single data item inside list response .data arrays
export interface DataItemResponse {
  parameter: string;
  value: number | null;
  unit: string;
  dimension?: string | null;
  dimension_value?: number | null;
  dimension_unit?: string | null;
}

// Response from GET /v1/feedstocks/usda/census/.../parameters/{parameter}
export interface CensusDataResponse {
  usda_crop?: string | null;  // present when queried by crop name
  resource?: string | null;   // present when queried by resource name
  geoid: string;
  parameter: string;
  value: number | null;
  unit: string;
  dimension?: string | null;
  dimension_value?: number | null;
  dimension_unit?: string | null;
}

// Response from GET /v1/feedstocks/usda/census/.../parameters
export interface CensusListResponse {
  usda_crop?: string | null;
  resource?: string | null;
  geoid: string;
  data: DataItemResponse[];
}

// Response from GET /v1/feedstocks/usda/survey/.../parameters/{parameter}
export interface SurveyDataResponse extends CensusDataResponse {
  survey_program_id?: number | null;
  survey_period?: string | null;
  reference_month?: string | null;
  seasonal_flag?: boolean | null;
}

// Response from GET /v1/feedstocks/usda/survey/.../parameters
export interface SurveyListResponse extends CensusListResponse {
  survey_program_id?: number | null;
  survey_period?: string | null;
  reference_month?: string | null;
  seasonal_flag?: boolean | null;
}

// Response from GET /v1/feedstocks/analysis/resources/{resource}/geoid/{geoid}/parameters
export interface AnalysisListResponse {
  resource: string;
  geoid: string;
  data: DataItemResponse[];
}

// Response from GET /v1/feedstocks/analysis/resources/{resource}/geoid/{geoid}/parameters/{parameter}
export interface AnalysisDataResponse {
  resource: string;
  geoid: string;
  parameter: string;
  value: number | null;
  unit: string;
}

// Response from GET /v1/feedstocks/availability/resources/{resource}/geoid/{geoid}
export interface AvailabilityResponse {
  resource: string;
  geoid: string;
  /** Integer 1–12 representing the start month of the harvest window */
  from_month: number;
  /** Integer 1–12 representing the end month of the harvest window */
  to_month: number;
}

// Error response shape returned by the API on 404 / validation errors
export interface ApiErrorResponse {
  detail: string;
}
