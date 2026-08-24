/**
 * Audio assets are keyed by stable content-unit ids, but phrase copy can change
 * while an older approved asset keeps the same id. Only play an asset when its
 * recorded target still matches the current phrase text.
 */
export function normalizePersonalPlanAudioTarget(value: string): string {
  return value
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/[^a-z0-9'\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function personalPlanAudioTargetMatches(assetTarget: string, phraseTarget: string): boolean {
  const normalizedAsset = normalizePersonalPlanAudioTarget(assetTarget);
  const normalizedPhrase = normalizePersonalPlanAudioTarget(phraseTarget);
  return normalizedAsset.length > 0 && normalizedAsset === normalizedPhrase;
}
