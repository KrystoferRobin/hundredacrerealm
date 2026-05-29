'use client';

import { DenizenTooltipPanel } from '@/components/DenizenTooltipPanel';
import { ItemTooltipPanel } from '@/components/ItemTooltipPanel';
import { isMonsterRecord, isNativeRecord, type ItemLikeRecord } from '@/lib/denizen-detect';

export function CounterTooltipPanel({ item }: { item: ItemLikeRecord }) {
  if (isNativeRecord(item) || isMonsterRecord(item)) {
    return <DenizenTooltipPanel record={item} />;
  }

  return <ItemTooltipPanel item={item} />;
}
