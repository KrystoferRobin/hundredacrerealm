const https = require('https');
const url = require('url');

class DiscordWebhook {
  constructor(webhookUrl) {
    this.webhookUrl = webhookUrl;
  }

  async sendMessage(content, options = {}) {
    if (!this.webhookUrl) {
      console.log('Discord webhook not configured, skipping notification');
      return;
    }

    const message = {
      content: options.content || content,
      embeds: options.embeds || [],
      username: options.username || 'Magic Realm Parser',
      avatar_url: options.avatar_url || 'https://i.imgur.com/example.png' // You can set a custom avatar
    };

    if (options.embed) {
      message.embeds.push(options.embed);
    }

    return new Promise((resolve, reject) => {
      const parsedUrl = url.parse(this.webhookUrl);
      const postData = JSON.stringify(message);

      const options = {
        hostname: parsedUrl.hostname,
        port: 443,
        path: parsedUrl.path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log('Discord notification sent successfully');
            resolve(data);
          } else {
            console.error('Discord webhook error:', res.statusCode, data);
            reject(new Error(`Discord webhook failed: ${res.statusCode}`));
          }
        });
      });

      req.on('error', (error) => {
        console.error('Discord webhook request error:', error);
        reject(error);
      });

      req.write(postData);
      req.end();
    });
  }

  // Send session completion notification
  async sendSessionComplete(sessionData, sessionId, baseUrl = 'http://localhost:3000') {
    // Create main title and subtitle
    const mainTitle = sessionData.name || sessionId;
    const subtitle = `${sessionData.finalDay || 'Unknown'} • ${sessionData.battles || 0} battles • ${sessionData.totalActions || 0} actions`;
    
    // Create character and player info
    const characterInfo = `${sessionData.characters || 0} Characters, ${sessionData.playerList || 'Unknown'}`;
    
    // Create highest scoring character info
    let highestScoreInfo = '';
    if (sessionData.highestCharacter && sessionData.highestPlayer) {
      highestScoreInfo = `Highest Score: **${sessionData.highestCharacter}** (${sessionData.highestPlayer}) - ${sessionData.highestScore || 0} points`;
    }
    
    // Create the embed
    const embed = {
      title: mainTitle,
      description: `${subtitle}\n${characterInfo}\n${highestScoreInfo}`,
      color: 0x00ff00, // Green
      url: `${baseUrl}/session/${sessionId}`,
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Click to view session details'
      }
    };

    return this.sendMessage('', { embed });
  }

  // Send processing start notification
  async sendProcessingStart(sessionName) {
    const embed = {
      title: '🔄 Processing Started',
      description: `Starting to parse session: **${sessionName}**`,
      color: 0xffff00, // Yellow
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Magic Realm Session Parser'
      }
    };

    return this.sendMessage('', { embed });
  }

  // Send processing error notification
  async sendProcessingError(sessionName, error) {
    const embed = {
      title: '❌ Processing Error',
      description: `Failed to parse session: **${sessionName}**`,
      color: 0xff0000, // Red
      fields: [
        {
          name: 'Error',
          value: error.message || 'Unknown error',
          inline: false
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Magic Realm Session Parser'
      }
    };

    return this.sendMessage('', { embed });
  }

  // Send batch processing summary
  async sendBatchSummary(results) {
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const total = results.length;

    const embed = {
      title: '📊 Batch Processing Complete',
      color: failed > 0 ? 0xff8800 : 0x00ff00, // Orange if errors, green if all success
      fields: [
        {
          name: 'Total Sessions',
          value: total.toString(),
          inline: true
        },
        {
          name: 'Successful',
          value: successful.toString(),
          inline: true
        },
        {
          name: 'Failed',
          value: failed.toString(),
          inline: true
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Magic Realm Session Parser'
      }
    };

    if (failed > 0) {
      const failedSessions = results.filter(r => !r.success).map(r => r.sessionName).join(', ');
      embed.fields.push({
        name: 'Failed Sessions',
        value: failedSessions.length > 1024 ? failedSessions.substring(0, 1021) + '...' : failedSessions,
        inline: false
      });
    }

    return this.sendMessage('', { embed });
  }

  // Send statistics update
  async sendStatsUpdate(stats) {
    const embed = {
      title: '📈 Statistics Update',
      color: 0x0099ff, // Blue
      fields: [
        {
          name: 'Total Sessions',
          value: stats.totalSessions?.toString() || '0',
          inline: true
        },
        {
          name: 'Total Players',
          value: stats.totalPlayers?.toString() || '0',
          inline: true
        },
        {
          name: 'Total Characters',
          value: stats.totalCharacters?.toString() || '0',
          inline: true
        },
        {
          name: 'Total Battles',
          value: stats.totalBattles?.toString() || '0',
          inline: true
        },
        {
          name: 'Total Actions',
          value: stats.totalActions?.toString() || '0',
          inline: true
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Magic Realm Session Parser'
      }
    };

    return this.sendMessage('', { embed });
  }
}

// Create a singleton instance
let webhookInstance = null;

function getWebhook() {
  if (!webhookInstance) {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    webhookInstance = new DiscordWebhook(webhookUrl);
  }
  return webhookInstance;
}

module.exports = {
  DiscordWebhook,
  getWebhook
}; 