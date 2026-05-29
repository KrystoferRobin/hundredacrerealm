import type { TileGraphicsStyle } from '@/lib/map-graphics-styles';
import { DEFAULT_TILE_GRAPHICS_STYLE } from '@/lib/map-graphics-styles';

/**
 * Resolve a tile GIF URL under public/images/tiles/{style}/.
 * Filenames use either the map's `image` id (e.g. superrealm_c_grotto) or the
 * display name (e.g. borderland -> borderland1.gif).
 */
export interface TileImageSource {
  objectName: string;
  image?: string | null;
  isEnchanted?: boolean;
}

export function getTileImageUrl(
  tile: TileImageSource,
  tileDataCache?: Record<string, { attributeBlocks?: { this?: { image?: string } } }>,
  style: TileGraphicsStyle = DEFAULT_TILE_GRAPHICS_STYLE
): string {
  const suffix = tile.isEnchanted ? '-e1' : '1';

  let baseName = tile.image?.trim() || null;
  if (!baseName && tileDataCache?.[tile.objectName]?.attributeBlocks?.this?.image) {
    baseName = tileDataCache[tile.objectName].attributeBlocks!.this!.image!;
  }
  if (!baseName) {
    baseName = tile.objectName.toLowerCase().replace(/\s+/g, '');
  }

  return `/images/tiles/${style}/${baseName}${suffix}.gif`;
}
