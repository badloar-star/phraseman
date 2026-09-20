import {
  isLearningV2BulkAudioNetworkEligibleV1,
  isLearningV2UrgentAudioNetworkEligibleV1,
  learningV2UrgentAudioCoordinatesV1,
  type LearningV2AudioPrefetchCoordinateV1,
  type LearningV2AudioPrefetchNetworkV1,
} from "./learning_v2_audio_prefetch_policy_v1";

export type LearningV2AudioPrefetchRunSummaryV1 = Readonly<{
  urgentSessionCount: number;
  bulkLessonCount: number;
  bulkEligible: boolean;
}>;

export async function runLearningV2AudioPrefetchCoordinatorCoreV1(input: {
  readonly current: LearningV2AudioPrefetchCoordinateV1;
  readonly network: LearningV2AudioPrefetchNetworkV1;
  readonly getNetwork?: () => Promise<LearningV2AudioPrefetchNetworkV1>;
  readonly shouldContinue?: () => boolean;
  readonly publishedLessonOrdinals: readonly number[];
  readonly isSessionPublished: (lessonOrdinal: number, sessionOrdinal: number) => boolean;
  readonly prepareSession: (coordinate: LearningV2AudioPrefetchCoordinateV1) => Promise<void>;
  readonly prepareLesson: (lessonOrdinal: number) => Promise<void>;
}): Promise<LearningV2AudioPrefetchRunSummaryV1> {
  let urgentSessionCount = 0;
  let bulkLessonCount = 0;
  const bulkEligible = isLearningV2BulkAudioNetworkEligibleV1(input.network);
  if (isLearningV2UrgentAudioNetworkEligibleV1(input.network)) {
    const urgent = learningV2UrgentAudioCoordinatesV1({
      ...input.current,
      count: 3,
      isPublished: input.isSessionPublished,
    });
    for (const coordinate of urgent) {
      if (input.shouldContinue && !input.shouldContinue()) break;
      const network = input.getNetwork ? await input.getNetwork() : input.network;
      if (!isLearningV2UrgentAudioNetworkEligibleV1(network)) break;
      await input.prepareSession(coordinate);
      urgentSessionCount += 1;
    }
  }
  if (bulkEligible) {
    const lessons = [...new Set(input.publishedLessonOrdinals)]
      .filter((ordinal) => Number.isSafeInteger(ordinal) && ordinal >= 1 && ordinal <= 32)
      .sort((left, right) => left - right);
    for (const lessonOrdinal of lessons) {
      if (input.shouldContinue && !input.shouldContinue()) break;
      const network = input.getNetwork ? await input.getNetwork() : input.network;
      if (!isLearningV2BulkAudioNetworkEligibleV1(network)) break;
      await input.prepareLesson(lessonOrdinal);
      bulkLessonCount += 1;
    }
  }
  return Object.freeze({ urgentSessionCount, bulkLessonCount, bulkEligible });
}
