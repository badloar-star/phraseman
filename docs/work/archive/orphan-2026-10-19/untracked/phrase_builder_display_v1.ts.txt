export function learningV2DistinctPhraseBuilderMeaningV1(
  prompt: string,
  localizedMeaning: string | null | undefined,
): string | null {
  const normalizedMeaning = localizedMeaning?.trim();
  if (!normalizedMeaning) return null;
  return normalizedMeaning === prompt.trim() ? null : normalizedMeaning;
}
