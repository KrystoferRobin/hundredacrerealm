export interface WebhookDestinationSettings {
  webhookUrl: string;
  botName: string;
  enabled: boolean;
  baseUrl: string;
}

export interface AnnouncementSettings {
  discord: WebhookDestinationSettings;
  haven: WebhookDestinationSettings;
}

export type NotificationType =
  | 'highest-scoring-game'
  | 'highest-scoring-player'
  | 'most-deaths'
  | 'worst-scoring-game'
  | 'character-spotlight'
  | 'latest-session'
  | 'site-stats'
  | 'custom-session'
  | 'hall-of-fame'
  | 'custom-message';

export interface NotificationRequest {
  type: NotificationType;
  sessionId?: string;
  characterName?: string;
  customMessage?: string;
  customTemplate?: string;
}

export interface SessionSummary {
  id: string;
  name: string;
  players: number;
  characters: number;
  totalBattles: number;
  totalActions: number;
  days: number;
  finalDay: string;
  playerList: string;
  highestCharacter: string | null;
  highestPlayer: string | null;
  highestScore: number;
  finalScores?: Record<string, { totalScore: number }>;
  createdAt?: string;
}

export interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  url?: string;
  timestamp?: string;
  footer?: { text: string };
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
}

export interface BuiltNotification {
  discordEmbed: DiscordEmbed;
  havenContent: string;
}

export interface DispatchResult {
  discord: 'sent' | 'skipped' | 'failed';
  haven: 'sent' | 'skipped' | 'failed';
  errors: string[];
}
