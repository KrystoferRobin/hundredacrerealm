/**
 * Resolve a tile GIF URL under public/images/tiles.
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
  tileDataCache?: Record<string, { attributeBlocks?: { this?: { image?: string } } }>
): string {
  const suffix = tile.isEnchanted ? '-e1' : '1';

  let baseName = tile.image?.trim() || null;
  if (!baseName && tileDataCache?.[tile.objectName]?.attributeBlocks?.this?.image) {
    baseName = tileDataCache[tile.objectName].attributeBlocks!.this!.image!;
  }
  if (!baseName) {
    baseName = tile.objectName.toLowerCase().replace(/\s+/g, '');
  }

  return `/images/tiles/${baseName}${suffix}.gif`;
}
