import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const sessionPath = path.join(process.cwd(), 'parsed_sessions', '6-17-25-5man-now3', 'parsed_session.json');
    
    if (!fs.existsSync(sessionPath)) {
      return NextResponse.json({ error: 'Session data not found' }, { status: 404 });
    }

    const sessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
    
    return NextResponse.json(sessionData);
  } catch (error) {
    console.error('Error reading session data:', error);
    return NextResponse.json({ error: 'Failed to load session data' }, { status: 500 });
  }
} 