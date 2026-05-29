import { getChitImageCandidates, type MapChitLocation } from '@/lib/map-assets';

/** `this` block fields from coregamedata native JSON. */
export interface NativeThisAttributes {
  native?: string;
  icon_type?: string;
  icon_folder?: string;
  icon_type_alt?: string;
  icon_folder_alt?: string;
  icon_type_rider?: string;
  icon_folder_chit?: string;
  [key: string]: string | undefined;
}

export interface NativeRecord {
  id: string;
  name: string;
  attributeBlocks: {
    this: NativeThisAttributes;
    light: Record<string, string>;
    dark: Record<string, string>;
  };
}

/** Map a coregamedata native record to map chit resolution (alternative art). */
export function nativeRecordToChitLocation(native: NativeRecord): MapChitLocation {
  const t = native.attributeBlocks.this;
  return {
    id: native.id,
    name: native.name,
    type: 'native',
    tile: '',
    clearing: null,
    native: t.native,
    icon_type: t.icon_type,
    icon_folder: t.icon_folder,
    icon_type_alt: t.icon_type_alt,
    icon_folder_alt: t.icon_folder_alt,
  };
}

function wesnothFolderCandidates(t: NativeThisAttributes): string[] {
  if (!t.icon_type || !t.icon_folder?.startsWith('wesnoth')) return [];
  const type = t.icon_type;
  return [
    `/images/map/alternative/natives/${type}.png`,
    `/images/map/alternative/natives2/${type}.png`,
  ];
}

export function getNativeAlternativeImageCandidates(native: NativeRecord): string[] {
  const t = native.attributeBlocks.this;
  const seen = new Set<string>();
  const out: string[] = [];
  const add = (url: string) => {
    if (!seen.has(url)) {
      seen.add(url);
      out.push(url);
    }
  };

  for (const url of wesnothFolderCandidates(t)) add(url);
  for (const url of getChitImageCandidates(nativeRecordToChitLocation(native), 'alternative')) {
    add(url);
  }

  return out;
}

export function getNativeAlternativeImageUrl(native: NativeRecord): string | null {
  const candidates = getNativeAlternativeImageCandidates(native);
  return candidates[0] ?? null;
}

/** RealmSpeak-style native id label (e.g. Order 3 → O3). */
export function getNativeChitIdLabel(native: NativeRecord): string {
  const group = native.attributeBlocks.this.native || native.name.split(/\s+/)[0] || '?';
  const letter = group.charAt(0).toUpperCase();
  const name = native.name;
  if (/\bHQ\b/i.test(name)) return `${letter}HQ`;
  const numMatch = name.match(/(\d+)\s*$/);
  return numMatch ? `${letter}${numMatch[1]}` : letter;
}
