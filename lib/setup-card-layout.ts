/** Layout helpers aligned with RealmSpeak {@code TreasureSetupCardView} section / die grouping. */

export interface SetupCardHeld {
  id?: string;
  name: string;
  attributeBlocks?: Record<string, Record<string, string>>;
  held?: SetupCardHeld[];
  heldCount?: number;
}

export interface SetupCardHolder {
  id?: string;
  name: string;
  cardType?: string;
  attributeBlocks?: Record<string, Record<string, string>>;
  held?: SetupCardHeld[];
  heldCount?: number;
  section?: string | null;
  monsterDie?: string | null;
  boxNum?: string | null;
  summon?: string | null;
}

export interface SetupCardData {
  summary?: Record<string, unknown>;
  bySection?: Record<string, SetupCardHolder[]>;
  treasureSetupHolders?: SetupCardHolder[];
  nativeChartHolders?: SetupCardHolder[];
  holders?: SetupCardHolder[];
}

const SECTION_LABELS: Record<string, string> = {
  '': 'Other',
  twt: 'TWT',
  'treasure locations': 'Treasure Locations',
  'lost castle': 'Lost Castle',
  'lost city': 'Lost City',
  dwellings: 'Dwellings',
  natives: 'Natives',
  magic: 'Magic',
  visitors: 'Visitors',
};

export function sectionLabel(section: string): string {
  if (section in SECTION_LABELS) return SECTION_LABELS[section];
  return section.replace(/\b\w/g, (c) => c.toUpperCase());
}

function holderAttrs(holder: SetupCardHolder): Record<string, string> {
  return holder.attributeBlocks?.this ?? {};
}

export function holderMonsterDie(holder: SetupCardHolder): number | null {
  const attrs = holderAttrs(holder);
  const raw = attrs.monster_die ?? attrs.monster_die2 ?? holder.monsterDie;
  if (raw == null || raw === '') return null;
  const n = parseInt(String(raw), 10);
  return Number.isFinite(n) ? n : null;
}

export function holderUsesMonsterDieColumn(holder: SetupCardHolder): boolean {
  const attrs = holderAttrs(holder);
  return Boolean(attrs.monster_die) && !attrs.ts_sidebar;
}

export function holderDisplayName(holder: SetupCardHolder): string {
  const attrs = holderAttrs(holder);
  return (
    attrs.summon ||
    attrs.dwelling ||
    holder.summon ||
    holder.name
  );
}

export function normalizeSetupCard(raw: SetupCardData | null | undefined): SetupCardData | null {
  if (!raw) return null;

  if (raw.bySection && Object.keys(raw.bySection).length > 0) {
    return raw;
  }

  const holders = raw.treasureSetupHolders ?? raw.holders ?? [];
  if (holders.length === 0) return null;

  const bySection: Record<string, SetupCardHolder[]> = {};
  for (const holder of holders) {
    const section = holder.section ?? holderAttrs(holder).ts_section ?? '';
    const key = section == null ? '' : String(section);
    if (!bySection[key]) bySection[key] = [];
    bySection[key].push(holder);
  }
  return { ...raw, bySection, treasureSetupHolders: holders };
}

export function sortedSectionKeys(bySection: Record<string, SetupCardHolder[]>): string[] {
  return Object.keys(bySection).sort((a, b) => a.localeCompare(b));
}

export function sectionLayout(holders: SetupCardHolder[]): {
  columns: SetupCardHolder[][];
  nonMd: SetupCardHolder[];
} {
  const columns: SetupCardHolder[][] = [[], [], [], [], [], []];
  const nonMd: SetupCardHolder[] = [];

  for (const holder of holders) {
    if (holderUsesMonsterDieColumn(holder)) {
      const die = holderMonsterDie(holder);
      if (die != null && die >= 1 && die <= 6) {
        columns[die - 1].push(holder);
      } else {
        nonMd.push(holder);
      }
    } else {
      nonMd.push(holder);
    }
  }

  for (const col of columns) {
    col.sort((a, b) => holderDisplayName(a).localeCompare(holderDisplayName(b)));
  }
  nonMd.sort((a, b) => holderDisplayName(a).localeCompare(holderDisplayName(b)));

  return { columns, nonMd };
}

export function flattenHeldNames(holder: SetupCardHolder): string[] {
  if (holder.held?.length) {
    return holder.held.map((h) => h.name).filter(Boolean);
  }
  if (holder.heldCount && holder.heldCount > 0 && !holder.held?.length) {
    return [`(${holder.heldCount} item${holder.heldCount === 1 ? '' : 's'})`];
  }
  return [];
}
