import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const SESSIONS_DIR = path.join(process.cwd(), 'public', 'parsed_sessions');

export async function GET() {
  try {
    if (!fs.existsSync(SESSIONS_DIR)) {
      return NextResponse.json({ sessions: [] });
    }

    const items = fs.readdirSync(SESSIONS_DIR, { withFileTypes: true });
    const sessionFolders = items
      .filter(item => item.isDirectory())
      .map(item => item.name);

    const sessions: Array<{
      sessionId: string;
      name: string;
      characters: Array<{
        characterName: string;
        playerName: string;
        score?: number;
        isDead?: boolean;
      }>;
      date?: string;
      totalDays?: number;
    }> = [];

    for (const folder of sessionFolders) {
      const sessionPath = path.join(SESSIONS_DIR, folder);
      const parsedSessionPath = path.join(sessionPath, 'parsed_session.json');
      const finalScoresPath = path.join(sessionPath, 'final_scores.json');
      
      if (fs.existsSync(parsedSessionPath)) {
        try {
          const sessionData = JSON.parse(fs.readFileSync(parsedSessionPath, 'utf8'));
          const finalScores = fs.existsSync(finalScoresPath) 
            ? JSON.parse(fs.readFileSync(finalScoresPath, 'utf8')) 
            : {};

          const characters: Array<{
            characterName: string;
            playerName: string;
            score?: number;
            isDead?: boolean;
          }> = [];

          // Get character-to-player mappings
          if (sessionData.characterToPlayer) {
            Object.entries(sessionData.characterToPlayer).forEach(([characterName, playerName]) => {
              const scoreData = finalScores[characterName];
              characters.push({
                characterName,
                playerName: playerName as string,
                score: scoreData?.totalScore,
                isDead: scoreData?.isDead || false
              });
            });
          }

          // Sort characters by player name for better organization
          characters.sort((a, b) => a.playerName.localeCompare(b.playerName));

          sessions.push({
            sessionId: folder,
            name: sessionData.sessionName || sessionData.session_name || folder,
            characters,
            date: sessionData.sessionDate || sessionData.session_date,
            totalDays: sessionData.totalDays || Object.keys(sessionData.days || {}).length
          });
        } catch (error) {
          console.error(`Error reading session ${folder}:`, error);
        }
      }
    }

    // Sort sessions by date (newest first)
    sessions.sort((a, b) => {
      if (a.date && b.date) {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      return b.sessionId.localeCompare(a.sessionId);
    });

    return NextResponse.json({ sessions });

  } catch (error) {
    console.error('Error reading character assignments:', error);
    return NextResponse.json(
      { error: 'Failed to load character assignments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, characterName, newPlayerName } = body;

    if (!sessionId || !characterName || !newPlayerName) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, characterName, newPlayerName' },
        { status: 400 }
      );
    }

    const sessionPath = path.join(SESSIONS_DIR, sessionId);
    const parsedSessionPath = path.join(sessionPath, 'parsed_session.json');
    
    if (!fs.existsSync(parsedSessionPath)) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Read the session data
    const sessionData = JSON.parse(fs.readFileSync(parsedSessionPath, 'utf8'));
    
    // Update the character assignment
    if (sessionData.characterToPlayer && sessionData.characterToPlayer[characterName]) {
      // Create backup
      const backupPath = `${parsedSessionPath}.backup.${Date.now()}`;
      fs.copyFileSync(parsedSessionPath, backupPath);
      
      // Update the player name
      sessionData.characterToPlayer[characterName] = newPlayerName;
      
      // Also update in players object if it exists
      if (sessionData.players) {
        // Remove old player entry if it exists
        if (sessionData.players[sessionData.characterToPlayer[characterName]]) {
          delete sessionData.players[sessionData.characterToPlayer[characterName]];
        }
        // Add new player entry
        sessionData.players[newPlayerName] = {
          name: newPlayerName,
          characters: [characterName]
        };
      }
      
      // Save the updated session data
      fs.writeFileSync(parsedSessionPath, JSON.stringify(sessionData, null, 2));
      
      return NextResponse.json({ 
        success: true, 
        message: `Updated ${characterName} to be played by ${newPlayerName}` 
      });
    } else {
      return NextResponse.json(
        { error: 'Character not found in session' },
        { status: 404 }
      );
    }

  } catch (error) {
    console.error('Error updating character assignment:', error);
    return NextResponse.json(
      { error: 'Failed to update character assignment' },
      { status: 500 }
    );
  }
} 