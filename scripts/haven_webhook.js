const https = require('https');
const http = require('http');
const url = require('url');

function embedToMarkdown(embed) {
  if (!embed) return '';

  const lines = [];
  if (embed.title) {
    lines.push(`**${embed.title}**`);
  }
  if (embed.description) {
    lines.push(embed.description);
  }
  if (embed.fields?.length) {
    for (const field of embed.fields) {
      lines.push(`**${field.name}:** ${field.value}`);
    }
  }
  if (embed.url) {
    lines.push(embed.url);
  }
  if (embed.footer?.text) {
    lines.push(`_${embed.footer.text}_`);
  }
  return lines.join('\n').trim();
}

class HavenWebhook {
  constructor(webhookUrl) {
    this.webhookUrl = webhookUrl;
  }

  async sendMessage(content, options = {}) {
    if (!this.webhookUrl) {
      console.log('Haven webhook not configured, skipping notification');
      return;
    }

    const text = (options.content || content || '').trim();
    if (!text) {
      console.log('Haven webhook message empty, skipping notification');
      return;
    }

    const message = {
      content: text.slice(0, 4000),
      username: options.username || 'Magic Realm Parser',
    };

    if (options.avatar_url) {
      message.avatar_url = options.avatar_url;
    }

    return new Promise((resolve, reject) => {
      const parsedUrl = url.parse(this.webhookUrl);
      const postData = JSON.stringify(message);
      const transport = parsedUrl.protocol === 'http:' ? http : https;

      const requestOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'http:' ? 80 : 443),
        path: parsedUrl.path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      const req = transport.request(requestOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log('Haven notification sent successfully');
            resolve(data);
          } else {
            console.error('Haven webhook error:', res.statusCode, data);
            reject(new Error(`Haven webhook failed: ${res.statusCode}`));
          }
        });
      });

      req.on('error', (error) => {
        console.error('Haven webhook request error:', error);
        reject(error);
      });

      req.write(postData);
      req.end();
    });
  }

  async sendSessionComplete(sessionData, sessionId, baseUrl = 'http://localhost:3000', options = {}) {
    const mainTitle = sessionData.name || sessionId;
    const subtitle = `${sessionData.finalDay || 'Unknown'} • ${sessionData.battles || sessionData.totalBattles || 0} battles • ${sessionData.totalActions || 0} actions`;
    const characterInfo = `${sessionData.characters || 0} Characters, ${sessionData.playerList || 'Unknown'}`;

    let highestScoreInfo = '';
    if (sessionData.highestCharacter && sessionData.highestPlayer) {
      highestScoreInfo = `Highest Score: **${sessionData.highestCharacter}** (${sessionData.highestPlayer}) - ${sessionData.highestScore || 0} points`;
    }

    const embed = {
      title: mainTitle,
      description: `${subtitle}\n${characterInfo}\n${highestScoreInfo}`.trim(),
      url: `${baseUrl}/session/${sessionId}`,
      footer: { text: 'Click to view session details' },
    };

    return this.sendMessage(embedToMarkdown(embed), options);
  }

  async sendProcessingStart(sessionName, options = {}) {
    const embed = {
      title: 'Processing Started',
      description: `Starting to parse session: **${sessionName}**`,
      footer: { text: 'Magic Realm Session Parser' },
    };
    return this.sendMessage(embedToMarkdown(embed), options);
  }

  async sendProcessingError(sessionName, error, options = {}) {
    const embed = {
      title: 'Processing Error',
      description: `Failed to parse session: **${sessionName}**`,
      fields: [{ name: 'Error', value: error.message || 'Unknown error', inline: false }],
      footer: { text: 'Magic Realm Session Parser' },
    };
    return this.sendMessage(embedToMarkdown(embed), options);
  }

  async sendBatchSummary(results, options = {}) {
    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    const total = results.length;

    const fields = [
      { name: 'Total Sessions', value: total.toString(), inline: true },
      { name: 'Successful', value: successful.toString(), inline: true },
      { name: 'Failed', value: failed.toString(), inline: true },
    ];

    if (failed > 0) {
      const failedSessions = results
        .filter((r) => !r.success)
        .map((r) => r.sessionName)
        .join(', ');
      fields.push({
        name: 'Failed Sessions',
        value:
          failedSessions.length > 1024
            ? `${failedSessions.substring(0, 1021)}...`
            : failedSessions,
        inline: false,
      });
    }

    const embed = {
      title: 'Batch Processing Complete',
      fields,
      footer: { text: 'Magic Realm Session Parser' },
    };

    return this.sendMessage(embedToMarkdown(embed), options);
  }

  async sendStatsUpdate(stats, options = {}) {
    const embed = {
      title: 'Statistics Update',
      fields: [
        { name: 'Total Sessions', value: stats.totalSessions?.toString() || '0', inline: true },
        { name: 'Total Players', value: stats.totalPlayers?.toString() || '0', inline: true },
        { name: 'Total Characters', value: stats.totalCharacters?.toString() || '0', inline: true },
        { name: 'Total Battles', value: stats.totalBattles?.toString() || '0', inline: true },
        { name: 'Total Actions', value: stats.totalActions?.toString() || '0', inline: true },
      ],
      footer: { text: 'Magic Realm Session Parser' },
    };

    return this.sendMessage(embedToMarkdown(embed), options);
  }
}

let webhookInstance = null;

function getWebhook() {
  if (!webhookInstance) {
    const webhookUrl = process.env.HAVEN_WEBHOOK_URL;
    webhookInstance = new HavenWebhook(webhookUrl);
  }
  return webhookInstance;
}

module.exports = {
  HavenWebhook,
  getWebhook,
  embedToMarkdown,
};
