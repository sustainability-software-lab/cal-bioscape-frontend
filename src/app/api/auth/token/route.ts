import { NextResponse } from 'next/server';
import { getServiceToken } from '@/lib/service-token';

// GET /api/auth/token — returns the current service account JWT.
// Useful for diagnostics; auth for API calls is handled by /api/proxy.
export async function GET() {
  const token = await getServiceToken();
  if (!token) {
    return NextResponse.json({ error: 'Failed to obtain service token' }, { status: 503 });
  }
  return NextResponse.json({ access_token: token, token_type: 'bearer' });
}
