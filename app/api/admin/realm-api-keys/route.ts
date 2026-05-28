import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/admin-auth';
import { createApiKey, loadApiKeys } from '@/lib/realm-api-keys';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getAuthUser();
  if (!user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const keys = loadApiKeys().map((k) => ({
    id: k.id,
    label: k.label,
    prefix: k.prefix,
    createdAt: k.createdAt,
    createdBy: k.createdBy,
    enabled: k.enabled,
  }));

  return NextResponse.json({ keys });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const label = typeof body.label === 'string' && body.label.trim() ? body.label.trim() : 'export-tool';

    const { record, plainKey } = createApiKey(label, user.username);

    return NextResponse.json({
      success: true,
      key: plainKey,
      record: {
        id: record.id,
        label: record.label,
        prefix: record.prefix,
        createdAt: record.createdAt,
      },
      message: 'Copy this key now — it will not be shown again.',
    });
  } catch (err) {
    console.error('create api key error:', err);
    return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 });
  }
}
