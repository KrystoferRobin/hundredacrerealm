import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const sessionsDir = path.join(process.cwd(), 'parsed_sessions');
    console.log('Sessions directory:', sessionsDir);
    console.log('Directory exists:', fs.existsSync(sessionsDir));
    
    if (!fs.existsSync(sessionsDir)) {
      return NextResponse.json({ error: 'Sessions directory does not exist' });
    }

    const sessionFolders = fs.readdirSync(sessionsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    console.log('Found session folders:', sessionFolders);

    const sessions: any[] = [];

    for (const folder of sessionFolders) {
      console.log(`Processing folder: ${folder}`);
      const sessionPath = path.join(sessionsDir, folder, 'parsed_session.json');
      console.log(`Session path: ${sessionPath}`);
      console.log(`Session file exists: ${fs.existsSync(sessionPath)}`);
      
      if (fs.existsSync(sessionPath)) {
        try {
          const sessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
          console.log(`Successfully parsed session data for ${folder}`);
          console.log(`Session name: ${sessionData.sessionName}`);
          console.log(`Days: ${Object.keys(sessionData.days || {}).length}`);
          console.log(`Players: ${Object.keys(sessionData.players || {}).length}`);
          
          // Calculate basic stats
          let totalCharacterTurns = 0;
          let totalBattles = 0;
          let totalActions = 0;
          const uniqueCharacters = new Set<string>();

          Object.values(sessionData.days || {}).forEach((dayData: any) => {
            totalCharacterTurns += (dayData.characterTurns || []).length;
            totalBattles += (dayData.battles || []).length;
            
            (dayData.characterTurns || []).forEach((turn: any) => {
              if (!turn.character.includes('HQ')) {
                uniqueCharacters.add(turn.character);
              }
              totalActions += (turn.actions || []).length;
            });
          });

          const stats = fs.statSync(sessionPath);
          
          sessions.push({
            id: folder,
            name: sessionData.sessionName,
            totalCharacterTurns,
            totalBattles,
            totalActions,
            uniqueCharacters: uniqueCharacters.size,
            players: Object.keys(sessionData.players || {}).length,
            lastModified: stats.mtime.toISOString(),
            days: Object.keys(sessionData.days || {}).length
          });
          
          console.log(`Successfully added session ${folder} to results`);
        } catch (error) {
          console.error(`Error reading session ${folder}:`, error);
        }
      } else {
        console.log(`Session file does not exist for ${folder}`);
      }
    }

    console.log(`Total sessions found: ${sessions.length}`);
    return NextResponse.json(sessions);
  } catch (error) {
    console.error('Error in test-game-sessions:', error);
    return NextResponse.json({ 
      error: 'Test failed', 
      message: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
} 