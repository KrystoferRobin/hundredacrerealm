import { NextRequest, NextResponse } from 'next/server';
import { requireRealmApiKey } from '@/lib/realm-api-request';
import { extractBundleToSession, getSessionDir } from '@/lib/realm-bundle';
import { bumpRevision, findBySessionId, saveRegistry, loadRegistry } from '@/lib/session-registry';
import { rebuildMasterStats } from '@/lib/rebuild-master-stats';
import { runSessionPipeline, sessionIsDisplayReady } from '@/lib/session-pipeline';
import fs from 'fs';
import path from 'path';

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

    const { manifest } = extractBundleToSession(buffer, sessionId);
    const sessionDir = getSessionDir(sessionId);

    if (manifest.realmKey && manifest.realmKey !== entry.realmKey) {
      return NextResponse.json(
        { error: 'Bundle realmKey does not match allocated session' },
        { status: 409 }
      );
    }

    // Client should ship a complete bundle; if log/save sources are present, finish pipeline on server.
    const hasRslog = fs.readdirSync(sessionDir).some((f) => f.endsWith('.rslog'));
    const hasRsgame = fs.readdirSync(sessionDir).some((f) => f.endsWith('.rsgame'));

    let pipelineRan = false;
    if (!sessionIsDisplayReady(sessionDir) && (hasRslog || hasRsgame || fs.existsSync(path.join(sessionDir, 'extracted_game.xml')))) {
      console.log(`Running session pipeline for ${sessionId}…`);
      runSessionPipeline(sessionDir);
      pipelineRan = true;
    } else if (!sessionIsDisplayReady(sessionDir)) {
      return NextResponse.json(
        {
          error:
            'Bundle is not display-ready (missing parsed_session.json). Include .rslog in export or run full client pipeline.',
        },
        { status: 422 }
      );
    }

    // Refresh registry title from parsed session when available
    const parsedPath = path.join(sessionDir, 'parsed_session.json');
    if (fs.existsSync(parsedPath)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(parsedPath, 'utf8'));
        const registry = loadRegistry();
        const row = registry.find((r) => r.sessionId === sessionId);
        if (row && parsed.sessionTitle) {
          row.gameTitle = parsed.sessionTitle;
          saveRegistry(registry);
        }
      } catch {
        /* ignore */
      }
    }

    const updated = bumpRevision(sessionId);

    if (sessionIsDisplayReady(sessionDir) && !pipelineRan) {
      try {
        rebuildMasterStats();
      } catch (statsErr) {
        console.warn(`Hall of Fame stats rebuild failed for ${sessionId}:`, statsErr);
      }
    }

    return NextResponse.json({
      success: true,
      sessionId,
      sessionDir,
      revision: updated?.revision ?? entry.revision,
      profile: manifest.profile ?? 'public',
      displayReady: sessionIsDisplayReady(sessionDir),
      message: 'Bundle imported and ready for display',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Import failed';
    console.error('bundle upload error:', err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
