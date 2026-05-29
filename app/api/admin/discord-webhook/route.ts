import { NextRequest, NextResponse } from 'next/server';
import { buildNotification, getAllSessions } from '@/lib/announcements/build-notification';
import { dispatchAnnouncement, summarizeDispatchResult } from '@/lib/announcements/dispatch';
import {
  hasEnabledDestination,
  loadAnnouncementSettings,
  saveDiscordSettings,
  saveHavenSettings,
} from '@/lib/announcements/settings';
import type { NotificationRequest, WebhookDestinationSettings } from '@/lib/announcements/types';

export async function GET() {
  try {
    const settings = loadAnnouncementSettings();
    const sessions = getAllSessions();

    return NextResponse.json({
      settings: settings.discord,
      discord: settings.discord,
      haven: settings.haven,
      sessions: sessions.slice(0, 50),
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
      case 'update-discord-settings': {
        const settings = data as WebhookDestinationSettings;
        saveDiscordSettings(settings);
        return NextResponse.json({ success: true, message: 'Discord settings updated' });
      }

      case 'update-haven-settings': {
        const settings = data as WebhookDestinationSettings;
        saveHavenSettings(settings);
        return NextResponse.json({ success: true, message: 'Haven settings updated' });
      }

      case 'send-notification': {
        const notificationRequest = data as NotificationRequest;
        const settings = loadAnnouncementSettings();

        if (!hasEnabledDestination(settings)) {
          return NextResponse.json(
            { error: 'No webhook destinations configured or enabled' },
            { status: 400 }
          );
        }

        const notification = buildNotification(notificationRequest, settings);
        if (!notification) {
          return NextResponse.json({ error: 'Unable to build notification' }, { status: 400 });
        }

        const result = await dispatchAnnouncement(notification, settings);
        const sentSomewhere = result.discord === 'sent' || result.haven === 'sent';

        if (!sentSomewhere) {
          return NextResponse.json(
            { error: summarizeDispatchResult(result), result },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          message: summarizeDispatchResult(result),
          result,
        });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in POST /api/admin/discord-webhook:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
