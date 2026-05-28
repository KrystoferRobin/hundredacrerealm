import { NextRequest, NextResponse } from 'next/server';
import { requireRealmApiKey } from '@/lib/realm-api-request';
import { findBySessionId } from '@/lib/session-registry';
import fs from 'fs';
import path from 'path';
import { getSessionDir } from '@/lib/realm-bundle';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = requireRealmApiKey(request);
  if (error) return error;

  const entry = findBySessionId(params.id);
  if (!entry) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const sessionDir = getSessionDir(params.id);
  const hasData = fs.existsSync(sessionDir);
  const files = hasData ? fs.readdirSync(sessionDir) : [];

  return NextResponse.json({
    ...entry,
    hasBundle: hasData && files.includes('manifest.json'),
    files,
  });
}
