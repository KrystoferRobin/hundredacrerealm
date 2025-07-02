import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    
    // Read session_titles.json
    const titlesPath = path.join('/app/data/session_titles.json');
    
    if (!fs.existsSync(titlesPath)) {
      return NextResponse.json({ error: 'Session titles not found' }, { status: 404 });
    }
    
    const titlesData = JSON.parse(fs.readFileSync(titlesPath, 'utf8'));
    
    if (!titlesData[sessionId]) {
      return NextResponse.json({ error: 'Session title not found' }, { status: 404 });
    }
    
    const sessionTitle = titlesData[sessionId];
    
    return NextResponse.json({
      mainTitle: sessionTitle.mainTitle,
      subtitle: sessionTitle.subtitle
    });
    
  } catch (error) {
    console.error('Error fetching session titles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 