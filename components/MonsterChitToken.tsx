'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  getMonsterAlternativeImageCandidates,
  getMonsterSideData,
  isMonsterPart,
  type MonsterRecord,
} from '@/lib/monster-token-image';

const CHIT_PX = 72;

function getChitColor(colorName: string): string {
  const colorMap: Record<string, string> = {
    lightorange: '#FFB366',
    red: '#FF4444',
    blue: '#4444FF',
    green: '#44FF44',
    yellow: '#FFFF44',
    purple: '#FF44FF',
    brown: '#8B4513',
    grey: '#888888',
    gray: '#888888',
    white: '#FFFFFF',
    black: '#000000',
    lightgreen: '#90EE90',
    forestgreen: '#228B22',
    gold: '#FFD700',
    orange: '#FFA500',
    lightblue: '#ADD8E6',
    tan: '#D2B48C',
    pink: '#FFB6C1',
  };
  return colorMap[colorName] || '#FFFFFF';
}

export interface MonsterChitTokenProps {
  record: MonsterRecord;
  side: 'light' | 'dark';
  className?: string;
}

/**
 * Monster/part counter (alternative art). Same image on both sides; stats reflect light/dark or intact/damaged.
 */
export function MonsterChitToken({ record, side, className = '' }: MonsterChitTokenProps) {
  const sideData = getMonsterSideData(record, side);
  const thisData = record.attributeBlocks.this;
  const isPart = isMonsterPart(record);
  const isArmored = !isPart && thisData.armored !== undefined && thisData.armored !== '';

  const candidates = useMemo(
    () => getMonsterAlternativeImageCandidates(record),
    [record]
  );
  const [srcIndex, setSrcIndex] = useState(0);
  const src = candidates[srcIndex] ?? null;

  useEffect(() => {
    setSrcIndex(0);
  }, [record.id, candidates.join('|')]);

  if (!sideData) return null;

  const hasValidStrength = sideData.strength && sideData.strength !== 'undefined';
  const hasValidAttackSpeed = sideData.attack_speed && sideData.attack_speed !== 'undefined';
  const hasValidMoveSpeed = sideData.move_speed && sideData.move_speed !== 'undefined';
  const strength =
    sideData.strength === 'RED' ? '💀' : sideData.strength;
  const combined = `${strength}${sideData.attack_speed ?? ''}`;

  return (
    <div
      className={`relative shrink-0 border-2 border-[#2c2c2c] rounded-sm overflow-hidden bg-white ${className}`}
      style={{ width: CHIT_PX, height: CHIT_PX }}
      title={record.name}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt=""
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          style={{ imageRendering: 'pixelated', padding: 4 }}
          onError={() => {
            setSrcIndex((i) => (i + 1 < candidates.length ? i + 1 : i));
          }}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-[#6b3e26] px-1 text-center">
          {record.name.slice(0, 4)}
        </div>
      )}

      {!isPart && thisData.fame != null && (
        <div className="absolute top-0 left-0 z-10">
          <div className="bg-[#FF00FF] text-black text-[10px] font-bold leading-none px-0.5 min-w-[12px] text-center">
            {thisData.fame}
          </div>
        </div>
      )}

      {!isPart && thisData.notoriety != null && (
        <div className="absolute top-0 right-0 z-10">
          <div className="bg-[#87CEEB] text-black text-[10px] font-bold leading-none px-0.5 min-w-[12px] text-center">
            {thisData.notoriety}
          </div>
        </div>
      )}

      {!isPart && thisData.base_price != null && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10">
          <div className="w-5 h-5 bg-[#FFD700] rounded-full flex items-center justify-center text-[10px] font-bold text-black">
            {thisData.base_price}
          </div>
        </div>
      )}

      {!isPart && thisData.vulnerability != null && (
        <div className="absolute bottom-0 left-0 z-10">
          {isArmored ? (
            <div className="bg-[#444444] text-white text-[10px] font-bold leading-none px-0.5">
              {thisData.vulnerability}
            </div>
          ) : (
            <div className="bg-white text-black text-[10px] font-bold leading-none px-0.5 border border-[#ccc]">
              {thisData.vulnerability}
            </div>
          )}
        </div>
      )}

      {hasValidStrength && hasValidAttackSpeed && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 z-10">
          <div className="bg-[#FF0000] text-black text-[10px] font-bold leading-none px-0.5 whitespace-nowrap">
            {combined}
          </div>
        </div>
      )}

      {!isPart && hasValidMoveSpeed && (
        <div className="absolute bottom-0 right-0 z-10">
          <div
            className="text-[10px] font-bold leading-none px-0.5 min-w-[14px] text-center text-black"
            style={{ backgroundColor: getChitColor(sideData.chit_color) }}
          >
            {sideData.move_speed}
          </div>
        </div>
      )}
    </div>
  );
}
