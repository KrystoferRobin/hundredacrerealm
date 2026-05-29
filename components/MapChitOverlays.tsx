'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  findTileByName,
  getChitPixelOnMap,
  type TilePixelDimensions,
} from '@/lib/map-geometry';
import {
  fitChitLabelFontSize,
  getChitFallbackLabel,
  getChitImageCandidates,
  getChitImageUrl,
  isPopupEligible,
  sortStackItems,
  stackKey,
  usesMapToken,
  type MapChitLocation,
} from '@/lib/map-assets';
import type { CounterGraphicsStyle } from '@/lib/map-graphics-styles';
import { DenizenTooltipPanel } from '@/components/DenizenTooltipPanel';
import type { ItemLikeRecord } from '@/lib/denizen-detect';

const CHIT_SIZE = 36;
const SOUND_WARNING_CHIT_SIZE = Math.round(CHIT_SIZE / 2);
const STACK_OFFSET = 5;
const TOKEN_PAD = 5;

function getMarkerSize(item: MapChitLocation): number {
  return item.type === 'sound' || item.type === 'warning' ? SOUND_WARNING_CHIT_SIZE : CHIT_SIZE;
}

export interface MapChitMarkersProps {
  mapLocations: Record<string, MapChitLocation[] | undefined>;
  mapData: { tiles: any[] };
  tileDataCache: Record<string, any>;
  dims: TilePixelDimensions;
  counterStyle: CounterGraphicsStyle;
  showDwellings: boolean;
  showSound: boolean;
  showWarning: boolean;
  showTreasure: boolean;
  showNatives: boolean;
  showMonsters: boolean;
  showOther: boolean;
  onClearingPopup: (popup: ClearingPopupState | null) => void;
}

export interface ClearingPopupState {
  items: MapChitLocation[];
  clientX: number;
  clientY: number;
}

interface PlacedChit {
  item: MapChitLocation;
  x: number;
  y: number;
}

interface StackGroup {
  key: string;
  x: number;
  y: number;
  items: MapChitLocation[];
  popupItems: MapChitLocation[];
}

interface OverlayVisibility {
  showDwellings: boolean;
  showSound: boolean;
  showWarning: boolean;
  showTreasure: boolean;
  showNatives: boolean;
  showMonsters: boolean;
  showOther: boolean;
}

function collectVisibleItems(
  mapLocations: MapChitMarkersProps['mapLocations'],
  flags: OverlayVisibility
): MapChitLocation[] {
  const items: MapChitLocation[] = [];
  if (flags.showDwellings && mapLocations.dwellings) items.push(...mapLocations.dwellings);
  if (flags.showSound && mapLocations.sound) items.push(...mapLocations.sound);
  if (flags.showWarning && mapLocations.warning) {
    items.push(...mapLocations.warning.filter((w) => !w.dwelling));
  }
  if (flags.showTreasure && mapLocations.treasure) items.push(...mapLocations.treasure);
  if (flags.showNatives && mapLocations.natives) items.push(...mapLocations.natives);
  if (flags.showMonsters && mapLocations.monsters) items.push(...mapLocations.monsters);
  if (flags.showOther && mapLocations.other) items.push(...mapLocations.other);
  if (flags.showTreasure && mapLocations.characters) items.push(...mapLocations.characters);
  return items;
}

function placeItems(
  items: MapChitLocation[],
  mapData: MapChitMarkersProps['mapData'],
  tileDataCache: Record<string, any>,
  dims: TilePixelDimensions
): PlacedChit[] {
  const placed: PlacedChit[] = [];
  for (const item of items) {
    const tile = findTileByName(mapData.tiles, item.tile);
    if (!tile) continue;
    const pos = getChitPixelOnMap(tile, item, tileDataCache, dims);
    if (!pos) continue;
    placed.push({ item, x: pos.x, y: pos.y });
  }
  return placed;
}

