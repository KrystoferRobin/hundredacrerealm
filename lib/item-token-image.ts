import { lookupAlternativeIcon } from '@/lib/chit-alternative-lookup';
import { getChitImageCandidates, type MapChitLocation } from '@/lib/map-assets';
import type { ItemRecord } from '@/lib/item-chit';

export function itemRecordToChitLocation(item: ItemRecord): MapChitLocation {
  const t = item.attributeBlocks.this;
  const folder = t?.icon_folder || 'treasure';
  return {
    id: item.id || item.name,
    name: item.name,
    type: 'treasure',
    tile: '',
    clearing: null,
    icon_type: t?.icon_type,
    icon_folder: folder,
    icon_type_alt: t?.icon_type_alt,
    icon_folder_alt: t?.icon_folder_alt,
    horse: t?.horse,
  };
}

export function getItemImageCandidates(item: ItemRecord): string[] {
  const t = item.attributeBlocks.this;
  const seen = new Set<string>();
  const out: string[] = [];
  const add = (url: string) => {
    if (!seen.has(url)) {
      seen.add(url);
      out.push(url);
    }
  };

  const loc = itemRecordToChitLocation(item);

  if (t?.icon_type_alt && t?.icon_folder_alt) {
    const alt = lookupAlternativeIcon(loc);
    if (alt) {
      add(`/images/map/alternative/${alt.icon_folder}/${alt.icon_type_alt}.png`);
      add(`/images/map/alternative/${alt.icon_folder}/${alt.icon_type_alt}.gif`);
    }
  }

  if (t?.icon_type && t?.icon_folder) {
    const folder = t.icon_folder.replace(/_c$/, '').replace(/^wesnoth\//, '');
    if (!folder.startsWith('wesnoth')) {
      for (const base of ['alternative', 'classic', 'color']) {
        add(`/images/map/${base}/${folder}/${t.icon_type}.png`);
        add(`/images/map/${base}/${folder}/${t.icon_type}.gif`);
      }
    }
  }

  if (t?.icon_folder?.startsWith('wesnoth') && t?.icon_type) {
    const type = t.icon_type;
    add(`/images/map/alternative/steed/${type}.png`);
    add(`/images/map/alternative/natives/${type}.png`);
    add(`/images/map/classic/steed/${type}.gif`);
  }

  for (const url of getChitImageCandidates(loc, 'alternative')) add(url);
  for (const url of getChitImageCandidates(loc, 'classic')) add(url);

  return out;
}
