import altManifest from '@/public/data/chit-alternative-manifest.json';
import type { MapChitLocation } from '@/lib/map-assets';

function normalizeAssetFolder(folder: string): string {
  return folder.replace(/_c$/, '');
}

export interface AltIconRecord {
  icon_type_alt: string;
  icon_folder: string;
}

type AltManifest = {
  byKey: Record<string, AltIconRecord>;
  byName: Record<string, AltIconRecord>;
};

const manifest = altManifest as AltManifest;

/** Resolve Wesnoth alt icon from coregamedata manifest (save chits rarely carry _alt attrs). */
export function lookupAlternativeIcon(entry: MapChitLocation): AltIconRecord | null {
  if (entry.icon_type_alt) {
    const folder = normalizeAssetFolder(
      entry.icon_folder || entry.icon_folder_chit || 'monsters'
    );
    return {
      icon_type_alt: entry.icon_type_alt,
      icon_folder: folder,
    };
  }

  const byName = manifest.byName[entry.name];
  if (byName) return byName;

  const folder = normalizeAssetFolder(entry.icon_folder || entry.icon_folder_chit || '');
  const iconType = entry.icon_type_chit || entry.icon_type;
  if (folder && iconType) {
    return manifest.byKey[`${folder}:${iconType}`] ?? null;
  }

  return null;
}