/** SVG markers — render inside the map content &lt;g&gt;. */
export function MapChitMarkers({
  mapLocations,
  mapData,
  tileDataCache,
  dims,
  counterStyle,
  showDwellings,
  showSound,
  showWarning,
  showTreasure,
  showNatives,
  showMonsters,
  showOther,
  onClearingPopup,
}: MapChitMarkersProps) {
  const visibility: OverlayVisibility = {
    showDwellings,
    showSound,
    showWarning,
    showTreasure,
    showNatives,
    showMonsters,
    showOther,
  };

  const { simpleMarkers, stacks } = useMemo(() => {
    const items = collectVisibleItems(mapLocations, visibility);
    const placed = placeItems(items, mapData, tileDataCache, dims);

    const simple: PlacedChit[] = [];
    const byKey = new Map<string, { x: number; y: number; items: MapChitLocation[] }>();

    for (const p of placed) {
      if (!isPopupEligible(p.item)) {
        simple.push(p);
        continue;
      }
      const key = stackKey(p.item);
      const existing = byKey.get(key);
      if (existing) {
        existing.items.push(p.item);
      } else {
        byKey.set(key, { x: p.x, y: p.y, items: [p.item] });
      }
    }

    const stackGroups: StackGroup[] = [];
    byKey.forEach((group, key) => {
      group.items.sort(sortStackItems);
      stackGroups.push({
        key,
        x: group.x,
        y: group.y,
        items: group.items,
        popupItems: group.items.filter(isPopupEligible),
      });
    });

    return { simpleMarkers: simple, stacks: stackGroups };
  }, [
    mapLocations,
    mapData,
    tileDataCache,
    dims,
    showDwellings,
    showSound,
    showWarning,
    showTreasure,
    showNatives,
    showMonsters,
    showOther,
  ]);

  const openPopup = useCallback(
    (e: React.MouseEvent, stack: StackGroup) => {
      if (stack.popupItems.length === 0) return;
      onClearingPopup({
        items: stack.popupItems,
        clientX: e.clientX,
        clientY: e.clientY,
      });
    },
    [onClearingPopup]
  );

  return (
    <g className="map-chit-overlays">
      {simpleMarkers.map(({ item, x, y }) => (
        <ChitMarker key={item.id} item={item} counterStyle={counterStyle} x={x} y={y} size={getMarkerSize(item)} />
      ))}

      {stacks.map((stack) => {
        const previewCount = Math.min(3, stack.items.length);
        const extra = stack.items.length - previewCount;
        const canPopup = stack.popupItems.length > 0;

        return (
          <g
            key={stack.key}
            onMouseEnter={canPopup ? (e) => openPopup(e, stack) : undefined}
            onMouseMove={canPopup ? (e) => openPopup(e, stack) : undefined}
            onMouseLeave={canPopup ? () => onClearingPopup(null) : undefined}
            style={{ cursor: canPopup ? 'pointer' : 'default' }}
          >
            {stack.items.slice(0, previewCount).map((item, i) => (
              <ChitMarker
                key={item.id}
                item={item}
                counterStyle={counterStyle}
                x={stack.x + i * STACK_OFFSET}
                y={stack.y - i * STACK_OFFSET}
                size={CHIT_SIZE}
              />
            ))}
            {extra > 0 && (
              <g>
                <circle
                  cx={stack.x + previewCount * STACK_OFFSET + 8}
                  cy={stack.y - previewCount * STACK_OFFSET}
                  r={9}
                  fill="#333"
                  fillOpacity={0.9}
                />
                <text
                  x={stack.x + previewCount * STACK_OFFSET + 8}
                  y={stack.y - previewCount * STACK_OFFSET + 4}
                  textAnchor="middle"
                  fontSize={10}
                  fill="#fff"
                  fontWeight="bold"
                >
                  +{extra}
                </text>
              </g>
            )}
            <title>{stack.items.map((i) => i.name).join(', ')}</title>
          </g>
        );
      })}
    </g>
  );
}

/** HTML popup rendered above the map (sibling of SVG, not inside it). */
export function MapChitClearingPopup({
  popup,
  overlayRootRef,
  counterStyle,
}: {
  popup: ClearingPopupState | null;
  overlayRootRef: React.RefObject<HTMLElement | null>;
  counterStyle: CounterGraphicsStyle;
}) {
  if (!popup || !overlayRootRef.current) return null;

  const root = overlayRootRef.current.getBoundingClientRect();
  const left = popup.clientX - root.left;
  const top = popup.clientY - root.top;

  return createPortal(
    <div
      className="absolute z-[200] pointer-events-none"
      style={{
        left,
        top,
        transform: 'translate(-50%, calc(-100% - 10px))',
      }}
    >
      <div
        className="rounded-lg border border-gray-500 bg-white/98 shadow-2xl px-3 py-3"
        style={{ maxWidth: Math.min(520, Math.max(168, popup.items.length * 168)) }}
      >
        <div className="flex flex-wrap justify-center gap-3">
          {popup.items.map((item) => (
            <PopupChitCard key={item.id} item={item} counterStyle={counterStyle} />
          ))}
        </div>
      </div>
    </div>,
    overlayRootRef.current
  );
}

function PopupChitCard({
  item,
  counterStyle,
}: {
  item: MapChitLocation;
  counterStyle: CounterGraphicsStyle;
}) {
  if (item.type === 'native' || item.type === 'monster') {
    return <DenizenPopupChitCard item={item} counterStyle={counterStyle} />;
  }

  return <PopupChitImageCard item={item} counterStyle={counterStyle} />;
}

