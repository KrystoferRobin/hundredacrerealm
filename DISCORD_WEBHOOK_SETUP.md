# Discord Webhook Integration Setup

This guide explains how to set up Discord webhook notifications for your Magic Realm session parser.

## What Discord Webhooks Do

Discord webhooks allow your application to send messages directly to a Discord channel. For this project, they provide:

- **Session Completion Notifications**: When a game session finishes parsing, you'll get a Discord message with a direct link to view the session
- **Processing Status Updates**: Notifications when parsing starts, completes, or encounters errors
- **Batch Processing Summaries**: When processing multiple sessions, you'll get a summary of results
- **Statistics Updates**: Periodic updates about your game session statistics

## Setup Instructions

### 1. Create a Discord Webhook

1. **Open Discord** and navigate to your server
2. **Go to Server Settings** → **Integrations** → **Webhooks**
3. **Click "New Webhook"**
4. **Configure the webhook**:
   - **Name**: "Magic Realm Parser" (or whatever you prefer)
   - **Channel**: Choose the channel where you want notifications
   - **Avatar**: Optionally set a custom avatar
5. **Copy the Webhook URL** (it looks like: `https://discord.com/api/webhooks/123456789/abcdef...`)

### 2. Set Environment Variables

You need to set the webhook URL as an environment variable. Choose one of these methods:

#### Option A: Local Development (.env file)
Create a `.env` file in your project root:
```bash
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_URL_HERE
BASE_URL=http://localhost:3000
```

#### Option B: Docker Environment
If you're using Docker, add to your `docker-compose.yml`:
```yaml
environment:
  - DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_URL_HERE
  - BASE_URL=https://your-domain.com
```

#### Option C: Direct Environment Variable
```bash
export DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/YOUR_WEBHOOK_URL_HERE"
export BASE_URL="http://localhost:3000"
```

### 3. Test the Webhook

Run the test script to verify everything works:

```bash
node scripts/test_discord_webhook.js
```

You should see 6 test messages appear in your Discord channel.

## Usage

### Using the Enhanced Processing Script

Instead of the regular `process_all_sessions.js`, use the webhook-enabled version:

```bash
node scripts/process_all_sessions_with_webhooks.js
```

This will send notifications for:
- When processing starts
- When each session completes (with a direct link)
- If any errors occur
- A summary when batch processing finishes

### Manual Webhook Usage

You can also use the webhook functions in your own scripts:

```javascript
const { getWebhook } = require('./scripts/discord_webhook');

const webhook = getWebhook();

// Send a simple message
await webhook.sendMessage('Hello from Magic Realm!');

// Send session completion notification
await webhook.sendSessionComplete(sessionData, sessionId, baseUrl);

// Send error notification
await webhook.sendProcessingError(sessionName, error);
```

## Notification Types

### 1. Session Completion Notification
```
🎮 New Game Session Parsed!
Session: The Great Adventure
Players: 3 players
Characters: 4 characters
Duration: 2m15d
Battles: 12 battles
Actions: 156 actions
[Click to view session]
```

### 2. Processing Start Notification
```
🔄 Processing Started
Starting to parse session: **SessionName**
```

### 3. Error Notification
```
❌ Processing Error
Failed to parse session: **SessionName**
Error: [Error details]
```

### 4. Batch Processing Summary
```
📊 Batch Processing Complete
Total Sessions: 5
Successful: 4
Failed: 1
Failed Sessions: Session3
```

### 5. Statistics Update
```
📈 Statistics Update
Total Sessions: 150
Total Players: 25
Total Characters: 45
Total Battles: 1200
Total Actions: 5000
```

## Customization

### Changing the Bot Name and Avatar

Edit `scripts/discord_webhook.js` and modify these lines:

```javascript
username: options.username || 'Magic Realm Parser',
avatar_url: options.avatar_url || 'https://i.imgur.com/example.png'
```

### Customizing Message Colors

The webhook uses different colors for different message types:
- 🟢 Green (0x00ff00): Success/completion
- 🟡 Yellow (0xffff00): Processing/start
- 🔴 Red (0xff0000): Errors
- 🟠 Orange (0xff8800): Warnings
- 🔵 Blue (0x0099ff): Statistics

### Adding Custom Notifications

You can add new notification types by creating new methods in the `DiscordWebhook` class:

```javascript
async sendCustomNotification(data) {
  const embed = {
    title: 'Custom Title',
    description: 'Custom description',
    color: 0x00ff00,
    fields: [
      {
        name: 'Field Name',
        value: 'Field Value',
        inline: true
      }
    ]
  };
  
  return this.sendMessage('', { embed });
}
```

## Troubleshooting

### Webhook Not Working

1. **Check the URL**: Make sure the webhook URL is correct and complete
2. **Test the webhook**: Run `node scripts/test_discord_webhook.js`
3. **Check permissions**: Ensure the webhook has permission to post in the channel
4. **Check environment variables**: Verify `DISCORD_WEBHOOK_URL` is set correctly

### Missing Notifications

1. **Check console output**: Look for "Discord webhook not configured" messages
2. **Verify environment**: Make sure the environment variable is loaded
3. **Check network**: Ensure your server can reach Discord's API

### Rate Limiting

Discord has rate limits on webhooks. If you're processing many sessions quickly, you might hit these limits. The webhook will automatically handle rate limiting, but you may see some delays.

## Security Notes

- **Keep your webhook URL private**: Don't commit it to version control
- **Use environment variables**: Always use environment variables for sensitive data
- **Monitor usage**: Check your Discord channel regularly to ensure notifications are working as expected

## Advanced Features

### Conditional Notifications

You can modify the scripts to only send notifications for certain conditions:

```javascript
// Only notify for sessions with more than 10 battles
if (sessionData.totalBattles > 10) {
  await webhook.sendSessionComplete(sessionData, sessionId, baseUrl);
}
```

### Custom Message Templates

You can create custom message templates for different types of sessions:

```javascript
async sendEpicSessionNotification(sessionData, sessionId) {
  const embed = {
    title: '🏆 Epic Session Completed!',
    description: 'This was an amazing game!',
    color: 0xffd700, // Gold color
    // ... rest of embed
  };
  
  return this.sendMessage('', { embed });
}
```

## Support

If you encounter issues with the Discord webhook integration:

1. Check the console output for error messages
2. Verify your webhook URL is correct
3. Test with the test script first
4. Check Discord's webhook documentation for any API changes 