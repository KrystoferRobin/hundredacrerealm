import type { CounterGraphicsStyle, MapChitAssetSet } from '@/lib/map-graphics-styles';
import { resolveMapChitAssetSet } from '@/lib/map-graphics-styles';
import { lookupAlternativeIcon } from '@/lib/chit-alternative-lookup';

export interface MapChitLocation {
  id: string;
  name: string;
  type: string;
  tile: string;
  clearing: string | null;
  native?: string;
  dwelling?: string;
  horse?: string;
  warning?: string;
  sound?: string;
  treasure_location?: string;
  monster?: string;
  icon_type?: string;
  icon_folder?: string;
  icon_type_chit?: string;
  icon_folder_chit?: string;
  icon_type_alt?: string;
  icon_folder_alt?: string;
}

const IMAGE_EXT = /\.(gif|png|jpe?g)$/i;
const MONSTER_FOLDERS = ['monsters', 'monsters1', 'monsters2'] as const;

/** RealmSpeak uses *_c folders; we store color assets under set `color` without _c suffix. */
export function normalizeAssetFolder(folder: string): string {
  return folder.replace(/_c$/, '');
}

function mapAssetBase(assetSet: MapChitAssetSet, folder: string): string {
  return `/images/map/${assetSet}/${normalizeAssetFolder(folder)}`;
}

function characterImageStyle(counter: CounterGraphicsStyle): string {
  switch (counter) {
    case 'legendary':
      return 'legendary';
    case 'legendary-classic':
      return 'legendary-classic';
    case 'alternative':
      return 'legendary';
    default:
      return 'classic';
  }
}

/** On-map character chits use /images/characters/, not /images/map/. */
function getCharacterChitCandidates(
  fileBase: string,
  counter: CounterGraphicsStyle
): string[] {
  const style = characterImageStyle(counter);
  const candidates: string[] = [];
  const seen = new Set<string>();
  const add = (url: string) => {
    if (!seen.has(url)) {
      seen.add(url);
      candidates.push(url);
    }
  };

  if (style === 'classic') {
    add(`/images/characters/classic/${fileBase}.gif`);
    add(`/images/characters/classic/${fileBase}.png`);
  } else {
    add(`/images/characters/${style}/${fileBase}.png`);
    add(`/images/characters/${style}/${fileBase}_h.png`);
    add(`/images/characters/classic/${fileBase}.gif`);
  }
  return candidates;
}

function assetSetUsesPng(
  assetSet: MapChitAssetSet,
  folder: string,
  fileBase: string
): boolean {
  if (assetSet === 'alternative') return true;
  if (IMAGE_EXT.test(fileBase) && /\.png$/i.test(fileBase)) return true;
  if (folder.includes('natives2')) return true;
  return false;
}

/** Extensions to try, in order (alternative art is PNG; classic/color use GIF). */
function fileExtensionsFor(
  assetSet: MapChitAssetSet,
  folder: string,
  fileBase: string
): string[] {
  if (IMAGE_EXT.test(fileBase)) return [fileBase];
  if (assetSet === 'alternative') return [`${fileBase}.png`, `${fileBase}.gif`];
  if (assetSetUsesPng(assetSet, folder, fileBase)) return [`${fileBase}.png`];
  return [`${fileBase}.gif`, `${fileBase}.png`];
}

function nativeGroupLetter(entry: MapChitLocation): string {
  return (entry.native || 'x').charAt(0).toLowerCase();
}

function steedLetter(entry: MapChitLocation): string {
  return (entry.name || 'x').charAt(0).toLowerCase();
}

function resolveStandardIconFolder(entry: MapChitLocation): string | null {
  if (entry.horse) return 'steed';
  if (entry.icon_folder_chit) return entry.icon_folder_chit;
  if (entry.icon_folder) return entry.icon_folder;
  switch (entry.type) {
    case 'dwelling':
      return 'dwellings';
    case 'native':
      return 'natives';
    case 'monster':
      return 'monsters';
    case 'treasure':
      return 'monsters';
    default:
      return null;
  }
}

function resolveIconFileBase(
  entry: MapChitLocation,
  assetSet: MapChitAssetSet,
  counter: CounterGraphicsStyle
): string | null {
  if (assetSet === 'alternative') {
    const alt = lookupAlternativeIcon(entry);
    if (alt) return alt.icon_type_alt;
  }

  if (entry.type === 'dwelling') {
    return entry.icon_type || entry.dwelling || null;
  }

  if (entry.horse) {
    const horse = entry.horse;
    if (assetSet === 'color') {
      return `${horse}_${steedLetter(entry)}`;
    }
    return horse;
  }

  const iconType = entry.icon_type_chit || entry.icon_type;
  if (!iconType) return null;

  if (entry.type === 'native') {
    const folder = normalizeAssetFolder(entry.icon_folder || 'natives');
    if (assetSet === 'color' && folder === 'natives') {
      return `${iconType}_${nativeGroupLetter(entry)}`;
    }
    return iconType;
  }

  return iconType;
}

