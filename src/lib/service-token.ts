/**
 * Server-side service account token management.
 * Fetches and caches a GCP identity token for the backend Cloud Run service.
 * Uses Application Default Credentials (automatic on Cloud Run via metadata server).
 *
 * Must only be imported in server-side code (API routes, Server Components).
 */
import { GoogleAuth } from 'google-auth-library';

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api-staging.calbioscape.org';

interface TokenCache {
  token: string;
  expiresAt: number;
}

let _cache: TokenCache | null = null;
let _flight: Promise<string> | null = null;

const _auth = new GoogleAuth();

export async function getServiceToken(): Promise<string> {
  if (_cache && Date.now() < _cache.expiresAt) return _cache.token;

  if (!_flight) {
    _flight = (async () => {
      const client = await _auth.getIdTokenClient(BASE_URL);
      const headers = await client.getRequestHeaders();
      const token = (headers['Authorization'] ?? '').replace('Bearer ', '');
      // GCP identity tokens expire in 1 hour; cache for 55 minutes
      if (token) _cache = { token, expiresAt: Date.now() + 55 * 60 * 1000 };
      return token;
    })()
      .catch((err) => {
        console.warn('[service-token] Failed to fetch GCP identity token:', err);
        return '';
      })
      .finally(() => {
        _flight = null;
      });
  }

  return _flight;
}

/** Clear the cached token (e.g. after a 401 response). */
export function invalidateServiceToken(): void {
  _cache = null;
}
