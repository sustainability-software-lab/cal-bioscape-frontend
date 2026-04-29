import { NextResponse } from 'next/server';
import { getServiceToken } from '@/lib/service-token';

// GET /api/auth/token — diagnostic credential health check.
// Never return the backend credential; auth for API calls is handled by /api/proxy.
export async function GET() {
  const token = await getServiceToken();
  if (!token) {
    return NextResponse.json({ error: 'Failed to obtain service token' }, { status: 503 });
  }
  return NextResponse.json({ hasToken: true });
}
