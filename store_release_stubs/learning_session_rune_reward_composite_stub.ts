export type LearningV2SessionRuneRewardCompositeV1 = Readonly<{
  schemaVersion: 'learning-v2-session-rune-reward-composite.v1';
}>;

export type LearningV2SessionRuneRewardPublicationTokenV1 = Readonly<Record<string, never>>;

export function createLearningV2SessionRuneRewardCompositeAuthorityV1(
  _publicationToken?: LearningV2SessionRuneRewardPublicationTokenV1,
) {
  return (): never => {
    throw new Error('learning_v2_store_disabled');
  };
}

export function parseLearningV2SessionRuneRewardCompositeV1(): never {
  throw new Error('learning_v2_store_disabled');
}