function DenizenPopupChitCard({
  item,
  counterStyle,
}: {
  item: MapChitLocation;
  counterStyle: CounterGraphicsStyle;
}) {
  const [record, setRecord] = React.useState<ItemLikeRecord | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setRecord(null);

    const denizenType = item.type === 'native' ? 'native' : 'monster';
    fetch('/api/tooltip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: denizenType, name: item.name }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (!cancelled) setRecord(payload?.data ?? null);
      })
      .catch(() => {
        if (!cancelled) setRecord(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [item.id, item.name, item.type]);

  if (record) {
    return (
      <div className="shrink-0">
        <DenizenTooltipPanel record={record} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-[168px] shrink-0 text-center text-[10px] text-gray-600 py-6">
        Loading…
      </div>
    );
  }

  return <PopupChitImageCard item={item} counterStyle={counterStyle} />;
}

function PopupChitImageCard({
  item,
  counterStyle,
}: {
  item: MapChitLocation;
  counterStyle: CounterGraphicsStyle;
}) {
  const candidates = getChitImageCandidates(item, counterStyle);
  const [srcIndex, setSrcIndex] = React.useState(0);
  const href = candidates[srcIndex] ?? null;
  const label = getChitFallbackLabel(item);
  const fontSize = fitChitLabelFontSize(label, 36);

  React.useEffect(() => {
    setSrcIndex(0);
  }, [item.id, counterStyle, candidates.join('|')]);

  return (
    <div className="flex flex-col items-center w-[72px] shrink-0">
      <div
        className="relative flex items-center justify-center rounded-full border-2 border-gray-800 bg-[#fffef5] shadow-md"
        style={{ width: 40, height: 40 }}
      >
        {href ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={href}
            src={href}
            alt={item.name}
            width={32}
            height={32}
            className="object-contain"
            style={{ imageRendering: 'pixelated' }}
            onError={() => {
              setSrcIndex((i) => (i + 1 < candidates.length ? i + 1 : i));
            }}
          />
        ) : (
          <span
            className="font-bold px-0.5 text-center leading-none"
            style={{
              fontSize,
              color:
                item.type === 'warning' ? '#b71c1c' : item.type === 'sound' ? '#0d47a1' : '#333',
            }}
          >
            {label}
          </span>
        )}
      </div>
      <span className="mt-1 text-[9px] text-center leading-tight text-gray-800 line-clamp-2 w-full">
        {item.name}
      </span>
    </div>
  );
}

function ChitMapImage({
  item,
  counterStyle,
  size,
}: {
  item: MapChitLocation;
  counterStyle: CounterGraphicsStyle;
  size: number;
}) {
  const candidates = React.useMemo(
    () => getChitImageCandidates(item, counterStyle),
    [item, counterStyle]
  );
  const [candidateIndex, setCandidateIndex] = React.useState(0);
  const href = candidates[candidateIndex] ?? null;

  React.useEffect(() => {
    setCandidateIndex(0);
  }, [item.id, counterStyle, candidates.join('|')]);

  if (!href) return null;

  const half = size / 2;
  return (
    <image
      key={href}
      href={href}
      xlinkHref={href}
      x={-half}
      y={-half}
      width={size}
      height={size}
      preserveAspectRatio="xMidYMid meet"
      style={{ imageRendering: 'pixelated' }}
      onError={() => {
        setCandidateIndex((i) => (i + 1 < candidates.length ? i + 1 : i));
      }}
    />
  );
}

function ChitMarker({
  item,
  counterStyle,
  x,
  y,
  size,
}: {
  item: MapChitLocation;
  counterStyle: CounterGraphicsStyle;
  x: number;
  y: number;
  size: number;
}) {
  const hasIcon = usesMapToken(item, counterStyle);
  const half = size / 2;
  const tokenR = half + TOKEN_PAD;

  if (hasIcon) {
    return (
      <g transform={`translate(${x}, ${y})`}>
        <circle r={tokenR + 1} fill="rgba(0,0,0,0.35)" cx={0} cy={1} />
        <circle r={tokenR} fill="#fffef5" stroke="#2c2c2c" strokeWidth={1.5} />
        <ChitMapImage item={item} counterStyle={counterStyle} size={size} />
      </g>
    );
  }

  const label = getChitFallbackLabel(item);
  const fontSize = fitChitLabelFontSize(label, size);
  const isWarning = item.type === 'warning';
  const isSound = item.type === 'sound';

  const fill = isWarning ? '#ffcdd2' : isSound ? '#bbdefb' : '#f5f5f5';
  const stroke = isWarning ? '#c62828' : isSound ? '#1565c0' : '#666';
  const textFill = isWarning ? '#b71c1c' : isSound ? '#0d47a1' : '#333';

  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle r={half} fill={fill} stroke={stroke} strokeWidth={isWarning || isSound ? 1 : 1.5} />
      <text
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={fontSize}
        fill={textFill}
        fontWeight="bold"
      >
        {label}
      </text>
    </g>
  );
}
