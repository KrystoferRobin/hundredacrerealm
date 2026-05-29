const fs = require('fs');
const path = require('path');
const { DiscordWebhook } = require('./discord_webhook');
const { HavenWebhook, embedToMarkdown } = require('./haven_webhook');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DISCORD_SETTINGS_FILE = path.join(DATA_DIR, 'discord_webhook_settings.json');
const HAVEN_SETTINGS_FILE = path.join(DATA_DIR, 'haven_webhook_settings.json');

function loadDestinationSettings(filePath, botName) {
  if (fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
      console.error(`Error loading webhook settings from ${filePath}:`, error);
    }
  }
  return {
    webhookUrl: '',
    botName,
    enabled: false,
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  };
}

function loadAnnouncementSettings() {
  return {
    discord: loadDestinationSettings(DISCORD_SETTINGS_FILE, 'TheRealm Parser'),
    haven: loadDestinationSettings(HAVEN_SETTINGS_FILE, 'TheRealm Parser'),
  };
}

function hasEnabledDestination(settings) {
  return (
    (settings.discord.enabled && settings.discord.webhookUrl) ||
    (settings.haven.enabled && settings.haven.webhookUrl)
  );
}

async function dispatchEmbed(settings, embed) {
  const result = { discord: 'skipped', haven: 'skipped', errors: [] };
  const havenContent = embedToMarkdown(embed);

  if (settings.discord.enabled && settings.discord.webhookUrl) {
    try {
      const webhook = new DiscordWebhook(settings.discord.webhookUrl);
      await webhook.sendMessage('', { embed, username: settings.discord.botName });
      result.discord = 'sent';
    } catch (error) {
      result.discord = 'failed';
      result.errors.push(`Discord: ${error.message}`);
    }
  }

  if (settings.haven.enabled && settings.haven.webhookUrl) {
    try {
      const webhook = new HavenWebhook(settings.haven.webhookUrl);
      await webhook.sendMessage(havenContent, { username: settings.haven.botName });
      result.haven = 'sent';
    } catch (error) {
      result.haven = 'failed';
      result.errors.push(`Haven: ${error.message}`);
    }
  }

  return result;
}

async function dispatchSessionComplete(sessionData, sessionId, settings = loadAnnouncementSettings()) {
  if (!hasEnabledDestination(settings)) {
    return { discord: 'skipped', haven: 'skipped', errors: [] };
  }

  const baseUrl = settings.discord.baseUrl || settings.haven.baseUrl || 'http://localhost:3000';
  const mainTitle = sessionData.name || sessionId;
  const subtitle = `${sessionData.finalDay || 'Unknown'} • ${sessionData.totalBattles || sessionData.battles || 0} battles • ${sessionData.totalActions || 0} actions`;
  const characterInfo = `${sessionData.characters || 0} Characters, ${sessionData.playerList || 'Unknown'}`;

  let highestScoreInfo = '';
  if (sessionData.highestCharacter && sessionData.highestPlayer) {
    highestScoreInfo = `Highest Score: **${sessionData.highestCharacter}** (${sessionData.highestPlayer}) - ${sessionData.highestScore || 0} points`;
  }

  const embed = {
    title: mainTitle,
    description: `${subtitle}\n${characterInfo}\n${highestScoreInfo}`.trim(),
    color: 0x00ff00,
    url: `${baseUrl}/session/${sessionId}`,
    timestamp: new Date().toISOString(),
    footer: { text: 'Click to view session details' },
  };

  return dispatchEmbed(settings, embed);
}

async function dispatchProcessingStart(sessionName, settings = loadAnnouncementSettings()) {
  if (!hasEnabledDestination(settings)) return { discord: 'skipped', haven: 'skipped', errors: [] };

  const embed = {
    title: 'Processing Started',
    description: `Starting to parse session: **${sessionName}**`,
    color: 0xffff00,
    timestamp: new Date().toISOString(),
    footer: { text: 'Magic Realm Session Parser' },
  };

  return dispatchEmbed(settings, embed);
}

async function dispatchProcessingError(sessionName, error, settings = loadAnnouncementSettings()) {
  if (!hasEnabledDestination(settings)) return { discord: 'skipped', haven: 'skipped', errors: [] };

  const embed = {
    title: 'Processing Error',
    description: `Failed to parse session: **${sessionName}**`,
    color: 0xff0000,
    fields: [{ name: 'Error', value: error.message || 'Unknown error', inline: false }],
    timestamp: new Date().toISOString(),
    footer: { text: 'Magic Realm Session Parser' },
  };

  return dispatchEmbed(settings, embed);
}

async function dispatchBatchSummary(results, settings = loadAnnouncementSettings()) {
  if (!hasEnabledDestination(settings)) return { discord: 'skipped', haven: 'skipped', errors: [] };

  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  const total = results.length;

  const embed = {
    title: 'Batch Processing Complete',
    color: failed > 0 ? 0xff8800 : 0x00ff00,
    fields: [
      { name: 'Total Sessions', value: total.toString(), inline: true },
      { name: 'Successful', value: successful.toString(), inline: true },
      { name: 'Failed', value: failed.toString(), inline: true },
    ],
    timestamp: new Date().toISOString(),
    footer: { text: 'Magic Realm Session Parser' },
  };

  if (failed > 0) {
    const failedSessions = results.filter((r) => !r.success).map((r) => r.sessionName).join(', ');
    embed.fields.push({
      name: 'Failed Sessions',
      value: failedSessions.length > 1024 ? `${failedSessions.substring(0, 1021)}...` : failedSessions,
      inline: false,
    });
  }

  return dispatchEmbed(settings, embed);
}

module.exports = {
  loadAnnouncementSettings,
  hasEnabledDestination,
  dispatchEmbed,
  dispatchSessionComplete,
  dispatchProcessingStart,
  dispatchProcessingError,
  dispatchBatchSummary,
};
