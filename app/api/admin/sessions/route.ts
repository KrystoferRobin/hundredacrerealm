import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getAuthUser } from '@/lib/admin-auth';

const SESSIONS_DIR = path.join(process.cwd(), 'public', 'parsed_sessions');

interface SessionInfo {
  sessionId: string;
  name: string;
  date: string;
  players: number;
  lastModified: string;
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  
  if (!user || !user.isAdmin) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    if (!fs.existsSync(SESSIONS_DIR)) {
      return NextResponse.json({ sessions: [] });
    }

    const items = fs.readdirSync(SESSIONS_DIR, { withFileTypes: true });
    const sessionFolders = items
      .filter(item => item.isDirectory())
      .map(item => item.name);

    const sessions: SessionInfo[] = [];
    
    for (const folder of sessionFolders) {
      const sessionPath = path.join(SESSIONS_DIR, folder, 'parsed_session.json');
      
      if (fs.existsSync(sessionPath)) {
        try {
          const sessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
          const stats = fs.statSync(sessionPath);
          
          sessions.push({
            sessionId: folder,
            name: sessionData.sessionName || sessionData.session_name || folder,
            date: sessionData.sessionDate || sessionData.session_date || folder,
            players: Object.keys(sessionData.players || {}).length,
            lastModified: stats.mtime.toISOString()
          });
        } catch (error) {
          console.error(`Error reading session ${folder}:`, error);
          // Skip broken sessions
        }
      }
    }

    // Sort by last modified date (newest first)
    sessions.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());

    return NextResponse.json({ sessions });

  } catch (error) {
    console.error('Error reading sessions:', error);
    return NextResponse.json(
      { error: 'Failed to load sessions' },
      { status: 500 }
    );
  }
} 