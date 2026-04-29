/**
 * Server-side service account credential management.
 *
 * Prefers API key auth (`CA_BIOSITE_API_KEY`) when configured.
 * Falls back to JWT auth (`CA_BIOSITE_API_USER` / `CA_BIOSITE_API_PASSWORD`)
 * for environments not yet migrated to per-client keys (e.g. production).
 *
 * Must only be imported in server-side code (API routes, Server Components).
 */

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  'https://api.calbioscape.org';

interface TokenCache {
  token: string;
  expiresAt: number;
}

let _cache: TokenCache | null = null;
let _flight: Promise<string> | null = null;

/** Returns true when the environment is configured for API key auth. */
export function isApiKeyAuth(): boolean {
  return !!process.env.CA_BIOSITE_API_KEY;
}

/**
 * Returns the credential value to attach to outgoing backend requests.
 *
 * - API key mode: returns the raw key immediately (no network call).
 * - JWT mode: fetches and caches a JWT using the service account credentials.
 */
export async function getServiceToken(): Promise<string> {
  const apiKey = process.env.CA_BIOSITE_API_KEY;
  if (apiKey) return apiKey;

  if (_cache && Date.now() < _cache.expiresAt) return _cache.token;

  if (!_flight) {
    _flight = (async () => {
      const username = process.env.CA_BIOSITE_API_USER;
      const password = process.env.CA_BIOSITE_API_PASSWORD;

      if (!username || !password) {
        console.warn('[service-token] Neither CA_BIOSITE_API_KEY nor CA_BIOSITE_API_USER/PASSWORD are set');
        return '';
      }

      const body = new URLSearchParams({ username, password, grant_type: 'password' });
      const res = await fetch(`${BASE_URL}/v1/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
        cache: 'no-store',
      });

      if (!res.ok) {
        console.warn(`[service-token] Token exchange failed: ${res.status} ${res.statusText}`);
        return '';
      }

      const data = await res.json();
      const token: string = data.access_token ?? '';
      const ttlMs =
        typeof data.expires_in === 'number'
          ? (data.expires_in - 60) * 1000
          : 55 * 60 * 1000;
      if (token) _cache = { token, expiresAt: Date.now() + ttlMs };
      return token;
    })()
      .catch((err) => {
        console.warn('[service-token] Network error:', err);
        return '';
      })
      .finally(() => {
        _flight = null;
      });
  }

  return _flight;
}

/** Clear the cached JWT (e.g. after a 401 response). No-op in API key mode. */
export function invalidateServiceToken(): void {
  _cache = null;
}
