'use client';

import { MonsterChitToken } from '@/components/MonsterChitToken';
import { NativeChitToken } from '@/components/NativeChitToken';
import { isMonsterRecord, isNativeRecord, type ItemLikeRecord } from '@/lib/denizen-detect';
import type { MonsterRecord } from '@/lib/monster-token-image';
import type { NativeRecord } from '@/lib/native-token-image';

export function DenizenTooltipPanel({ record }: { record: ItemLikeRecord }) {
  if (isNativeRecord(record)) {
    const native = record as unknown as NativeRecord;
    return (
      <div className="bg-[#fff8e1] border-2 border-[#bfa76a] rounded-lg p-3 shadow-lg min-w-[168px]">
        <div className="text-sm font-semibold text-[#6b3e26] font-serif mb-2 text-center">
          {native.name}
        </div>
        <div className="flex justify-center gap-2">
          <NativeChitToken native={native} side="light" />
          <NativeChitToken native={native} side="dark" />
        </div>
      </div>
    );
  }

  if (isMonsterRecord(record)) {
    const monster = record as unknown as MonsterRecord;
    const isPart = Boolean(monster.attributeBlocks.this?.part);
    const parts = !isPart && monster.parts?.length ? monster.parts : null;

    return (
      <div className="bg-[#fff8e1] border-2 border-[#bfa76a] rounded-lg p-3 shadow-lg min-w-[168px]">
        <div className="text-sm font-semibold text-[#6b3e26] font-serif mb-2 text-center">
          {monster.name}
        </div>
        <div className="flex justify-center gap-2">
          <MonsterChitToken record={monster} side="light" />
          <MonsterChitToken record={monster} side="dark" />
        </div>
        {parts && (
          <div className="mt-3 flex flex-wrap justify-center gap-3">
            {parts.map((part) => (
              <div key={part.id} className="flex flex-col items-center">
                <span className="text-[10px] text-[#6b3e26] font-serif mb-1">{part.name}</span>
                <div className="flex gap-2">
                  <MonsterChitToken record={part} side="light" />
                  <MonsterChitToken record={part} side="dark" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
}
