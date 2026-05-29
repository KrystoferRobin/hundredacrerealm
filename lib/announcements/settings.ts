import fs from 'fs';
import path from 'path';
import type { AnnouncementSettings, WebhookDestinationSettings } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const DISCORD_SETTINGS_FILE = path.join(DATA_DIR, 'discord_webhook_settings.json');
const HAVEN_SETTINGS_FILE = path.join(DATA_DIR, 'haven_webhook_settings.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function defaultDestinationSettings(botName: string): WebhookDestinationSettings {
  return {
    webhookUrl: '',
    botName,
    enabled: false,
    baseUrl: 'http://localhost:3000',
  };
}

function loadDestinationSettings(
  filePath: string,
  botName: string
): WebhookDestinationSettings {
  if (fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
      console.error(`Error loading webhook settings from ${filePath}:`, error);
    }
  }
  return defaultDestinationSettings(botName);
}

export function loadAnnouncementSettings(): AnnouncementSettings {
  ensureDataDir();
  return {
    discord: loadDestinationSettings(DISCORD_SETTINGS_FILE, 'TheRealm Parser'),
    haven: loadDestinationSettings(HAVEN_SETTINGS_FILE, 'TheRealm Parser'),
  };
}

export function saveDiscordSettings(settings: WebhookDestinationSettings) {
  ensureDataDir();
  fs.writeFileSync(DISCORD_SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

export function saveHavenSettings(settings: WebhookDestinationSettings) {
  ensureDataDir();
  fs.writeFileSync(HAVEN_SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

export function hasEnabledDestination(settings: AnnouncementSettings): boolean {
  return (
    (settings.discord.enabled && Boolean(settings.discord.webhookUrl)) ||
    (settings.haven.enabled && Boolean(settings.haven.webhookUrl))
  );
}
