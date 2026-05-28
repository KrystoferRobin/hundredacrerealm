import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const sessionsDir = path.join(process.cwd(), 'public', 'parsed_sessions');
    
    if (!fs.existsSync(sessionsDir)) {
      return NextResponse.json({ error: 'Sessions directory not found' }, { status: 404 });
    }
    
    // Check for enhanced session data first, fall back to regular session data
    const enhancedSessionPath = path.join(sessionsDir, params.id, 'enhanced_session.json');
    const regularSessionPath = path.join(sessionsDir, params.id, 'parsed_session.json');
    
    let sessionPath;
    if (fs.existsSync(enhancedSessionPath)) {
      sessionPath = enhancedSessionPath;
    } else if (fs.existsSync(regularSessionPath)) {
      sessionPath = regularSessionPath;
    } else {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const sessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
    
    return NextResponse.json(sessionData);
  } catch (error) {
    console.error('Error reading session data:', error);
    return NextResponse.json({ error: 'Failed to load session data' }, { status: 500 });
  }
} 