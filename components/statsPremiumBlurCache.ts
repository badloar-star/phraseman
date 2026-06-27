export type StatsPremiumBlurPresentation = 'flat-veil';

export function selectStatsPremiumBlurPresentation({
  cachedUri,
  width,
  height,
}: {
  cachedUri: string | null | undefined;
  width: number;
  height: number;
}): StatsPremiumBlurPresentation {
  void cachedUri;
  void width;
  void height;
  return 'flat-veil';
}
