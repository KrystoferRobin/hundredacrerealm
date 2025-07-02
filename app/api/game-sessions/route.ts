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
    const sessionsDir = '/app/public/parsed_sessions';
    const titlesPath = '/app/data/session_titles.json';
    let sessionTitles = {};
    if (fs.existsSync(titlesPath)) {
      sessionTitles = JSON.parse(fs.readFileSync(titlesPath, 'utf8'));
    }
    if (!fs.existsSync(sessionsDir)) {
      return NextResponse.json([]);
    }

    const sessionFolders = fs.readdirSync(sessionsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    const sessions: SessionData[] = [];

    for (const folder of sessionFolders) {
      const sessionPath = path.join(sessionsDir, folder, 'parsed_session.json');
      const mapLocPath = path.join(sessionsDir, folder, 'map_locations.json');
      
      if (fs.existsSync(sessionPath)) {
        try {
          const sessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
          let mapLocations = null;
          if (fs.existsSync(mapLocPath)) {
            mapLocations = JSON.parse(fs.readFileSync(mapLocPath, 'utf8'));
          }

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

          // Use pregenerated session titles if available
          let mainTitle = sessionData.sessionName;
          let subtitle = '';
          let characters = uniqueCharacters.size;
          let days = Object.keys(sessionData.days).length;
          let battles = totalBattles;
          let finalDay = '';
          if (sessionTitles[folder]) {
            mainTitle = sessionTitles[folder].mainTitle;
            subtitle = sessionTitles[folder].subtitle;
            characters = sessionTitles[folder].characters;
            days = sessionTitles[folder].days;
            battles = sessionTitles[folder].battles;
          } else {
            try {
              const nameData = generateSessionName(sessionData, mapLocations);
              mainTitle = nameData.mainTitle;
              subtitle = nameData.subtitle;
              characters = nameData.characters;
              days = nameData.days;
              battles = nameData.battles;
            } catch (e) {
              // fallback to old
            }
          }
          // Calculate final day string (e.g. 2m3d)
          const finalDayNum = days > 0 ? days - 1 : 0;
          const months = Math.floor(finalDayNum / 28) + 1;
          const dayNum = (finalDayNum % 28) + 1;
          finalDay = `${months}m${dayNum}d`;

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
            lastModified: stats.mtime.toISOString(),
            mainTitle,
            subtitle,
            characters,
            days,
            battles,
            finalDay
          });
        } catch (error) {
          console.error(`Error reading session ${folder}:`, error);
        }
      }
    }

    // Sort by last modified date (newest first)
    sessions.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());

    // Only return the last 5 sessions
    return NextResponse.json(sessions.slice(0, 5));
  } catch (error) {
    console.error('Error reading sessions:', error);
    return NextResponse.json({ error: 'Failed to load sessions' }, { status: 500 });
  }
} 