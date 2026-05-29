/** Shared item counter classification and helpers (RealmSpeak chit layout). */

export interface ItemRecord {
  id?: string;
  name: string;
  attributeBlocks: Record<string, Record<string, string>>;
}

export type ItemChitKind = 'armor' | 'weapon' | 'horse' | 'treasure' | 'spell';

export const ITEM_CHIT_PX = 72;

export function getChitColor(colorName: string): string {
  const colorMap: Record<string, string> = {
    lightorange: '#FFB366',
    red: '#FF4444',
    blue: '#4444FF',
    green: '#44FF44',
    yellow: '#FFFF44',
    purple: '#FF44FF',
    brown: '#8B4513',
    grey: '#888888',
    gray: '#888888',
    white: '#FFFFFF',
    black: '#000000',
    lightgreen: '#90EE90',
    forestgreen: '#228B22',
    gold: '#FFD700',
    orange: '#FFA500',
    lightblue: '#ADD8E6',
    tan: '#D2B48C',
    pink: '#FFB6C1',
  };
  return colorMap[colorName] || '#FFFFFF';
}

export function classifyItemChitKind(item: ItemRecord): ItemChitKind {
  const blocks = item.attributeBlocks;
  const t = blocks.this;
  if (t?.spell) return 'spell';
  if (blocks.intact && blocks.damaged) return 'armor';
  if (blocks.unalerted && blocks.alerted) return 'weapon';
  if (t?.horse && blocks.trot && blocks.gallop) return 'horse';
  return 'treasure';
}

/** Special ability text shown below the counter (not on the chit). */
export function getItemSpecialAbilityText(item: ItemRecord): string | null {
  const t = item.attributeBlocks.this;
  if (!t) return null;

  const text = (t.text || '').trim();
  if (!text) return null;

  if (classifyItemChitKind(item) === 'spell') return null;

  return text;
}

export function isArmoredItem(item: ItemRecord): boolean {
  const armored = item.attributeBlocks.this?.armored;
  return armored !== undefined && armored !== '';
}

export function isLargeTreasure(item: ItemRecord): boolean {
  const treasure = item.attributeBlocks.this?.treasure;
  return treasure === 'large' || treasure === 'great';
}
