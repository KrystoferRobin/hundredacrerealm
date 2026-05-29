/**
 * Map layout math aligned with RealmSpeak's CenteredMapView.convertGridToCoordinate
 * and Tile.java rotation constants (0–5 = S, SW, NW, N, NE, SE × 60°).
 */

export const DEFAULT_HEX_SIZE = 60;

export interface TilePixelDimensions {
  hexSize: number;
  width: number;
  height: number;
  colWidth: number;
  rowHeight: number;
  rowAdjust: number;
}

export function getTilePixelDimensions(hexSize = DEFAULT_HEX_SIZE): TilePixelDimensions {
  const width = hexSize * 2;
  const height = hexSize * Math.sqrt(3);
  return {
    hexSize,
    width,
    height,
    colWidth: (width * 3) / 4,
    rowHeight: height,
    rowAdjust: height / 2,
  };
}

export function parseMapPosition(position: string): { x: number; y: number } {
  const [x, y] = position.split(',').map(Number);
  return { x, y };
}

/** RealmSpeak: x = gx * colWidth, y = gx * rowAdjust + gy * rowHeight */
export function gridToPixel(
  gridX: number,
  gridY: number,
  dims: TilePixelDimensions = getTilePixelDimensions()
): { x: number; y: number } {
  return {
    x: gridX * dims.colWidth,
    y: gridX * dims.rowAdjust + gridY * dims.rowHeight,
  };
}

/** Tile.java: rotation 0–5, each step 60° */
export function tileRotationDegrees(rotation: number): number {
  return rotation * 60;
}

export function rotatePoint(
  x: number,
  y: number,
  degrees: number
): { x: number; y: number } {
  const rad = (degrees * Math.PI) / 180;
  return {
    x: x * Math.cos(rad) - y * Math.sin(rad),
    y: x * Math.sin(rad) + y * Math.cos(rad),
  };
}

type AttributeBlock = Record<string, string | undefined>;

export function getClearingOffsetInTile(
  clearing: string,
  tileData: {
    attributeBlocks?: { normal?: AttributeBlock; enchanted?: AttributeBlock };
  },
  isEnchanted: boolean,
  dims: TilePixelDimensions = getTilePixelDimensions()
): { x: number; y: number } | null {
  const block = isEnchanted
    ? tileData.attributeBlocks?.enchanted
    : tileData.attributeBlocks?.normal;
  if (!block) return null;

  const coords = block[`clearing_${clearing}_xy`];
  if (!coords) return null;

  const [xPercent, yPercent] = coords.split(',').map(Number);
  return {
    x: (xPercent / 100) * dims.width - dims.width / 2,
    y: (yPercent / 100) * dims.height - dims.height / 2,
  };
}

function getOffroadOffsetInTile(
  tileData: {
    attributeBlocks?: { normal?: AttributeBlock; enchanted?: AttributeBlock };
  },
  isEnchanted: boolean,
  dims: TilePixelDimensions = getTilePixelDimensions()
): { x: number; y: number } | null {
  const block = isEnchanted
    ? tileData.attributeBlocks?.enchanted
    : tileData.attributeBlocks?.normal;
  if (!block?.offroad_xy) return null;

  const [xPercent, yPercent] = block.offroad_xy.split(',').map(Number);
  return {
    x: (xPercent / 100) * dims.width - dims.width / 2,
    y: (yPercent / 100) * dims.height - dims.height / 2,
  };
}

export interface MapTileLike {
  position: string;
  rotation: number;
  objectName: string;
  isEnchanted: boolean;
}

export interface ChitOnMapLike {
  clearing?: string | null;
  dwelling?: string;
  warning?: string;
}

/**
 * Pixel position for a chit on a tile (clearing, offroad, or tile center).
 */
export function getChitPixelOnMap(
  tile: MapTileLike,
  item: ChitOnMapLike,
  tileDataCache: Record<string, unknown>,
  dims: TilePixelDimensions = getTilePixelDimensions()
): { x: number; y: number } | null {
  const { x: gx, y: gy } = parseMapPosition(tile.position);
  const hexPos = gridToPixel(gx, gy, dims);
  const tileData = tileDataCache[tile.objectName] as
    | {
        attributeBlocks?: { normal?: AttributeBlock; enchanted?: AttributeBlock };
      }
    | undefined;

  let local = { x: 0, y: 0 };

  if (item.clearing && tileData) {
    const clearingPos = getClearingOffsetInTile(
      String(item.clearing),
      tileData,
      tile.isEnchanted,
      dims
    );
    if (!clearingPos) return null;
    local = clearingPos;
  } else if (tileData) {
    const offroad = getOffroadOffsetInTile(tileData, tile.isEnchanted, dims);
    if (offroad) local = offroad;
  }

  const rotated = rotatePoint(local.x, local.y, tileRotationDegrees(tile.rotation));
  return { x: hexPos.x + rotated.x, y: hexPos.y + rotated.y };
}

export function findTileByName<T extends MapTileLike>(
  tiles: T[],
  tileName: string
): T | undefined {
  return tiles.find((t) => t.objectName === tileName);
}

export interface MapBounds {
  width: number;
  height: number;
  viewBox: string;
  minPixelX: number;
  minPixelY: number;
  maxPixelX: number;
  maxPixelY: number;
}

export function computeMapBounds(
  tiles: MapTileLike[],
  dims: TilePixelDimensions = getTilePixelDimensions()
): MapBounds {
  const padX = dims.width / 2;
  const padY = dims.height / 2;

  const inPlay = tiles.filter(
    (t) => t.objectName && t.objectName !== 'undefined' && t.objectName.trim() !== ''
  );

  if (inPlay.length === 0) {
    return {
      width: dims.width,
      height: dims.height,
      viewBox: `${-padX} ${-padY} ${dims.width + 2 * padX} ${dims.height + 2 * padY}`,
      minPixelX: -padX,
      minPixelY: -padY,
      maxPixelX: dims.width + padX,
      maxPixelY: dims.height + padY,
    };
  }

  const positions = inPlay.map((tile) => {
    const { x, y } = parseMapPosition(tile.position);
    return gridToPixel(x, y, dims);
  });

  const minPixelX = Math.min(...positions.map((p) => p.x));
  const minPixelY = Math.min(...positions.map((p) => p.y));
  const maxPixelX = Math.max(...positions.map((p) => p.x));
  const maxPixelY = Math.max(...positions.map((p) => p.y));

  const svgWidth = maxPixelX - minPixelX + dims.width + 2 * padX;
  const svgHeight = maxPixelY - minPixelY + dims.height + 2 * padY;

  return {
    width: svgWidth,
    height: svgHeight,
    viewBox: `${minPixelX - padX} ${minPixelY - padY} ${svgWidth} ${svgHeight}`,
    minPixelX: minPixelX - padX,
    minPixelY: minPixelY - padY,
    maxPixelX: maxPixelX + padX,
    maxPixelY: maxPixelY + padY,
  };
}
