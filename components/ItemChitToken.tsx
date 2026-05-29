'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  classifyItemChitKind,
  getChitColor,
  isArmoredItem,
  isLargeTreasure,
  ITEM_CHIT_PX,
  type ItemRecord,
} from '@/lib/item-chit';
import { getItemImageCandidates } from '@/lib/item-token-image';

interface ChitFrameProps {
  item: ItemRecord;
  backgroundColor: string;
  children: React.ReactNode;
  className?: string;
}

function ChitFrame({ item, backgroundColor, children, className = '' }: ChitFrameProps) {
  const candidates = useMemo(() => getItemImageCandidates(item), [item]);
  const [srcIndex, setSrcIndex] = useState(0);
  const src = candidates[srcIndex] ?? null;
  const t = item.attributeBlocks.this;

  useEffect(() => {
    setSrcIndex(0);
  }, [item.id, item.name, candidates.join('|')]);

  return (
    <div
      className={`relative shrink-0 border-2 border-[#2c2c2c] rounded-sm overflow-hidden ${className}`}
      style={{ width: ITEM_CHIT_PX, height: ITEM_CHIT_PX, backgroundColor }}
      title={item.name}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt=""
          className="absolute inset-0 w-full h-full object-contain pointer-events-none z-[1]"
          style={{ imageRendering: 'pixelated', padding: 4 }}
          onError={() => {
            setSrcIndex((i) => (i + 1 < candidates.length ? i + 1 : i));
          }}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-[#6b3e26] px-1 text-center z-[1]">
          {t?.icon_type || item.name.slice(0, 4)}
        </div>
      )}
      {children}
    </div>
  );
}

