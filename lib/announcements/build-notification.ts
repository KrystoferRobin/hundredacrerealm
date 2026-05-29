import { embedToMarkdown } from './markdown';
import {
  calculateHallOfFame,
  getAllSessions,
  parseCustomTemplate,
} from './session-data';
import type {
  AnnouncementSettings,
  BuiltNotification,
  DiscordEmbed,
  NotificationRequest,
  SessionSummary,
} from './types';

function sessionEmbed(
  session: SessionSummary,
  baseUrl: string,
  color = 0x00ff00
): DiscordEmbed {
  return {
    title: session.name,
    description: `${session.finalDay} • ${session.totalBattles} battles • ${session.totalActions} actions\n${session.characters} Characters, ${session.playerList}\nHighest Score: **${session.highestCharacter}** (${session.highestPlayer}) - ${session.highestScore} points`,
    color,
    url: `${baseUrl}/session/${session.id}`,
    timestamp: new Date().toISOString(),
    footer: { text: 'Click to view session details' },
  };
}

function buildFromEmbed(embed: DiscordEmbed): BuiltNotification {
  return {
    discordEmbed: embed,
    havenContent: embedToMarkdown(embed),
  };
}

export function buildNotification(
  request: NotificationRequest,
  settings: AnnouncementSettings
): BuiltNotification | null {
  const sessions = getAllSessions();
  const baseUrl = settings.discord.baseUrl || settings.haven.baseUrl || 'http://localhost:3000';

  switch (request.type) {
    case 'highest-scoring-game': {
      const highestScoringSession =
        sessions.length > 0
          ? sessions.reduce((highest, session) =>
              session.highestScore > highest.highestScore ? session : highest
            )
          : null;
      if (!highestScoringSession) return null;
      return buildFromEmbed({
        title: 'Highest Scoring Game',
        description: `**${highestScoringSession.name}**\n${highestScoringSession.finalDay} • ${highestScoringSession.totalBattles} battles • ${highestScoringSession.totalActions} actions\n${highestScoringSession.characters} Characters, ${highestScoringSession.playerList}\nHighest Score: **${highestScoringSession.highestCharacter}** (${highestScoringSession.highestPlayer}) - ${highestScoringSession.highestScore} points`,
        color: 0xffd700,
        url: `${baseUrl}/session/${highestScoringSession.id}`,
        timestamp: new Date().toISOString(),
        footer: { text: 'Click to view session details' },
      });
    }

    case 'latest-session': {
      const latestSession =
        sessions.length > 0
          ? sessions.reduce((latest, session) => {
              if (!latest.createdAt || !session.createdAt) return latest;
              return new Date(session.createdAt) > new Date(latest.createdAt) ? session : latest;
            }, sessions[0])
          : null;
      if (!latestSession) return null;
      return buildFromEmbed(sessionEmbed(latestSession, baseUrl));
    }

    case 'custom-session': {
      if (!request.sessionId) return null;
      const session = sessions.find((s) => s.id === request.sessionId);
      if (!session) return null;
      return buildFromEmbed(sessionEmbed(session, baseUrl));
    }

    case 'site-stats': {
      const totalSessions = sessions.length;
      const totalPlayers = new Set(sessions.flatMap((s) => (s.playerList || '').split(', ').filter(Boolean))).size;
      const totalCharacters = sessions.reduce((sum, s) => sum + (s.characters || 0), 0);
      const totalBattles = sessions.reduce((sum, s) => sum + (s.totalBattles || 0), 0);
      const totalActions = sessions.reduce((sum, s) => sum + (s.totalActions || 0), 0);

      return buildFromEmbed({
        title: 'Site Statistics',
        color: 0x0099ff,
        fields: [
          { name: 'Total Sessions', value: totalSessions.toString(), inline: true },
          { name: 'Total Players', value: totalPlayers.toString(), inline: true },
          { name: 'Total Characters', value: totalCharacters.toString(), inline: true },
          { name: 'Total Battles', value: totalBattles.toString(), inline: true },
          { name: 'Total Actions', value: totalActions.toString(), inline: true },
        ],
        timestamp: new Date().toISOString(),
        footer: { text: 'Magic Realm Statistics' },
      });
    }

    case 'hall-of-fame': {
      const hallOfFame = calculateHallOfFame(sessions);
      return buildFromEmbed({
        title: 'Hall of Fame',
        color: 0xffd700,
        fields: [
          {
            name: 'Highest Score',
            value: `${hallOfFame.highestScore.character} (${hallOfFame.highestScore.player}) - ${hallOfFame.highestScore.score} points`,
            inline: false,
          },
          {
            name: 'Most Battles',
            value: `${hallOfFame.mostBattles.session} - ${hallOfFame.mostBattles.battles} battles`,
            inline: false,
          },
          {
            name: 'Most Actions',
            value: `${hallOfFame.mostActions.session} - ${hallOfFame.mostActions.actions} actions`,
            inline: false,
          },
          {
            name: 'Longest Game',
            value: `${hallOfFame.longestGame.session} - ${hallOfFame.longestGame.days} days`,
            inline: false,
          },
          {
            name: 'Most Players',
            value: `${hallOfFame.mostPlayers.session} - ${hallOfFame.mostPlayers.players} players`,
            inline: false,
          },
        ],
        timestamp: new Date().toISOString(),
        footer: { text: 'Magic Realm Hall of Fame' },
      });
    }

    case 'custom-message': {
      if (!request.customTemplate || !request.sessionId) return null;
      const session = sessions.find((s) => s.id === request.sessionId);
      if (!session) return null;
      const customMessage = parseCustomTemplate(request.customTemplate, session);
      return buildFromEmbed({
        title: 'Custom Announcement',
        description: customMessage,
        color: 0x9b59b6,
        url: `${baseUrl}/session/${session.id}`,
        timestamp: new Date().toISOString(),
        footer: { text: 'Custom Magic Realm Announcement' },
      });
    }

    default:
      return null;
  }
}

export { getAllSessions, parseCustomTemplate };
