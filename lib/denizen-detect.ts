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

export function isMonsterRecord(item: ItemLikeRecord): boolean {
  if (item.denizenKind === 'monster') return true;
  const t = item.attributeBlocks?.this;
  if (!t) return false;
  if (t.monster !== undefined) return true;
  if (t.part !== undefined) return true;
  if (Array.isArray(item.parts) && item.parts.length > 0) return true;
  const hasMonsterSides =
    (item.attributeBlocks.light && item.attributeBlocks.dark) ||
    (item.attributeBlocks.intact && item.attributeBlocks.damaged);
  return Boolean(hasMonsterSides && !t.native && !t.spell);
}
