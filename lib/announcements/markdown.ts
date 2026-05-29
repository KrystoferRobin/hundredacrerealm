import type { DiscordEmbed } from './types';

export function embedToMarkdown(embed: DiscordEmbed | null | undefined): string {
  if (!embed) return '';

  const lines: string[] = [];
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
