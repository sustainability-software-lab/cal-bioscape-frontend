import { NextRequest, NextResponse } from 'next/server';
import { getServiceToken, invalidateServiceToken } from '@/lib/service-token';

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  'https://api-staging.calbioscape.org';

async function proxyRequest(
  req: NextRequest,
  path: string[],
  isRetry = false
): Promise<NextResponse> {
  const token = await getServiceToken();
  const search = req.nextUrl.search;
  const url = `${BASE_URL}/${path.join('/')}${search}`;
  const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

  const res = await fetch(url, { cache: 'no-store', headers });

  if (res.status === 401 && !isRetry) {
    invalidateServiceToken();
    return proxyRequest(req, path, true);
  }

  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return NextResponse.json(await res.json(), { status: res.status });
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
