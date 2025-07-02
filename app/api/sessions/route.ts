import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const sessionsDir = '/app/public/parsed_sessions';
    
    if (!fs.existsSync(sessionsDir)) {
      return NextResponse.json({ sessions: [] });
    }
    
    const items = fs.readdirSync(sessionsDir, { withFileTypes: true });
    const sessionFolders = items
      .filter(item => item.isDirectory())
      .filter(item => 
        !item.name.startsWith('.') && 
        !item.name.startsWith('._') && 
        item.name !== '.DS_Store' &&
        item.name !== '.AppleDouble' &&
        item.name !== '.LSOverride'
      )
      .map(item => item.name);
    
    const sessions: any[] = [];
    
    for (const folder of sessionFolders) {
      const sessionPath = path.join(sessionsDir, folder, 'parsed_session.json');
      
      if (fs.existsSync(sessionPath)) {
        try {
          const sessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
          sessions.push({
            id: folder,
            name: sessionData.sessionName || sessionData.session_name || folder,
            date: sessionData.sessionDate || sessionData.session_date || folder,
            players: sessionData.players || [],
            // Add other session metadata as needed
          });
        } catch (error) {
          console.error(`Error reading session ${folder}:`, error);
        }
      }
    }
    
    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Error in sessions API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 