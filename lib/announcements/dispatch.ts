import { DiscordWebhook } from '../../scripts/discord_webhook';
import { HavenWebhook } from '../../scripts/haven_webhook';
import type { AnnouncementSettings, BuiltNotification, DispatchResult } from './types';

export async function dispatchAnnouncement(
  notification: BuiltNotification,
  settings: AnnouncementSettings
): Promise<DispatchResult> {
  const result: DispatchResult = {
    discord: 'skipped',
    haven: 'skipped',
    errors: [],
  };

  if (settings.discord.enabled && settings.discord.webhookUrl) {
    try {
      const webhook = new DiscordWebhook(settings.discord.webhookUrl);
      await webhook.sendMessage('', {
        embed: notification.discordEmbed,
        username: settings.discord.botName,
      });
      result.discord = 'sent';
    } catch (error) {
      result.discord = 'failed';
      result.errors.push(
        `Discord: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  if (settings.haven.enabled && settings.haven.webhookUrl) {
    try {
      const webhook = new HavenWebhook(settings.haven.webhookUrl);
      await webhook.sendMessage(notification.havenContent, {
        username: settings.haven.botName,
      });
      result.haven = 'sent';
    } catch (error) {
      result.haven = 'failed';
      result.errors.push(
        `Haven: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  return result;
}

export function summarizeDispatchResult(result: DispatchResult): string {
  const sent: string[] = [];
  if (result.discord === 'sent') sent.push('Discord');
  if (result.haven === 'sent') sent.push('Haven');

  if (sent.length === 0 && result.errors.length > 0) {
    return result.errors.join('; ');
  }

  if (result.errors.length > 0) {
    return `Sent to ${sent.join(' and ') || 'no destinations'} with errors: ${result.errors.join('; ')}`;
  }

  return sent.length > 0
    ? `Notification sent to ${sent.join(' and ')}`
    : 'No destinations were configured';
}
