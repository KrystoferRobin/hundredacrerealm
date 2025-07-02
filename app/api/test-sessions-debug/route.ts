import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Change to /app directory to access parsed_sessions (this approach works)
    const originalCwd = process.cwd();
    process.chdir('/app');
    
    const sessionsDir = 'public/parsed_sessions';
    
    console.log('🔍 Debug: Checking sessions directory:', sessionsDir);
    console.log('🔍 Debug: Directory exists:', fs.existsSync(sessionsDir));
    
    if (!fs.existsSync(sessionsDir)) {
      console.log('❌ Debug: Directory does not exist');
      return NextResponse.json({ error: 'Directory not found', sessions: [] });
    }
    
    const items = fs.readdirSync(sessionsDir, { withFileTypes: true });
    console.log('🔍 Debug: All items in directory:', items.map(item => ({ name: item.name, isDirectory: item.isDirectory() })));
    
    const sessionFolders = items.filter(item => item.isDirectory()).map(item => item.name);
    console.log('🔍 Debug: Session folders found:', sessionFolders);
    
    const sessions: any[] = [];
    
    for (const folder of sessionFolders) {
      const sessionPath = path.join(sessionsDir, folder, 'parsed_session.json');
      console.log('🔍 Debug: Checking session path:', sessionPath);
      console.log('🔍 Debug: Session file exists:', fs.existsSync(sessionPath));
      
      if (fs.existsSync(sessionPath)) {
        try {
          const sessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
          console.log('🔍 Debug: Session data keys:', Object.keys(sessionData));
          console.log('🔍 Debug: Session name:', sessionData.sessionName);
          
          sessions.push({
            id: folder,
            name: sessionData.sessionName || sessionData.session_name || folder,
            date: sessionData.sessionDate || sessionData.session_date || folder,
            players: sessionData.players || [],
          });
        } catch (error) {
          console.error(`❌ Debug: Error reading session ${folder}:`, error);
        }
      }
    }
    
    console.log('🔍 Debug: Final sessions array:', sessions);
    
    // Restore original working directory
    process.chdir(originalCwd);
    
    return NextResponse.json({ sessions, debug: { sessionsDir, sessionFolders } });
  } catch (error) {
    console.error('❌ Debug: Error in sessions API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 