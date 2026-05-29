'use client';

import { ItemChitPair } from '@/components/ItemChitToken';
import { MonsterChitToken } from '@/components/MonsterChitToken';
import {
  classifyItemChitKind,
  getItemSpecialAbilityText,
  type ItemRecord,
} from '@/lib/item-chit';
import { isMonsterPartRecord, isSpellPartRecord } from '@/lib/denizen-detect';
import type { MonsterRecord } from '@/lib/monster-token-image';

function SpecialAbility({ text }: { text: string }) {
  return (
    <div className="mt-2 pt-2 border-t border-[#bfa76a]">
      <div className="text-[10px] font-semibold text-[#6b3e26] font-serif mb-1">Special</div>
      <div className="text-xs text-[#4b3a1e] font-serif italic leading-relaxed">{text}</div>
    </div>
  );
}

function EmbeddedSpellPart({ part }: { part: ItemRecord }) {
  const t = part.attributeBlocks.this;
  if (!t) return null;

  const spellType = (t.spell || t.magic || '*').trim() || '*';

  return (
    <div className="mt-2 pt-2 border-t border-[#bfa76a]">
      <div className="text-[10px] font-semibold text-[#6b3e26] font-serif mb-1">{part.name}</div>
      <div className="space-y-1 text-xs text-[#6b3e26] font-serif">
        <div className="flex justify-between gap-2">
          <span>
            Type <span className="font-bold">{spellType}</span>
            {t.magic_color ? (
              <span className="capitalize"> · {t.magic_color}</span>
            ) : null}
          </span>
          {t.duration ? <span className="capitalize">{t.duration}</span> : null}
        </div>
        {t.target ? (
          <div className="text-[10px] capitalize">Target: {t.target}</div>
        ) : null}
        {t.text ? (
          <div className="italic text-[#4b3a1e] leading-relaxed">{t.text}</div>
        ) : null}
      </div>
    </div>
  );
}

function EmbeddedMonsterPart({ part }: { part: ItemRecord }) {
  const monster = part as unknown as MonsterRecord;
  return (
    <div className="mt-2 pt-2 border-t border-[#bfa76a]">
      <div className="text-[10px] font-semibold text-[#6b3e26] font-serif mb-1 text-center">
        {part.name}
      </div>
      <div className="flex justify-center gap-2">
        <MonsterChitToken record={monster} side="light" />
        <MonsterChitToken record={monster} side="dark" />
      </div>
    </div>
  );
}

function ItemPartsSection({ parts }: { parts: ItemRecord[] }) {
  if (!parts.length) return null;

  return (
    <>
      {parts.map((part) => {
        if (isSpellPartRecord(part)) {
          return <EmbeddedSpellPart key={part.id || part.name} part={part} />;
        }
        if (isMonsterPartRecord(part)) {
          return <EmbeddedMonsterPart key={part.id || part.name} part={part} />;
        }
        return null;
      })}
    </>
  );
}

function sideLabel(kind: ReturnType<typeof classifyItemChitKind>): string | null {
  switch (kind) {
    case 'armor':
      return 'Intact / Damaged';
    case 'weapon':
      return 'Unalerted / Alerted';
    case 'horse':
      return 'Trot / Gallop';
    default:
      return null;
  }
}

export function ItemTooltipPanel({ item }: { item: ItemRecord }) {
  const kind = classifyItemChitKind(item);
  const ability = getItemSpecialAbilityText(item);
  const label = sideLabel(kind);
  const parts = item.parts?.filter(Boolean) ?? [];

  if (kind === 'spell') {
    const t = item.attributeBlocks.this;
    return (
      <div className="bg-[#fff8e1] border-2 border-[#bfa76a] rounded-lg p-3 shadow-lg min-w-[168px]">
        <div className="text-sm font-semibold text-[#6b3e26] font-serif mb-2 text-center">{item.name}</div>
        <div className="space-y-2 text-xs text-[#6b3e26] font-serif">
          <div className="flex justify-between">
            <span className="font-semibold">Type {t.spell}</span>
            <span className="capitalize">{t.duration}</span>
          </div>
          <div className="border-t border-[#bfa76a] pt-2 italic leading-relaxed">
            {t.text || 'No description available'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#fff8e1] border-2 border-[#bfa76a] rounded-lg p-3 shadow-lg min-w-[168px]">
      <div className="text-sm font-semibold text-[#6b3e26] font-serif mb-2 text-center">{item.name}</div>
      {label && (
        <div className="text-[10px] text-center text-[#6b3e26] font-serif mb-1">{label}</div>
      )}
      <ItemChitPair item={item} />
      {ability && <SpecialAbility text={ability} />}
      <ItemPartsSection parts={parts} />
    </div>
  );
}
