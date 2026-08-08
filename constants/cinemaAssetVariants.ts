import type { ThemeMode } from './theme';

export type CinemaAssetVariantId = 'relicGlass' | 'monolith' | 'signalCrest';

export type CinemaAssetVariant = {
  id: CinemaAssetVariantId;
  label: string;
  shortLabel: string;
  description: string;
};

export const CINEMA_ASSET_VARIANT_STORAGE_KEY = 'cinema_asset_variant';

export const CINEMA_ASSET_VARIANTS: readonly CinemaAssetVariant[] = [
  {
    id: 'relicGlass',
    label: 'Relic Glass',
    shortLabel: 'Relic',
    description: 'Dark glass, metal edges, premium collectible silhouettes.',
  },
  {
    id: 'monolith',
    label: 'Monolith',
    shortLabel: 'Mono',
    description: 'Stricter geometric icons with a premium OS feel.',
  },
  {
    id: 'signalCrest',
    label: 'Signal Crest',
    shortLabel: 'Crest',
    description: 'Sharper competitive crests and reward energy.',
  },
] as const;

export const DEFAULT_CINEMA_ASSET_VARIANT: CinemaAssetVariantId = 'relicGlass';

export const CINEMA_THEME_MODES_FOR_ASSET_PREVIEW = [
  'midnight',
  'ember',
  'aurora',
  'volt',
] as const satisfies readonly ThemeMode[];

export function isCinemaAssetVariant(value: unknown): value is CinemaAssetVariantId {
  return CINEMA_ASSET_VARIANTS.some(variant => variant.id === value);
}
