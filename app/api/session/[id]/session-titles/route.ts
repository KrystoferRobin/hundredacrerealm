import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    
    // Try both local and Docker paths for session_titles.json
    const possiblePaths = [
      path.join(process.cwd(), 'public', 'stats', 'session_titles.json'),
      '/app/public/stats/session_titles.json'
    ];
    const titlesPath = possiblePaths.find(p => fs.existsSync(p));
    
    if (!titlesPath) {
      return NextResponse.json({ error: 'Session titles not found' }, { status: 404 });
    }
    
    const titlesData = JSON.parse(fs.readFileSync(titlesPath, 'utf8'));
    
    // Find matching session title by session name (without timestamp)
    const sessionName = sessionId.split('_')[0]; // Get base session name without timestamp
    let sessionTitle: any = null;
    
    for (const [titleKey, titleData] of Object.entries(titlesData)) {
      const titleSessionName = titleKey.split('_')[0];
      if (titleSessionName === sessionName) {
        sessionTitle = titleData;
        break;
      }
    }
    
    if (!sessionTitle) {
      return NextResponse.json({ error: 'Session title not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      mainTitle: sessionTitle.mainTitle,
      subtitle: sessionTitle.subtitle
    });
    
  } catch (error) {
    console.error('Error fetching session titles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 