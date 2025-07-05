import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { generateSessionName } from '../../../scripts/generate_session_name';

interface SessionData {
  id: string;
  name: string;
  totalCharacterTurns: number;
  totalBattles: number;
  totalActions: number;
  uniqueCharacters: number;
  players: number;
  lastModified: string;
  mainTitle?: string;
  subtitle?: string;
  characters?: number;
  days?: number;
  battles?: number;
  finalDay?: string;
}

export async function GET() {
  try {
    // Try both local and Docker paths
    const possiblePaths = [
      path.join(process.cwd(), 'public', 'parsed_sessions'),
      '/app/public/parsed_sessions'
    ];
    const sessionsDir = possiblePaths.find(p => fs.existsSync(p));
    
    if (!sessionsDir) {
      return NextResponse.json([]);
    }
    
    const titlesPath = path.join(process.cwd(), 'data', 'session_titles.json');
    let sessionTitles = {};
    if (fs.existsSync(titlesPath)) {
      sessionTitles = JSON.parse(fs.readFileSync(titlesPath, 'utf8'));
    }

    const sessionFolders = fs.readdirSync(sessionsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    const sessions: SessionData[] = [];

    for (const folder of sessionFolders) {
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
        
        if (fs.existsSync(sessionPath)) {
          try {
            sessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
            break;
          } catch (error) {
            console.error(`Error reading session data from ${sessionPath}:`, error);
          }
        }
      }
      
      if (sessionData) {
        try {
          // Calculate statistics from session data
          const totalBattles = sessionData.combat?.totalBattles || 0;
          const totalDays = sessionData.totalDays || 0;
          
          // Get character and player info
          const characters = sessionData.characterToPlayer || {};
          const characterCount = Object.keys(characters).length;
          const playerCount = new Set(Object.values(characters)).size;
          
          // Calculate final day string (e.g. 2m3d)
          const finalDayNum = totalDays > 0 ? totalDays - 1 : 0;
          const months = Math.floor(finalDayNum / 28) + 1;
          const dayNum = (finalDayNum % 28) + 1;
          const finalDay = `${months}m${dayNum}d`;

          // Get file stats for date
          const stats = fs.statSync(sessionPath!);

          // Find matching fancy title by session name (without timestamp)
          let fancyTitle = undefined;
          const sessionName = folder.split('_')[0]; // Get base session name without timestamp
          for (const [titleKey, titleData] of Object.entries(sessionTitles)) {
            const titleSessionName = titleKey.split('_')[0];
            if (titleSessionName === sessionName) {
              fancyTitle = (titleData as any).mainTitle;
              break;
            }
          }

          sessions.push({
            id: folder, // Use folder name as session ID
            name: fancyTitle || sessionData.sessionTitle || sessionData.sessionName || folder,
            totalCharacterTurns: totalDays,
            totalBattles,
            totalActions: totalDays * 3, // Estimate
            uniqueCharacters: characterCount,
            players: playerCount,
            lastModified: stats.mtime.toISOString(),
            mainTitle: fancyTitle || sessionData.sessionTitle || sessionData.sessionName || folder,
            subtitle: characterCount > 0 ? `${characterCount} characters, ${playerCount} players` : 'No character data',
            characters: characterCount,
            days: totalDays,
            battles: totalBattles,
            finalDay
          });
        } catch (error) {
          console.error(`Error processing session ${folder}:`, error);
        }
      }
    }

    // Sort by last modified date (newest first)
    sessions.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());

    // Return all sessions (not just the last 5)
    return NextResponse.json(sessions);
  } catch (error) {
    console.error('Error reading sessions:', error);
    return NextResponse.json({ error: 'Failed to load sessions' }, { status: 500 });
  }
} 