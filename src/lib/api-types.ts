/**
 * TypeScript interfaces matching the CA Biositing backend API response schemas.
 * API Base URL: https://biocirv-webservice-194468397458.us-west1.run.app
 */

// Single data item inside AnalysisListResponse.data
export interface DataItemResponse {
  parameter: string;
  value: number;
  unit: string;
}

// Response from GET /v1/feedstocks/usda/census/crops/{crop}/geoid/{geoid}/parameters
// or /v1/feedstocks/usda/census/resources/{resource}/geoid/{geoid}/parameters
// (list form – the API actually returns an array of these)
export interface CensusDataResponse {
  usda_crop?: string;  // present when queried by crop name
  resource?: string;   // present when queried by resource name
  geoid: string;
  parameter: string;
  value: number;
  unit: string;
  dimension?: string;
  dimension_value?: number;
  dimension_unit?: string;
}

// Convenience alias – the "list" endpoints return CensusDataResponse[]
export type CensusListResponse = CensusDataResponse[];

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
  value: number;
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