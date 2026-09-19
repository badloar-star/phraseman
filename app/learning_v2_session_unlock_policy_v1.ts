export type LearningV2SessionStarCountV1 = 0 | 1 | 2 | 3;

/**
 * Access is device-owned and monotonic: the first passing result advances the
 * local course path, while a zero-star attempt remains available for retry.
 */
export function learningV2SessionUnlocksNextV1(
  stars: LearningV2SessionStarCountV1,
): boolean {
  return stars >= 1;
}
