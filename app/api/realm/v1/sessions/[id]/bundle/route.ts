import { NextRequest, NextResponse } from 'next/server';
import { requireRealmApiKey } from '@/lib/realm-api-request';
import { extractBundleToSession } from '@/lib/realm-bundle';
import { bumpRevision, findBySessionId } from '@/lib/session-registry';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = requireRealmApiKey(request);
  if (error) return error;

  const sessionId = params.id;
  const entry = findBySessionId(sessionId);
  if (!entry) {
    return NextResponse.json({ error: 'Unknown sessionId' }, { status: 404 });
  }

  try {
    const buffer = Buffer.from(await request.arrayBuffer());
    if (buffer.length === 0) {
      return NextResponse.json({ error: 'Empty bundle body' }, { status: 400 });
    }

    const contentType = request.headers.get('content-type') ?? '';
    if (!contentType.includes('zip') && !contentType.includes('octet-stream')) {
      return NextResponse.json(
        { error: 'Content-Type must be application/zip' },
        { status: 415 }
      );
    }

    const { manifest, sessionDir } = extractBundleToSession(buffer, sessionId);

    if (manifest.realmKey && manifest.realmKey !== entry.realmKey) {
      return NextResponse.json(
        { error: 'Bundle realmKey does not match allocated session' },
        { status: 409 }
      );
    }

    const updated = bumpRevision(sessionId);

    return NextResponse.json({
      success: true,
      sessionId,
      sessionDir,
      revision: updated?.revision ?? entry.revision,
      profile: manifest.profile ?? 'public',
      message: 'Bundle extracted for display',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Import failed';
    console.error('bundle upload error:', err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
