export interface ItemLikeRecord {
  name: string;
  attributeBlocks: Record<string, any>;
  parts?: ItemLikeRecord[];
  denizenKind?: 'native' | 'monster';
}

export function isNativeRecord(item: ItemLikeRecord): boolean {
  if (item.denizenKind === 'native') return true;
  const t = item.attributeBlocks?.this;
  return Boolean(
    t?.native &&
      item.attributeBlocks.light &&
      item.attributeBlocks.dark &&
      !item.attributeBlocks.intact &&
      !item.attributeBlocks.unalerted
  );
}

/** Equipment/treasure from coregamedata/items — not a map denizen counter. */
export function isGameItemRecord(item: ItemLikeRecord): boolean {
  const t = item.attributeBlocks?.this;
  if (!t) return false;
  if (item.denizenKind) return false;
  if (t.treasure !== undefined) return true;
  if (item.attributeBlocks.intact || item.attributeBlocks.unalerted) return true;
  if (t.horse && (item.attributeBlocks.trot || item.attributeBlocks.gallop)) return true;
  return false;
}

export function isSpellPartRecord(record: ItemLikeRecord): boolean {
  const t = record.attributeBlocks?.this;
  if (!t) return false;
  if (t.spell !== undefined && t.spell !== '') return true;
  if (t.duration && t.target && t.part === undefined && t.monster === undefined) {
    return true;
  }
  return false;
}

export function isMonsterPartRecord(record: ItemLikeRecord): boolean {
  const t = record.attributeBlocks?.this;
  if (!t) return false;
  if (isSpellPartRecord(record)) return false;
  if (t.part !== undefined) return true;
  if (t.monster !== undefined) return true;
  if (record.attributeBlocks.light && record.attributeBlocks.dark) return true;
  return false;
}

export function isMonsterRecord(item: ItemLikeRecord): boolean {
  if (item.denizenKind === 'monster') return true;
  if (isGameItemRecord(item)) return false;

  const t = item.attributeBlocks?.this;
  if (!t) return false;
  if (t.monster !== undefined && t.treasure === undefined) return true;
  if (t.part !== undefined) return true;

  const parts = item.parts;
  if (Array.isArray(parts) && parts.length > 0) {
    return parts.some((p) => isMonsterPartRecord(p));
  }

  const hasMonsterSides =
    (item.attributeBlocks.light && item.attributeBlocks.dark) ||
    (item.attributeBlocks.intact && item.attributeBlocks.damaged);
  return Boolean(hasMonsterSides && !t.native && t.spell === undefined);
}