function Pip({
  children,
  className = '',
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`text-[10px] font-bold leading-none px-0.5 z-10 ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

export function ArmorItemChitToken({
  item,
  side,
}: {
  item: ItemRecord;
  side: 'intact' | 'damaged';
}) {
  const sideData = item.attributeBlocks[side];
  const t = item.attributeBlocks.this;
  const armored = isArmoredItem(item);

  return (
    <ChitFrame item={item} backgroundColor={getChitColor(sideData.chit_color)}>
      <div className="absolute top-0 left-0">
        <Pip className={armored ? 'bg-[#444444] text-white' : 'bg-white text-black border border-[#ccc]'}>
          {t.vulnerability}
        </Pip>
      </div>
      <div className="absolute top-0 right-0">
        <Pip className="bg-[#FFFF44] text-black">{t.weight}</Pip>
      </div>
      {t.fame && (
        <div className="absolute top-0 left-7">
          <Pip className="bg-[#FF00FF] text-black">{t.fame}</Pip>
        </div>
      )}
      {t.notoriety && (
        <div className="absolute top-0 right-7">
          <Pip className="bg-[#87CEEB] text-black">{t.notoriety}</Pip>
        </div>
      )}
      <div className="absolute left-0 top-1/2 -translate-y-1/2">
        <div className="w-5 h-5 bg-[#FFD700] rounded-full flex items-center justify-center text-[10px] font-bold text-black z-10">
          {sideData.base_price}
        </div>
      </div>
    </ChitFrame>
  );
}

export function WeaponItemChitToken({
  item,
  side,
}: {
  item: ItemRecord;
  side: 'unalerted' | 'alerted';
}) {
  const sideData = item.attributeBlocks[side];
  const t = item.attributeBlocks.this;

  return (
    <ChitFrame item={item} backgroundColor={getChitColor(sideData.chit_color)}>
      <div className="absolute top-0 left-0">
        <Pip className="bg-[#FFFF44] text-black">{t.weight}</Pip>
      </div>
      <div className="absolute top-0 right-0">
        <Pip className="bg-[#4444FF] text-white">{t.length}</Pip>
      </div>
      {sideData.attack_speed && (
        <div className="absolute bottom-0 left-0">
          <Pip className="bg-[#44FF44] text-black">{sideData.attack_speed}</Pip>
        </div>
      )}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
        <Pip className="bg-[#FF0000] text-black whitespace-nowrap">{sideData.strength}</Pip>
      </div>
      {sideData.sharpness && (
        <div className="absolute bottom-0 right-0">
          <Pip className="bg-[#FF44FF] text-black">{sideData.sharpness}</Pip>
        </div>
      )}
    </ChitFrame>
  );
}

export function HorseItemChitToken({
  item,
  side,
}: {
  item: ItemRecord;
  side: 'trot' | 'gallop';
}) {
  const sideData = item.attributeBlocks[side];
  const t = item.attributeBlocks.this;
  const armored = isArmoredItem(item);

  return (
    <ChitFrame item={item} backgroundColor={getChitColor(sideData.chit_color)}>
      <div className="absolute top-0 left-0">
        <Pip className={armored ? 'bg-[#444444] text-white' : 'bg-white text-black border border-[#ccc]'}>
          {t.vulnerability}
        </Pip>
      </div>
      <div className="absolute left-0 top-1/2 -translate-y-1/2">
        <div className="w-5 h-5 bg-[#FFD700] rounded-full flex items-center justify-center text-[10px] font-bold text-black z-10">
          {t.base_price}
        </div>
      </div>
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
        <Pip className="bg-[#FF0000] text-black whitespace-nowrap">
          {sideData.strength}
          {sideData.move_speed}
        </Pip>
      </div>
      <div className="absolute bottom-0 right-0">
        <Pip style={{ backgroundColor: getChitColor(sideData.chit_color) }} className="text-black">
          {side}
        </Pip>
      </div>
    </ChitFrame>
  );
}

export function TreasureItemChitToken({ item }: { item: ItemRecord }) {
  const t = item.attributeBlocks.this;
  const large = isLargeTreasure(item);
  const bg = large ? '#FFD700' : getChitColor(t.chit_color || 'white');
  const hasFameNotoriety = Boolean(t.fame || t.notoriety);
  const combatBottom =
    t.strength && t.attack_speed ? `${t.strength}${t.attack_speed}` : null;

  return (
    <ChitFrame item={item} backgroundColor={bg}>
      {t.fame && (
        <div className="absolute top-0 left-0">
          <Pip className="bg-[#FF00FF] text-black">{t.fame}</Pip>
        </div>
      )}
      {t.notoriety && (
        <div className="absolute top-0 right-0">
          <Pip className="bg-[#87CEEB] text-black">{t.notoriety}</Pip>
        </div>
      )}
      {t.vulnerability && (
        <div className="absolute bottom-0 left-0">
          <Pip className="bg-white text-black border border-[#ccc]">{t.vulnerability}</Pip>
        </div>
      )}
      {t.weight && hasFameNotoriety && (
        <div className="absolute top-0 right-8">
          <Pip className="bg-[#FFFF44] text-black">{t.weight}</Pip>
        </div>
      )}
      {combatBottom && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
          <Pip className="bg-[#FF0000] text-black whitespace-nowrap">{combatBottom}</Pip>
        </div>
      )}
      <div
        className={`absolute z-10 ${
          hasFameNotoriety ? 'left-0 top-1/2 -translate-y-1/2' : 'inset-0 flex items-center justify-center'
        }`}
      >
        {hasFameNotoriety ? (
          <div className="w-5 h-5 bg-[#FFD700] rounded-full flex items-center justify-center text-[10px] font-bold text-black">
            {t.base_price || '?'}
          </div>
        ) : (
          <Pip className="bg-[#FFD700] text-black">{t.base_price || '?'}</Pip>
        )}
      </div>
    </ChitFrame>
  );
}

export function ItemChitPair({ item }: { item: ItemRecord }) {
  const kind = classifyItemChitKind(item);

  if (kind === 'armor') {
    return (
      <div className="flex justify-center gap-2">
        <ArmorItemChitToken item={item} side="intact" />
        <ArmorItemChitToken item={item} side="damaged" />
      </div>
    );
  }

  if (kind === 'weapon') {
    return (
      <div className="flex justify-center gap-2">
        <WeaponItemChitToken item={item} side="unalerted" />
        <WeaponItemChitToken item={item} side="alerted" />
      </div>
    );
  }

  if (kind === 'horse') {
    return (
      <div className="flex justify-center gap-2">
        <HorseItemChitToken item={item} side="trot" />
        <HorseItemChitToken item={item} side="gallop" />
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      <TreasureItemChitToken item={item} />
    </div>
  );
}
