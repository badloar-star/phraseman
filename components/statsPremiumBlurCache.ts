export type StatsPremiumBlurPresentation = 'live-blur' | 'cached-image';

export function selectStatsPremiumBlurPresentation({
  cachedUri,
  width,
  height,
}: {
  cachedUri: string | null | undefined;
  width: number;
  height: number;
}): StatsPremiumBlurPresentation {
  return cachedUri && width > 0 && height > 0 ? 'cached-image' : 'live-blur';
}
