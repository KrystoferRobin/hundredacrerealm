import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const sessionsDir = path.join(process.cwd(), 'parsed_sessions');
    
    if (!fs.existsSync(sessionsDir)) {
      return NextResponse.json([]);
    }

    const sessionFolders = fs.readdirSync(sessionsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    const sessions = [];

    for (const folder of sessionFolders) {
      const sessionPath = path.join(sessionsDir, folder, 'parsed_session.json');
      
      if (fs.existsSync(sessionPath)) {
        try {
          const sessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
          
          // Calculate statistics
          let totalCharacterTurns = 0;
          let totalBattles = 0;
          let totalActions = 0;
          const uniqueCharacters = new Set<string>();

          Object.values(sessionData.days).forEach((dayData: any) => {
            totalCharacterTurns += dayData.characterTurns.length;
            totalBattles += dayData.battles.length;
            
            dayData.characterTurns.forEach((turn: any) => {
              if (!turn.character.includes('HQ')) {
                uniqueCharacters.add(turn.character);
              }
              totalActions += turn.actions.length;
            });
          });

          // Get file stats for date
          const stats = fs.statSync(sessionPath);
          
          sessions.push({
            id: folder,
            name: sessionData.sessionName,
            totalCharacterTurns,
            totalBattles,
            totalActions,
            uniqueCharacters: uniqueCharacters.size,
            players: Object.keys(sessionData.players).length,
            lastModified: stats.mtime.toISOString()
          });
        } catch (error) {
          console.error(`Error reading session ${folder}:`, error);
        }
      }
    }

    // Sort by last modified date (newest first)
    sessions.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());

    return NextResponse.json(sessions);
  } catch (error) {
    console.error('Error reading sessions:', error);
    return NextResponse.json({ error: 'Failed to load sessions' }, { status: 500 });
  }
} 