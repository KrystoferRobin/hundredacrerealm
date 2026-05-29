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

const MAP_BOUNDS_MARGIN = 8;

export function filterInPlayTiles<T extends MapTileLike>(tiles: T[]): T[] {
  return tiles.filter(
    (t) => t.objectName && t.objectName !== 'undefined' && t.objectName.trim() !== ''
  );
}

/** Corners of a tile image (hex) after rotation, in map pixel space. */
function tileCornerPoints(
  tile: MapTileLike,
  dims: TilePixelDimensions
): Array<{ x: number; y: number }> {
  const { x: gx, y: gy } = parseMapPosition(tile.position);
  const center = gridToPixel(gx, gy, dims);
  const rotation = tileRotationDegrees(tile.rotation);
  const halfW = dims.width / 2;
  const halfH = dims.height / 2;
  const localCorners = [
    { x: -halfW, y: -halfH },
    { x: halfW, y: -halfH },
    { x: halfW, y: halfH },
    { x: -halfW, y: halfH },
  ];

  return localCorners.map((corner) => {
    const rotated = rotatePoint(corner.x, corner.y, rotation);
    return { x: center.x + rotated.x, y: center.y + rotated.y };
  });
}

/**
 * Tight axis-aligned bounds around in-play tiles (RealmSpeak-style layout).
 * Uses rotated tile corners so the viewBox matches the real map footprint.
 */
export function computeMapBounds(
  tiles: MapTileLike[],
  dims: TilePixelDimensions = getTilePixelDimensions()
): MapBounds {
  const inPlay = filterInPlayTiles(tiles);
  const halfW = dims.width / 2;
  const halfH = dims.height / 2;

  if (inPlay.length === 0) {
    const svgWidth = dims.width + MAP_BOUNDS_MARGIN * 2;
    const svgHeight = dims.height + MAP_BOUNDS_MARGIN * 2;
    return {
      width: svgWidth,
      height: svgHeight,
      viewBox: `${-halfW - MAP_BOUNDS_MARGIN} ${-halfH - MAP_BOUNDS_MARGIN} ${svgWidth} ${svgHeight}`,
      minPixelX: -halfW - MAP_BOUNDS_MARGIN,
      minPixelY: -halfH - MAP_BOUNDS_MARGIN,
      maxPixelX: halfW + MAP_BOUNDS_MARGIN,
      maxPixelY: halfH + MAP_BOUNDS_MARGIN,
    };
  }

  const points = inPlay.flatMap((tile) => tileCornerPoints(tile, dims));

  const minPixelX = Math.min(...points.map((p) => p.x)) - MAP_BOUNDS_MARGIN;
  const minPixelY = Math.min(...points.map((p) => p.y)) - MAP_BOUNDS_MARGIN;
  const maxPixelX = Math.max(...points.map((p) => p.x)) + MAP_BOUNDS_MARGIN;
  const maxPixelY = Math.max(...points.map((p) => p.y)) + MAP_BOUNDS_MARGIN;

  const svgWidth = maxPixelX - minPixelX;
  const svgHeight = maxPixelY - minPixelY;

  return {
    width: svgWidth,
    height: svgHeight,
    viewBox: `${minPixelX} ${minPixelY} ${svgWidth} ${svgHeight}`,
    minPixelX,
    minPixelY,
    maxPixelX,
    maxPixelY,
  };
}

export function mapBoundsCenter(bounds: MapBounds): { x: number; y: number } {
  return {
    x: (bounds.minPixelX + bounds.maxPixelX) / 2,
    y: (bounds.minPixelY + bounds.maxPixelY) / 2,
  };
}

/** Pan/zoom around map content center (SVG user space). */
export function buildMapContentTransform(
  bounds: MapBounds,
  zoom: number,
  pan: { x: number; y: number }
): string {
  const { x: cx, y: cy } = mapBoundsCenter(bounds);
  return `translate(${pan.x} ${pan.y}) translate(${cx} ${cy}) scale(${zoom}) translate(${-cx} ${-cy})`;
}
