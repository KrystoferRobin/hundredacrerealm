import type { CounterGraphicsStyle } from '@/lib/map-graphics-styles';

const IMAGE_EXT = /\.(gif|png|jpe?g)$/i;

/** Guess RealmSpeak icon_type from display name (e.g. "White Knight" → white_knight). */
export function characterIconTypeKey(characterName: string): string {
  return characterName.trim().toLowerCase().replace(/\s+/g, '_');
}

function withExt(base: string, ext: '.gif' | '.png'): string {
  return IMAGE_EXT.test(base) ? base : `${base}${ext}`;
}

/**
 * Candidate URLs for a character token on the map (first loadable wins).
 * Falls back to charsymbol PNGs for classic.
 */
export function getCharacterMapIconCandidates(
  characterName: string,
  style: CounterGraphicsStyle,
  options?: { hidden?: boolean; iconType?: string | null }
): string[] {
  const iconType = (options?.iconType?.trim() || characterIconTypeKey(characterName)).toLowerCase();
  const hiddenSuffix = options?.hidden ? '_h' : '';
  const candidates: string[] = [];
  const seen = new Set<string>();

  const add = (url: string) => {
    if (!seen.has(url)) {
      seen.add(url);
      candidates.push(url);
    }
  };

  const symbolName = `${characterName.trim()}_symbol.png`;

  switch (style) {
    case 'legendary':
      add(`/images/characters/legendary/${withExt(`${iconType}${hiddenSuffix}`, '.png')}`);
      add(`/images/characters/legendary/${withExt(iconType, '.png')}`);
      break;
    case 'legendary-classic':
      add(
        `/images/characters/legendary-classic/${withExt(`${iconType}${hiddenSuffix}`, '.png')}`
      );
      add(`/images/characters/legendary-classic/${withExt(iconType, '.png')}`);
      break;
    case 'alternative':
      add(`/images/characters/legendary/${withExt(`${iconType}${hiddenSuffix}`, '.png')}`);
      break;
    case 'classic':
    default:
      break;
  }

  add(`/images/charsymbol/${symbolName}`);
  add(`/images/characters/classic/${withExt(iconType, '.gif')}`);
  add(`/images/characters/classic/${withExt(iconType, '.png')}`);

  return candidates;
}

export function getCharacterMapIconUrl(
  characterName: string,
  style: CounterGraphicsStyle,
  options?: { hidden?: boolean; iconType?: string | null }
): string {
  return getCharacterMapIconCandidates(characterName, style, options)[0] ?? '';
}
