import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { DiscordWebhook } from '../../../../scripts/discord_webhook';

// File to store webhook settings
const WEBHOOK_SETTINGS_FILE = path.join(process.cwd(), 'data', 'discord_webhook_settings.json');

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

interface WebhookSettings {
  webhookUrl: string;
  botName: string;
  enabled: boolean;
  baseUrl: string;
}

interface NotificationRequest {
  type: 'highest-scoring-game' | 'highest-scoring-player' | 'most-deaths' | 'worst-scoring-game' | 
        'character-spotlight' | 'latest-session' | 'site-stats' | 'custom-session' | 'hall-of-fame' | 'custom-message';
  sessionId?: string;
  characterName?: string;
  customMessage?: string;
  customTemplate?: string;
}

// Helper to load webhook settings
function loadWebhookSettings(): WebhookSettings {
  if (fs.existsSync(WEBHOOK_SETTINGS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(WEBHOOK_SETTINGS_FILE, 'utf8'));
    } catch (error) {
      console.error('Error loading webhook settings:', error);
    }
  }
  
  return {
    webhookUrl: '',
    botName: 'TheRealm Parser',
    enabled: false,
    baseUrl: 'http://localhost:3000'
  };
}

// Helper to save webhook settings
function saveWebhookSettings(settings: WebhookSettings) {
  fs.writeFileSync(WEBHOOK_SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

// Helper to get session data
function getSessionData(sessionId: string) {
  const sessionsDir = path.join(process.cwd(), 'public', 'parsed_sessions');
  const sessionPath = path.join(sessionsDir, sessionId);
  
  if (!fs.existsSync(sessionPath)) {
    return null;
  }
  
  const sessionDataPath = path.join(sessionPath, 'parsed_session.json');
  const finalScoresPath = path.join(sessionPath, 'final_scores.json');
  const sessionTitlesPath = path.join(sessionPath, 'session_titles.json');
  
  let sessionData: any = null;
  let finalScores: any = null;
  let sessionTitles: any = null;
  
  if (fs.existsSync(sessionDataPath)) {
    sessionData = JSON.parse(fs.readFileSync(sessionDataPath, 'utf8'));
  }
  
  if (fs.existsSync(finalScoresPath)) {
    finalScores = JSON.parse(fs.readFileSync(finalScoresPath, 'utf8'));
  }
  
  if (fs.existsSync(sessionTitlesPath)) {
    sessionTitles = JSON.parse(fs.readFileSync(sessionTitlesPath, 'utf8'));
  }
  
  return { sessionData, finalScores, sessionTitles };
}

// Helper to get all sessions
function getAllSessions() {
  const sessionsDir = path.join(process.cwd(), 'public', 'parsed_sessions');
  
  if (!fs.existsSync(sessionsDir)) {
    return [];
  }
  
  const sessionFolders = fs.readdirSync(sessionsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  return sessionFolders.map(sessionId => {
    const sessionData = getSessionData(sessionId);
    if (!sessionData?.sessionData) return null;
    
    // Calculate basic stats
    let totalBattles = 0;
    let totalActions = 0;
    const uniqueCharacters = new Set();
    
    if (sessionData.sessionData.days) {
      Object.values(sessionData.sessionData.days).forEach((dayData: any) => {
        totalBattles += (dayData.battles || []).length;
        (dayData.characterTurns || []).forEach((turn: any) => {
          if (turn.character && !turn.character.includes('HQ')) {
            uniqueCharacters.add(turn.character);
          }
          totalActions += (turn.actions || []).length;
        });
      });
    }
    
    const characters = sessionData.sessionData.characterToPlayer || {};
    const characterCount = Object.keys(characters).length;
    const playerCount = new Set(Object.values(characters)).size;
    
    // Calculate final day
    const totalDays = sessionData.sessionData.days ? Object.keys(sessionData.sessionData.days).length : 0;
    const finalDayNum = totalDays > 0 ? totalDays - 1 : 0;
    const months = Math.floor(finalDayNum / 28) + 1;
    const dayNum = (finalDayNum % 28) + 1;
    const finalDay = `${months}m${dayNum}d`;
    
    // Find highest scoring character
    let highestScore = 0;
    let highestCharacter: string | null = null;
    let highestPlayer: string | null = null;
    
    if (sessionData.finalScores) {
      Object.entries(sessionData.finalScores).forEach(([characterName, scoreData]: [string, any]) => {
        if (scoreData.totalScore > highestScore) {
          highestScore = scoreData.totalScore;
          highestCharacter = characterName;
          highestPlayer = sessionData.sessionData?.characterToPlayer?.[characterName] || 'Unknown';
        }
      });
    }
    
    // Get list of players
    const players = sessionData.sessionData.players ? Object.keys(sessionData.sessionData.players) : [];
    const playerList = players.join(', ');
    
    return {
      id: sessionId,
      name: sessionData.sessionTitles?.title || sessionData.sessionData.sessionName || sessionId,
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
      finalScores: sessionData.finalScores
    };
  }).filter(Boolean);
}

// Helper to calculate Hall of Fame statistics
function calculateHallOfFame(sessions: any[]) {
  let highestScore = { character: 'None', player: 'None', score: 0 };
  let mostBattles = { session: 'None', battles: 0 };
  let mostActions = { session: 'None', actions: 0 };
  let longestGame = { session: 'None', days: 0 };
  let mostPlayers = { session: 'None', players: 0 };
  
  sessions.forEach(session => {
    // Highest score
    if (session.highestScore > highestScore.score) {
      highestScore = {
        character: session.highestCharacter || 'Unknown',
        player: session.highestPlayer || 'Unknown',
        score: session.highestScore
      };
    }
    
    // Most battles
    if (session.totalBattles > mostBattles.battles) {
      mostBattles = {
        session: session.name,
        battles: session.totalBattles
      };
    }
    
    // Most actions
    if (session.totalActions > mostActions.actions) {
      mostActions = {
        session: session.name,
        actions: session.totalActions
      };
    }
    
    // Longest game
    if (session.days > longestGame.days) {
      longestGame = {
        session: session.name,
        days: session.days
      };
    }
    
    // Most players
    if (session.players > mostPlayers.players) {
      mostPlayers = {
        session: session.name,
        players: session.players
      };
    }
  });
  
  return {
    highestScore,
    mostBattles,
    mostActions,
    longestGame,
    mostPlayers
  };
}

// Helper to parse custom template with data tags
function parseCustomTemplate(template: string, session: any) {
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

export async function GET() {
  try {
    const settings = loadWebhookSettings();
    const sessions = getAllSessions();
    
    return NextResponse.json({
      settings,
      sessions: sessions.slice(0, 50) // Limit to 50 most recent
    });
  } catch (error) {
    console.error('Error in GET /api/admin/discord-webhook:', error);
    return NextResponse.json({ error: 'Failed to load webhook settings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;
    
    switch (action) {
      case 'update-settings':
        const settings: WebhookSettings = data;
        saveWebhookSettings(settings);
        return NextResponse.json({ success: true, message: 'Settings updated' });
        
      case 'send-notification':
        const notificationRequest: NotificationRequest = data;
        const webhookSettings = loadWebhookSettings();
        
        if (!webhookSettings.enabled || !webhookSettings.webhookUrl) {
          return NextResponse.json({ error: 'Webhook not configured or disabled' }, { status: 400 });
        }
        
        const webhook = new DiscordWebhook(webhookSettings.webhookUrl);
        const sessions = getAllSessions();
        
        switch (notificationRequest.type) {
          case 'highest-scoring-game':
            const highestScoringSession = sessions.reduce((highest, session) => {
              if (!highest || (session.highestScore > highest.highestScore)) {
                return session;
              }
              return highest;
            }, null);
            
            if (highestScoringSession) {
              const embed = {
                title: '🏆 Highest Scoring Game',
                description: `**${highestScoringSession.name}**\n${highestScoringSession.finalDay} • ${highestScoringSession.totalBattles} battles • ${highestScoringSession.totalActions} actions\n${highestScoringSession.characters} Characters, ${highestScoringSession.playerList}\nHighest Score: **${highestScoringSession.highestCharacter}** (${highestScoringSession.highestPlayer}) - ${highestScoringSession.highestScore} points`,
                color: 0xffd700, // Gold
                url: `${webhookSettings.baseUrl}/session/${highestScoringSession.id}`,
                timestamp: new Date().toISOString(),
                footer: { text: 'Click to view session details' }
              };
              await webhook.sendMessage('', { embed });
            }
            break;
            
          case 'latest-session':
            if (sessions.length > 0) {
              const latestSession = sessions[0]; // Assuming sorted by date
              const embed = {
                title: latestSession.name,
                description: `${latestSession.finalDay} • ${latestSession.totalBattles} battles • ${latestSession.totalActions} actions\n${latestSession.characters} Characters, ${latestSession.playerList}\nHighest Score: **${latestSession.highestCharacter}** (${latestSession.highestPlayer}) - ${latestSession.highestScore} points`,
                color: 0x00ff00, // Green
                url: `${webhookSettings.baseUrl}/session/${latestSession.id}`,
                timestamp: new Date().toISOString(),
                footer: { text: 'Click to view session details' }
              };
              await webhook.sendMessage('', { embed });
            }
            break;
            
          case 'custom-session':
            if (notificationRequest.sessionId) {
              const session = sessions.find(s => s.id === notificationRequest.sessionId);
              if (session) {
                const embed = {
                  title: session.name,
                  description: `${session.finalDay} • ${session.totalBattles} battles • ${session.totalActions} actions\n${session.characters} Characters, ${session.playerList}\nHighest Score: **${session.highestCharacter}** (${session.highestPlayer}) - ${session.highestScore} points`,
                  color: 0x00ff00, // Green
                  url: `${webhookSettings.baseUrl}/session/${session.id}`,
                  timestamp: new Date().toISOString(),
                  footer: { text: 'Click to view session details' }
                };
                await webhook.sendMessage('', { embed });
              }
            }
            break;
            
          case 'site-stats':
            // Calculate site-wide statistics
            const totalSessions = sessions.length;
            const totalPlayers = new Set(sessions.flatMap(s => s.playerList.split(', '))).size;
            const totalCharacters = sessions.reduce((sum, s) => sum + s.characters, 0);
            const totalBattles = sessions.reduce((sum, s) => sum + s.totalBattles, 0);
            const totalActions = sessions.reduce((sum, s) => sum + s.totalActions, 0);
            
            const embed = {
              title: '📊 Site Statistics',
              color: 0x0099ff, // Blue
              fields: [
                { name: 'Total Sessions', value: totalSessions.toString(), inline: true },
                { name: 'Total Players', value: totalPlayers.toString(), inline: true },
                { name: 'Total Characters', value: totalCharacters.toString(), inline: true },
                { name: 'Total Battles', value: totalBattles.toString(), inline: true },
                { name: 'Total Actions', value: totalActions.toString(), inline: true }
              ],
              timestamp: new Date().toISOString(),
              footer: { text: 'Magic Realm Statistics' }
            };
            await webhook.sendMessage('', { embed });
            break;
            
          case 'hall-of-fame':
            // Calculate Hall of Fame statistics
            const hallOfFame = calculateHallOfFame(sessions);
            
            const hofEmbed = {
              title: '🏆 Hall of Fame',
              color: 0xffd700, // Gold
              fields: [
                { name: '🏅 Highest Score', value: `${hallOfFame.highestScore.character} (${hallOfFame.highestScore.player}) - ${hallOfFame.highestScore.score} points`, inline: false },
                { name: '⚔️ Most Battles', value: `${hallOfFame.mostBattles.session} - ${hallOfFame.mostBattles.battles} battles`, inline: false },
                { name: '🎯 Most Actions', value: `${hallOfFame.mostActions.session} - ${hallOfFame.mostActions.actions} actions`, inline: false },
                { name: '⏱️ Longest Game', value: `${hallOfFame.longestGame.session} - ${hallOfFame.longestGame.days} days`, inline: false },
                { name: '👥 Most Players', value: `${hallOfFame.mostPlayers.session} - ${hallOfFame.mostPlayers.players} players`, inline: false }
              ],
              timestamp: new Date().toISOString(),
              footer: { text: 'Magic Realm Hall of Fame' }
            };
            await webhook.sendMessage('', { embed: hofEmbed });
            break;
            
          case 'custom-message':
            if (notificationRequest.customTemplate && notificationRequest.sessionId) {
              const session = sessions.find(s => s.id === notificationRequest.sessionId);
              if (session) {
                const customMessage = parseCustomTemplate(notificationRequest.customTemplate, session);
                const customEmbed = {
                  title: '🎮 Custom Announcement',
                  description: customMessage,
                  color: 0x9b59b6, // Purple
                  url: `${webhookSettings.baseUrl}/session/${session.id}`,
                  timestamp: new Date().toISOString(),
                  footer: { text: 'Custom Magic Realm Announcement' }
                };
                await webhook.sendMessage('', { embed: customEmbed });
              }
            }
            break;
            
          default:
            return NextResponse.json({ error: 'Unknown notification type' }, { status: 400 });
        }
        
        return NextResponse.json({ success: true, message: 'Notification sent' });
        
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in POST /api/admin/discord-webhook:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
} 