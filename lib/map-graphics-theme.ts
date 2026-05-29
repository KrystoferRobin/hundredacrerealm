/**
 * @deprecated Use `@/lib/map-graphics-styles` and `@/lib/map-assets` instead.
 */
export type { MapChitAssetSet as MapGraphicsTheme } from '@/lib/map-graphics-styles';
export { DEFAULT_COUNTER_GRAPHICS_STYLE as DEFAULT_MAP_GRAPHICS_THEME } from '@/lib/map-graphics-styles';

export const MAP_GRAPHICS_THEME_LABELS = {
  color: 'Modern (color)',
  classic: 'Classic',
  alternative: 'Alternative',
} as const;
