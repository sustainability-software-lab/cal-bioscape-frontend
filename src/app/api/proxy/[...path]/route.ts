import { NextRequest, NextResponse } from 'next/server';
import { getServiceToken, invalidateServiceToken, isApiKeyAuth } from '@/lib/service-token';

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  'https://api.calbioscape.org';

async function proxyRequest(
  req: NextRequest,
  path: string[],
  isRetry = false
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
    return proxyRequest(req, path, true);
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
