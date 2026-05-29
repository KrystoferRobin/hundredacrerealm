/** RealmSpeak tile display (TileComponent.displayTilesStyle). */
export type TileGraphicsStyle = 'classic' | 'legendary' | 'legendary-icons';

export const TILE_GRAPHICS_STYLE_LABELS: Record<TileGraphicsStyle, string> = {
  classic: 'Classic',
  legendary: 'Legendary Realm',
  'legendary-icons': 'Legendary Realm (With Icons)',
};

export const DEFAULT_TILE_GRAPHICS_STYLE: TileGraphicsStyle = 'classic';

/** RealmSpeak character chit display (CharacterChitComponent.displayStyle). */
export type CounterGraphicsStyle =
  | 'classic'
  | 'legendary-classic'
  | 'legendary'
  | 'alternative';

export const COUNTER_GRAPHICS_STYLE_LABELS: Record<CounterGraphicsStyle, string> = {
  classic: 'Classic',
  'legendary-classic': 'Legendary Realm (Classic Hidden)',
  legendary: 'Legendary Realm',
  alternative: 'Alternative',
};

export const DEFAULT_COUNTER_GRAPHICS_STYLE: CounterGraphicsStyle = 'legendary';

/**
 * Map denizen/setup chit asset set (RealmComponent.displayStyle).
 * Character counter styles map to classic or alternative chit folders; color (_c) is
 * kept for denizens when using legendary character art (RealmSpeak default).
 */
export type MapChitAssetSet = 'classic' | 'color' | 'alternative';

export function resolveMapChitAssetSet(counter: CounterGraphicsStyle): MapChitAssetSet {
  if (counter === 'alternative') return 'alternative';
  if (counter === 'classic' || counter === 'legendary-classic') return 'classic';
  return 'color';
}

/** @deprecated Use TileGraphicsStyle + CounterGraphicsStyle */
export type MapGraphicsTheme = 'modern' | 'classic';
