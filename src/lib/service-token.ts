/**
 * Server-side service account token management.
 * Fetches and caches a JWT for the CA Biositing API using
 * credentials stored in server-only environment variables.
 *
 * Must only be imported in server-side code (API routes, Server Components).
 */

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  'https://api-staging.calbioscape.org';

interface TokenCache {
  token: string;
  expiresAt: number;
}

let _cache: TokenCache | null = null;
let _flight: Promise<string> | null = null;

export async function getServiceToken(): Promise<string> {
  if (_cache && Date.now() < _cache.expiresAt) return _cache.token;

  if (!_flight) {
    _flight = (async () => {
      const username = process.env.CA_BIOSITE_API_USER;
      const password = process.env.CA_BIOSITE_API_PASSWORD;

      if (!username || !password) {
        console.warn('[service-token] CA_BIOSITE_API_USER or CA_BIOSITE_API_PASSWORD not set');
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

/** Clear the cached token (e.g. after a 401 response). */
export function invalidateServiceToken(): void {
  _cache = null;
}
