import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAuthUser } from '@/lib/admin-auth';

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('admin_token');

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await getAuthUser();

    if (!decoded) {
      cookieStore.delete('admin_token');
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    return NextResponse.json({
      username: decoded.username,
      isAdmin: decoded.isAdmin,
    });
  } catch (error) {
    console.error('Auth status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