function resolveIconFolder(
  entry: MapChitLocation,
  assetSet: MapChitAssetSet
): string | null {
  if (assetSet === 'alternative') {
    const alt = lookupAlternativeIcon(entry);
    if (alt) return alt.icon_folder;
  }
  return resolveStandardIconFolder(entry);
}

function buildAssetUrl(
  assetSet: MapChitAssetSet,
  folder: string,
  fileBase: string,
  ext?: string
): string {
  const file = ext ?? fileExtensionsFor(assetSet, folder, fileBase)[0];
  return `${mapAssetBase(assetSet, folder)}/${file}`;
}

/**
 * Candidate image URLs (first existing path wins in the UI).
 * Alternative mode uses the same folder layout as classic (`map/alternative/monsters/…`).
 */
export function getChitImageCandidates(
  entry: MapChitLocation,
  counterStyle: CounterGraphicsStyle
): string[] {
  const assetSet = resolveMapChitAssetSet(counterStyle);
  const fileBase = resolveIconFileBase(entry, assetSet, counterStyle);
  const primaryFolder = resolveIconFolder(entry, assetSet);
  if (!fileBase || !primaryFolder) return [];

  if (normalizeAssetFolder(primaryFolder) === 'characters') {
    return getCharacterChitCandidates(fileBase, counterStyle);
  }

  const candidates: string[] = [];
  const seen = new Set<string>();

  const add = (set: MapChitAssetSet, folder: string, base: string = fileBase) => {
    for (const ext of fileExtensionsFor(set, folder, base)) {
      const url = buildAssetUrl(set, folder, base, ext);
      if (!seen.has(url)) {
        seen.add(url);
        candidates.push(url);
      }
    }
  };

  add(assetSet, primaryFolder);

  const norm = normalizeAssetFolder(primaryFolder);
  if (norm === 'monsters' || entry.type === 'monster') {
    for (const folder of MONSTER_FOLDERS) {
      if (folder !== norm) add(assetSet, folder);
    }
  }

  if (assetSet === 'alternative' && !lookupAlternativeIcon(entry)) {
    const classicBase = resolveIconFileBase(entry, 'classic', 'classic');
    const classicFolder = resolveStandardIconFolder(entry);
    if (classicBase && classicFolder) {
      add('classic', classicFolder, classicBase);
    }
  }

  if (assetSet === 'color' && entry.type === 'native' && entry.icon_type && fileBase.includes('_')) {
    add('color', primaryFolder, entry.icon_type);
  }

  return candidates;
}

export function getChitImageUrl(
  entry: MapChitLocation,
  counterStyle: CounterGraphicsStyle
): string | null {
  const candidates = getChitImageCandidates(entry, counterStyle);
  return candidates[0] ?? null;
}

export function getChitFallbackLabel(entry: MapChitLocation): string {
  if (entry.warning) return entry.warning.toUpperCase();
  if (entry.sound) return entry.sound.toUpperCase();
  if (entry.treasure_location) return entry.treasure_location.slice(0, 4).toUpperCase();
  if (entry.dwelling) return entry.dwelling.slice(0, 3).toUpperCase();
  return entry.name.slice(0, 3).toUpperCase();
}

export function stackKey(item: { tile: string; clearing: string | null }): string {
  return `${item.tile}::${item.clearing ?? '_'}`;
}

export const CHIT_STACK_PRIORITY: Record<string, number> = {
  dwelling: 0,
  warning: 1,
  sound: 2,
  treasure: 3,
  monster: 4,
  native: 5,
  character: 6,
  other: 7,
};

export function sortStackItems(a: MapChitLocation, b: MapChitLocation): number {
  const pa = CHIT_STACK_PRIORITY[a.type] ?? 99;
  const pb = CHIT_STACK_PRIORITY[b.type] ?? 99;
  if (pa !== pb) return pa - pb;
  return a.name.localeCompare(b.name);
}

export function isImageFileName(name: string): boolean {
  return IMAGE_EXT.test(name);
}

export function isPopupEligible(item: MapChitLocation): boolean {
  return item.type !== 'sound' && item.type !== 'warning';
}

export function usesMapToken(
  item: MapChitLocation,
  counterStyle: CounterGraphicsStyle
): boolean {
  return getChitImageCandidates(item, counterStyle).length > 0;
}

export function fitChitLabelFontSize(label: string, diameter: number): number {
  const max = Math.max(5, Math.floor(diameter * 0.38));
  const len = label.length;
  if (len <= 2) return max;
  if (len <= 3) return Math.min(max, 9);
  if (len <= 4) return Math.min(max, 8);
  if (len <= 5) return Math.min(max, 7);
  return Math.min(max, 6);
}
