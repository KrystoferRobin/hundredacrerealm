# Data Directory

This directory contains user-specific configuration files that are not tracked in git for security reasons.

## Files that should be created here:

### `discord_webhook_settings.json`
Contains Discord webhook configuration for notifications. This file is ignored by git and should be created manually on each deployment.

Example structure:
```json
{
  "webhookUrl": "https://discord.com/api/webhooks/your-webhook-url",
  "enabled": true
}
```

### `admin-users.json`
Contains admin user configuration. This file is ignored by git and should be created manually on each deployment.

Example structure:
```json
{
  "admins": [
    {
      "username": "admin",
      "password": "hashed-password"
    }
  ]
}
```

## Security Note
These files contain sensitive information and are excluded from git tracking via `.gitignore`. Each deployment should create these files locally with appropriate configuration. 