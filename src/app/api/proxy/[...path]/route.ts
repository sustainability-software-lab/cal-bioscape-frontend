import { NextRequest, NextResponse } from 'next/server';
import { getServiceToken, invalidateServiceToken, isApiKeyAuth } from '@/lib/service-token';

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  'https://api.calbioscape.org';

// Maximum 503 retry attempts (cold-start on Cloud Run).
const MAX_503_RETRIES = 2;
const RETRY_DELAY_MS = 300;

async function proxyRequest(
  req: NextRequest,
  path: string[],
  isRetry = false,
  retries503 = MAX_503_RETRIES
): Promise<NextResponse> {
  const token = await getServiceToken();
  const search = req.nextUrl.search;
  const url = `${BASE_URL}/${path.join('/')}${search}`;
  const headers: HeadersInit = token
    ? isApiKeyAuth()
      ? { 'X-API-Key': token }
      : { Authorization: `Bearer ${token}` }
    : {};

  const res = await fetch(url, { cache: 'no-store', headers });

  // Only retry on 401 in JWT mode — expired tokens can be refreshed.
  // A revoked API key will never recover with the same credential.
  if (res.status === 401 && !isRetry && !isApiKeyAuth()) {
    invalidateServiceToken();
    return proxyRequest(req, path, true, retries503);
  }

  // Retry 503 (service unavailable / cold-start) with exponential backoff.
  if (res.status === 503 && retries503 > 0) {
    const delay = RETRY_DELAY_MS * (MAX_503_RETRIES - retries503 + 1);
    await new Promise(resolve => setTimeout(resolve, delay));
    return proxyRequest(req, path, isRetry, retries503 - 1);
  }

  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const response = NextResponse.json(await res.json(), { status: res.status });
    if (res.status >= 200 && res.status < 300) {
      response.headers.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    }
    return response;
  }
  return new NextResponse(res.body, { status: res.status });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(req, path);
}
