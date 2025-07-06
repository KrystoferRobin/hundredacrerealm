import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = "force-dynamic";

function slugify(name) {
  return name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\-]/g, '').toLowerCase();
}

export async function GET(request: NextRequest) {
  try {
    const statsFile = path.join(process.cwd(), 'public', 'stats', 'master_stats.json');
    
    if (!fs.existsSync(statsFile)) {
      return NextResponse.json(
        { error: 'Master stats not found. Run the stats builder first.' },
        { status: 404 }
      );
    }

    const statsData = fs.readFileSync(statsFile, 'utf8');
    const stats = JSON.parse(statsData);

    // Find highest scoring character (allow 0 and negative scores)
    const characterScores = Object.entries(stats.characters)
      .map(([name, data]: [string, any]) => {
        const validGames = (data.games || []).filter((game: any) => typeof game.score === 'number');
        if (validGames.length === 0) return null;
        const bestScore = Math.max(...validGames.map((game: any) => game.score));
        const bestGames = validGames.filter((game: any) => game.score === bestScore);
        return {
          name,
          characterSlug: name,
          bestScore,
          bestGames,
          players: data.players,
          totalGames: data.totalPlays || validGames.length
        };
      })
      .filter(char => char && char.bestScore !== null && char.bestScore !== undefined);
    // Find the top score among all characters
    const topScore = characterScores.length > 0 ? Math.max(...characterScores.filter(char => char !== null).map(char => char!.bestScore)) : null;
    // Only include characters with the top score
    const highestScoringCharacters = characterScores.filter(char => char && char.bestScore === topScore);

    // For each, flatten out the bestGames for display
    const isNotNull = <T,>(x: T | null): x is T => x !== null;
    const highestScoringCharactersExpanded = highestScoringCharacters
      .filter(isNotNull)
      .flatMap(char =>
        char.bestGames.map(game => ({
          name: char.name,
          characterSlug: char.characterSlug,
          bestScore: char.bestScore,
          bestSessionId: game.sessionId,
          bestSessionTitle: game.sessionTitle,
          players: char.players,
          totalGames: char.totalGames
        }))
      );

    // Most played character
    const mostPlayed = Object.entries(stats.characters)
      .map(([name, data]: [string, any]) => ({ name, characterSlug: name, plays: data.totalPlays }))
      .sort((a, b) => b.plays - a.plays);
    const mostPlays = mostPlayed.length > 0 ? mostPlayed[0].plays : null;
    const mostPlayedCharacters = mostPlayed.filter(char => char.plays === mostPlays);

    // Find player with highest scoring game (allow 0 and negative scores)
    const playerScores: any = {};
    (stats.sessions || []).forEach((session: any) => {
      Object.entries(session.scores || {}).forEach(([character, scoreData]: [string, any]) => {
        const player = session.characters[character];
        if (player && typeof scoreData.totalScore === 'number') {
          if (!playerScores[player] || scoreData.totalScore > playerScores[player].bestScore) {
            playerScores[player] = {
              bestScore: scoreData.totalScore,
              character,
              characterSlug: character,
              sessionId: session.sessionId,
              sessionTitle: session.sessionTitle
            };
          }
        }
      });
    });
    const playerScoreArr = Object.entries(playerScores).map(([player, data]: [string, any]) => ({ player, ...data }));
    // Always allow 0 and negative scores
    const topPlayerScore = playerScoreArr.length > 0 ? Math.max(...playerScoreArr.map(p => p.bestScore)) : null;
    const highestScoringPlayers = playerScoreArr.filter(p => p.bestScore === topPlayerScore);

    // For each top player, get their most played character
    highestScoringPlayers.forEach(player => {
      const charCounts = {};
      (stats.sessions || []).forEach(session => {
        Object.entries(session.characters || {}).forEach(([character, p]) => {
          if (p === player.player) {
            charCounts[character] = (charCounts[character] || 0) + 1;
          }
        });
      });
      const entries = Object.entries(charCounts).map(([character, count]: [string, number]) => ({ character, count, characterSlug: character }));
      entries.sort((a, b) => b.count - a.count);
      player.mostPlayedCharacter = entries.length > 0 ? entries[0] : null;
    });

    return NextResponse.json({
      highestScoringCharacter: {
        characters: highestScoringCharactersExpanded,
        score: topScore
      },
      mostPlayedCharacter: {
        characters: mostPlayedCharacters,
        plays: mostPlays
      },
      highestScoringPlayer: {
        players: highestScoringPlayers,
        score: topPlayerScore,
        mostPlayedCharacter: highestScoringPlayers[0]?.mostPlayedCharacter || null
      }
    });
  } catch (error) {
    console.error('Error in Hall of Fame API:', error);
    return NextResponse.json(
      { error: 'Failed to load Hall of Fame data' },
      { status: 500 }
    );
  }
} 