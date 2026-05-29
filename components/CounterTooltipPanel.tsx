'use client';

import { DenizenTooltipPanel } from '@/components/DenizenTooltipPanel';
import { ItemTooltipPanel } from '@/components/ItemTooltipPanel';
import {
  isGameItemRecord,
  isMonsterRecord,
  isNativeRecord,
  type ItemLikeRecord,
} from '@/lib/denizen-detect';

export function CounterTooltipPanel({ item }: { item: ItemLikeRecord }) {
  if (isGameItemRecord(item)) {
    return <ItemTooltipPanel item={item} />;
  }
  if (isNativeRecord(item) || isMonsterRecord(item)) {
    return <DenizenTooltipPanel record={item} />;
  }

  return <ItemTooltipPanel item={item} />;
}
