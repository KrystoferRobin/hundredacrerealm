import { getChitImageCandidates, type MapChitLocation } from '@/lib/map-assets';

export interface MonsterThisAttributes {
  icon_type?: string;
  icon_folder?: string;
  icon_type_alt?: string;
  icon_folder_alt?: string;
  part?: string;
  [key: string]: string | undefined;
}

export interface MonsterRecord {
  id: string;
  name: string;
  attributeBlocks: {
    this: MonsterThisAttributes & {
      fame?: string;
      notoriety?: string;
      base_price?: string;
      vulnerability?: string;
      armored?: string;
    };
    light?: Record<string, string>;
    dark?: Record<string, string>;
    intact?: Record<string, string>;
    damaged?: Record<string, string>;
  };
  parts?: MonsterRecord[];
}

function monsterFolder(t: MonsterThisAttributes): string {
  if (t.icon_folder && !t.icon_folder.startsWith('wesnoth')) {
    return t.icon_folder.replace(/_c$/, '');
  }
  return 'monsters';
}

export function monsterRecordToChitLocation(record: MonsterRecord): MapChitLocation {
  const t = record.attributeBlocks.this;
  const isPart = t.part !== undefined;
  return {
    id: record.id,
    name: record.name,
    type: isPart ? 'monster' : 'monster',
    tile: '',
    clearing: null,
    icon_type: t.icon_type,
    icon_folder: t.icon_folder || monsterFolder(t),
    icon_type_alt: t.icon_type_alt,
    icon_folder_alt: t.icon_folder_alt,
  };
}

function wesnothMonsterCandidates(t: MonsterThisAttributes): string[] {
  if (!t.icon_type || !t.icon_folder?.startsWith('wesnoth')) return [];
  const type = t.icon_type;
  const folder = monsterFolder(t);
  return [
    `/images/map/alternative/${folder}/${type}.png`,
    `/images/map/alternative/monsters/${type}.png`,
    `/images/map/alternative/monsters1/${type}.png`,
    `/images/map/alternative/monsters2/${type}.png`,
  ];
}

export function getMonsterAlternativeImageCandidates(record: MonsterRecord): string[] {
  const t = record.attributeBlocks.this;
  const seen = new Set<string>();
  const out: string[] = [];
  const add = (url: string) => {
    if (!seen.has(url)) {
      seen.add(url);
      out.push(url);
    }
  };

  for (const url of wesnothMonsterCandidates(t)) add(url);
  for (const url of getChitImageCandidates(monsterRecordToChitLocation(record), 'alternative')) {
    add(url);
  }

  return out;
}

/** Resolve light/dark or intact/damaged side stats for parts. */
export function getMonsterSideData(
  record: MonsterRecord,
  side: 'light' | 'dark'
): Record<string, string> | undefined {
  const blocks = record.attributeBlocks;
  if (blocks[side]) return blocks[side];
  if (side === 'light' && blocks.intact) return blocks.intact;
  if (side === 'dark' && blocks.damaged) return blocks.damaged;
  return undefined;
}

export function isMonsterPart(record: MonsterRecord): boolean {
  return record.attributeBlocks.this.part !== undefined;
}
