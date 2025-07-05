import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Try both local and Docker paths
    const possiblePaths = [
      path.join(process.cwd(), 'public', 'parsed_sessions'),
      '/app/public/parsed_sessions'
    ];
    const sessionsDir = possiblePaths.find(p => fs.existsSync(p));
    
    if (!sessionsDir) {
      return NextResponse.json({ error: 'Sessions directory not found' }, { status: 404 });
    }
    
    const sessionPath = path.join(sessionsDir, params.id, 'parsed_session.json');
    
    if (!fs.existsSync(sessionPath)) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const sessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
    
    return NextResponse.json(sessionData);
  } catch (error) {
    console.error('Error reading session data:', error);
    return NextResponse.json({ error: 'Failed to load session data' }, { status: 500 });
  }
} 