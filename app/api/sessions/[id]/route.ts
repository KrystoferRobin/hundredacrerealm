import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    const sessionPath = `/app/public/parsed_sessions/${sessionId}/parsed_session.json`;
    
    if (!fs.existsSync(sessionPath)) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    
    const sessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
    return NextResponse.json(sessionData);
  } catch (error) {
    console.error('Error in session API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 