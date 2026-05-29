import { NextRequest, NextResponse } from 'next/server';
import { lookupSessionTitle } from '@/lib/session-title-lookup';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = decodeURIComponent(params.id);
    const title = lookupSessionTitle(sessionId);

    if (!title) {
      return NextResponse.json({ error: 'Session title not found' }, { status: 404 });
    }

    return NextResponse.json(title);
  } catch (error) {
    console.error('Error fetching session titles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
