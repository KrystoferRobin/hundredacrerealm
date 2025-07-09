import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface CharacterStats {
  gamesPlayed: number;
  bestScore: number;
}

interface PlayerData {
  name: string;
  totalGames: number;
  bestScore: number;
  averageScore: number;
  mostRecentScore: number;
  charactersPlayed: string[];
  characterCounts: { [character: string]: number };
  characterStats: { [character: string]: CharacterStats };
  bestSessionId?: string;
  bestSessionTitle?: string;
  mostRecentSessionId?: string;
  mostRecentSessionTitle?: string;
}

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Try both local and Docker paths
    const possiblePaths = [
      path.join(process.cwd(), 'public', 'parsed_sessions'),
      '/app/public/parsed_sessions'
    ];
    const sessionsDir = possiblePaths.find(p => fs.existsSync(p));
    
    if (!sessionsDir) {
      return NextResponse.json({ players: [] });
    }

    const playerData: { [playerName: string]: PlayerData } = {};

    const sessionFolders = fs.readdirSync(sessionsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    // Sort sessions by creation time to get most recent
    sessionFolders.sort((a, b) => {
      const aPath = path.join(sessionsDir, a);
      const bPath = path.join(sessionsDir, b);
      return fs.statSync(bPath).birthtime.getTime() - fs.statSync(aPath).birthtime.getTime();
    });

    for (const folder of sessionFolders) {
      // Try different possible session data files
      const possibleFiles = [
        'parsed_session.json',
        'session_data.json',
        'session.json'
      ];
      
      let sessionData: any = null;
      
      for (const filename of possibleFiles) {
        const sessionPath = path.join(sessionsDir, folder, filename);
        
        if (fs.existsSync(sessionPath)) {
          try {
            sessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
            break;
          } catch (error) {
            console.error(`Error reading session data from ${sessionPath}:`, error);
          }
        }
      }
      
      if (sessionData && sessionData.characterToPlayer) {
        const characters = sessionData.characterToPlayer;
        
        // Try to load scores from the separate scores file
        let scores: any = {};
        const scoresPath = path.join(sessionsDir, folder, 'final_scores.json');
        if (fs.existsSync(scoresPath)) {
          try {
            scores = JSON.parse(fs.readFileSync(scoresPath, 'utf8'));
          } catch (error) {
            console.error(`Error reading scores from ${scoresPath}:`, error);
          }
        }
        
        // Process each character and their player
        Object.entries(characters).forEach(([character, playerName]: [string, string]) => {
          const playerScore = scores[character]?.totalScore || 0;
          
          if (!playerData[playerName]) {
            playerData[playerName] = {
              name: playerName,
              totalGames: 0,
              bestScore: -Infinity,
              averageScore: 0,
              mostRecentScore: 0,
              charactersPlayed: [],
              characterCounts: {},
              characterStats: {}
            };
          }
          
          const player = playerData[playerName];
          player.totalGames++;
          
          // Track most recent score (first session processed is most recent due to sorting)
          if (!player.mostRecentSessionId) {
            player.mostRecentScore = playerScore;
            player.mostRecentSessionId = folder;
            player.mostRecentSessionTitle = sessionData.sessionTitle || sessionData.sessionName || folder;
          }
          
          if (playerScore > player.bestScore) {
            player.bestScore = playerScore;
            player.bestSessionId = folder;
            player.bestSessionTitle = sessionData.sessionTitle || sessionData.sessionName || folder;
          }
          
          if (!player.charactersPlayed.includes(character)) {
            player.charactersPlayed.push(character);
          }
          
          player.characterCounts[character] = (player.characterCounts[character] || 0) + 1;
          
          // Track character-specific stats
          if (!player.characterStats[character]) {
            player.characterStats[character] = {
              gamesPlayed: 0,
              bestScore: -Infinity
            };
          }
          
          player.characterStats[character].gamesPlayed++;
          if (playerScore > player.characterStats[character].bestScore) {
            player.characterStats[character].bestScore = playerScore;
          }
        });
      }
    }

    // Calculate averages and find most played characters
    const players = Object.values(playerData).map(player => {
      // Calculate total score for average (we still need this for the calculation)
      let totalScore = 0;
      Object.entries(player.characterStats).forEach(([character, stats]) => {
        totalScore += stats.bestScore * stats.gamesPlayed; // This is approximate, but we don't have individual game scores
      });
      
      player.averageScore = player.totalGames > 0 ? Math.round(totalScore / player.totalGames) : 0;
      
      // Find most played character
      let mostPlayedCharacter = '';
      let mostPlayedCount = 0;
      Object.entries(player.characterCounts).forEach(([character, count]) => {
        if (count > mostPlayedCount) {
          mostPlayedCount = count;
          mostPlayedCharacter = character;
        }
      });
      
      return {
        ...player,
        mostPlayedCharacter,
        mostPlayedCharacterCount: mostPlayedCount
      };
    });

    // Sort by total games played (descending)
    players.sort((a, b) => b.totalGames - a.totalGames);

    return NextResponse.json({ players });
  } catch (error) {
    console.error('Error reading player data:', error);
    return NextResponse.json({ error: 'Failed to load player data' }, { status: 500 });
  }
} 