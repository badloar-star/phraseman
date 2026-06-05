import { useMemo } from 'react';
import { useWindowDimensions, type ImageSourcePropType } from 'react-native';

import { ADAPTIVE_BACKGROUND_ASSETS } from './adaptiveBackgroundAssets.generated';

export type AdaptiveBackgroundVariant =
  | 'phonePortrait'
  | 'phoneLandscape'
  | 'tabletPortrait'
  | 'tabletLandscape'
  | 'ultraPortrait'
  | 'ultraLandscape';

export type AdaptiveBackgroundViewport = {
  width: number;
  height: number;
};

export function adaptiveBackgroundVariantForViewport({
  width,
  height,
}: AdaptiveBackgroundViewport): AdaptiveBackgroundVariant {
  const longEdge = Math.max(width, height);
  const shortEdge = Math.min(width, height);
  const orientation = width >= height ? 'Landscape' : 'Portrait';

  if (shortEdge >= 1000 || longEdge >= 1500) return `ultra${orientation}` as AdaptiveBackgroundVariant;
  if (shortEdge >= 700 || longEdge >= 1100) return `tablet${orientation}` as AdaptiveBackgroundVariant;
  return `phone${orientation}` as AdaptiveBackgroundVariant;
}

function sourceKey(source: ImageSourcePropType): number | null {
  if (typeof source === 'number') return source;
  return null;
}

export function resolveAdaptiveBackgroundSource(
  source: ImageSourcePropType,
  variant: AdaptiveBackgroundVariant,
): ImageSourcePropType {
  const key = sourceKey(source);
  if (key === null) return source;

  const variants = ADAPTIVE_BACKGROUND_ASSETS[key];
  const orientation = variant.endsWith('Landscape') ? 'Landscape' : 'Portrait';
  const sameOrientationFallbacks: AdaptiveBackgroundVariant[] = orientation === 'Landscape'
    ? ['tabletLandscape', 'ultraLandscape', 'phoneLandscape']
    : ['tabletPortrait', 'ultraPortrait', 'phonePortrait'];

  return variants?.[variant]
    ?? sameOrientationFallbacks.map(candidate => variants?.[candidate]).find(Boolean)
    ?? variants?.tabletPortrait
    ?? variants?.phonePortrait
    ?? source;
}

export function useAdaptiveBackgroundSource(source: ImageSourcePropType): ImageSourcePropType {
  const { width, height } = useWindowDimensions();
  const variant = adaptiveBackgroundVariantForViewport({ width, height });

  return useMemo(
    () => resolveAdaptiveBackgroundSource(source, variant),
    [source, variant],
  );
}
