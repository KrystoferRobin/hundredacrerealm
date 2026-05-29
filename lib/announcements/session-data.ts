import fs from 'fs';
import path from 'path';
import type { SessionSummary } from './types';

const SESSIONS_DIR = path.join(process.cwd(), 'public', 'parsed_sessions');

function getSessionData(sessionId: string) {
  const sessionPath = path.join(SESSIONS_DIR, sessionId);
  if (!fs.existsSync(sessionPath)) {
    return null;
  }

  const sessionDataPath = path.join(sessionPath, 'parsed_session.json');
  const finalScoresPath = path.join(sessionPath, 'final_scores.json');
  const sessionTitlesPath = path.join(sessionPath, 'session_titles.json');
  const metadataPath = path.join(sessionPath, 'metadata.json');

  let sessionData: any = null;
  let finalScores: any = null;
  let sessionTitles: any = null;
  let metadata: any = null;

  if (fs.existsSync(sessionDataPath)) {
    sessionData = JSON.parse(fs.readFileSync(sessionDataPath, 'utf8'));
  }
  if (fs.existsSync(finalScoresPath)) {
    finalScores = JSON.parse(fs.readFileSync(finalScoresPath, 'utf8'));
  }
  if (fs.existsSync(sessionTitlesPath)) {
    sessionTitles = JSON.parse(fs.readFileSync(sessionTitlesPath, 'utf8'));
  }
  if (fs.existsSync(metadataPath)) {
    metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  }

  return { sessionData, finalScores, sessionTitles, metadata };
}

export function getAllSessions(): SessionSummary[] {
  if (!fs.existsSync(SESSIONS_DIR)) {
    return [];
  }

  const sessionFolders = fs
    .readdirSync(SESSIONS_DIR, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  return sessionFolders
    .map((sessionId): SessionSummary | null => {
      const sessionBundle = getSessionData(sessionId);
      if (!sessionBundle?.sessionData) return null;

      const { sessionData, finalScores, sessionTitles, metadata } = sessionBundle;

      let totalBattles = 0;
      let totalActions = 0;

      if (sessionData.days) {
        Object.values(sessionData.days).forEach((dayData: any) => {
          totalBattles += (dayData.battles || []).length;
          (dayData.characterTurns || []).forEach((turn: any) => {
            totalActions += (turn.actions || []).length;
          });
        });
      }

      const characters = sessionData.characterToPlayer || {};
      const characterCount = Object.keys(characters).length;
      const playerCount = new Set(Object.values(characters)).size;

      const totalDays = sessionData.days ? Object.keys(sessionData.days).length : 0;
      const finalDayNum = totalDays > 0 ? totalDays - 1 : 0;
      const months = Math.floor(finalDayNum / 28) + 1;
      const dayNum = (finalDayNum % 28) + 1;
      const finalDay = `${months}m${dayNum}d`;

      let highestScore = 0;
      let highestCharacter: string | null = null;
      let highestPlayer: string | null = null;

      if (finalScores) {
        Object.entries(finalScores).forEach(([characterName, scoreData]: [string, any]) => {
          if (scoreData.totalScore > highestScore) {
            highestScore = scoreData.totalScore;
            highestCharacter = characterName;
            highestPlayer = sessionData?.characterToPlayer?.[characterName] || 'Unknown';
          }
        });
      }

      const players = sessionData.players ? Object.keys(sessionData.players) : [];
      const playerList = players.join(', ');

      return {
        id: sessionId,
        name: sessionTitles?.title || sessionData.sessionName || sessionId,
        players: playerCount,
        characters: characterCount,
        totalBattles,
        totalActions,
        days: totalDays,
        finalDay,
        playerList,
        highestCharacter,
        highestPlayer,
        highestScore,
        finalScores,
        createdAt: metadata?.processedAt,
      };
    })
    .filter((session): session is SessionSummary => session !== null);
}

export function calculateHallOfFame(sessions: SessionSummary[]) {
  let highestScore = { character: 'None', player: 'None', score: 0 };
  let mostBattles = { session: 'None', battles: 0 };
  let mostActions = { session: 'None', actions: 0 };
  let longestGame = { session: 'None', days: 0 };
  let mostPlayers = { session: 'None', players: 0 };

  sessions.forEach((session) => {
    if (session.highestScore > highestScore.score) {
      highestScore = {
        character: session.highestCharacter || 'Unknown',
        player: session.highestPlayer || 'Unknown',
        score: session.highestScore,
      };
    }
    if (session.totalBattles > mostBattles.battles) {
      mostBattles = { session: session.name, battles: session.totalBattles };
    }
    if (session.totalActions > mostActions.actions) {
      mostActions = { session: session.name, actions: session.totalActions };
    }
    if (session.days > longestGame.days) {
      longestGame = { session: session.name, days: session.days };
    }
    if (session.players > mostPlayers.players) {
      mostPlayers = { session: session.name, players: session.players };
    }
  });

  return { highestScore, mostBattles, mostActions, longestGame, mostPlayers };
}

export function parseCustomTemplate(template: string, session: SessionSummary) {
  return template
    .replace(/\{sessionName\}/g, session.name || 'Unknown Session')
    .replace(/\{finalDay\}/g, session.finalDay || 'Unknown')
    .replace(/\{totalBattles\}/g, session.totalBattles?.toString() || '0')
    .replace(/\{totalActions\}/g, session.totalActions?.toString() || '0')
    .replace(/\{characters\}/g, session.characters?.toString() || '0')
    .replace(/\{players\}/g, session.players?.toString() || '0')
    .replace(/\{playerList\}/g, session.playerList || 'Unknown')
    .replace(/\{highestCharacter\}/g, session.highestCharacter || 'Unknown')
    .replace(/\{highestPlayer\}/g, session.highestPlayer || 'Unknown')
    .replace(/\{highestScore\}/g, session.highestScore?.toString() || '0')
    .replace(/\{days\}/g, session.days?.toString() || '0');
}
