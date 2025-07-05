import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  console.log('Sessions API called - process.cwd():', process.cwd());
  try {
    // Try both local and Docker paths
    const possiblePaths = [
      path.join(process.cwd(), 'public', 'parsed_sessions'),
      '/app/public/parsed_sessions'
    ];
    const sessionsDir = possiblePaths.find(p => fs.existsSync(p));
    
    const debugInfo: any = { sessionsDir, sessionFolders: [], triedFiles: [], errors: [] };
    
    if (!sessionsDir) {
      debugInfo.reason = 'No sessionsDir found';
      return NextResponse.json({ sessions: [], debugInfo });
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
    debugInfo.sessionFolders = sessionFolders;
    
    const sessions: any[] = [];
    
    for (const folder of sessionFolders.slice(0, 10)) { // Only debug first 10
      // Try different possible session data files
      const possibleFiles = [
        'parsed_session.json',
        'session_data.json',
        'session.json'
      ];
      
      let sessionData: any = null;
      let sessionPath: string | null = null;
      
      for (const filename of possibleFiles) {
        sessionPath = path.join(sessionsDir, folder, filename);
        debugInfo.triedFiles.push(sessionPath);
        
        if (fs.existsSync(sessionPath)) {
          try {
            sessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
            break;
          } catch (error) {
            debugInfo.errors.push({ file: sessionPath, error: error.message });
          }
        }
      }
      
      if (sessionData) {
        sessions.push({
          id: folder,
          name: sessionData.sessionTitle || sessionData.sessionName || sessionData.session_name || folder,
          date: sessionData.startDate || sessionData.sessionDate || sessionData.session_date || folder,
          player: sessionData.player,
          character: sessionData.character,
          score: sessionData.finalScore,
          totalDays: sessionData.totalDays,
          gameStatus: sessionData.gameStatus,
          // Add other session metadata as needed
        });
      } else {
        debugInfo.errors.push({ file: sessionPath || 'unknown', error: 'No valid session data file found' });
      }
    }
    
    return NextResponse.json({ sessions, debugInfo });
  } catch (error) {
    console.error('Error in sessions API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 