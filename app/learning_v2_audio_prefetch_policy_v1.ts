export type LearningV2AudioPrefetchCoordinateV1 = Readonly<{
  lessonOrdinal: number;
  sessionOrdinal: number;
}>;

export type LearningV2AudioPrefetchNetworkV1 = Readonly<{
  type: string;
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  isConnectionExpensive: boolean | null;
}>;

const SESSIONS_PER_LESSON = 56;
const MAX_LESSON_ORDINAL = 32;

function nextCoordinate(
  coordinate: LearningV2AudioPrefetchCoordinateV1,
): LearningV2AudioPrefetchCoordinateV1 | null {
  if (coordinate.sessionOrdinal < SESSIONS_PER_LESSON) {
    return Object.freeze({
      lessonOrdinal: coordinate.lessonOrdinal,
      sessionOrdinal: coordinate.sessionOrdinal + 1,
    });
  }
  if (coordinate.lessonOrdinal >= MAX_LESSON_ORDINAL) return null;
  return Object.freeze({
    lessonOrdinal: coordinate.lessonOrdinal + 1,
    sessionOrdinal: 1,
  });
}

export function learningV2UrgentAudioCoordinatesV1(input: {
  readonly lessonOrdinal: number;
  readonly sessionOrdinal: number;
  readonly count: number;
  readonly isPublished: (lessonOrdinal: number, sessionOrdinal: number) => boolean;
}): readonly LearningV2AudioPrefetchCoordinateV1[] {
  if (
    !Number.isSafeInteger(input.lessonOrdinal) || input.lessonOrdinal < 1 || input.lessonOrdinal > MAX_LESSON_ORDINAL ||
    !Number.isSafeInteger(input.sessionOrdinal) || input.sessionOrdinal < 1 || input.sessionOrdinal > SESSIONS_PER_LESSON ||
    !Number.isSafeInteger(input.count) || input.count < 1 || input.count > 8
  ) throw new Error("learning_v2_audio_prefetch_policy_invalid");
  const result: LearningV2AudioPrefetchCoordinateV1[] = [];
  let coordinate: LearningV2AudioPrefetchCoordinateV1 | null = Object.freeze({
    lessonOrdinal: input.lessonOrdinal,
    sessionOrdinal: input.sessionOrdinal,
  });
  while (coordinate && result.length < input.count) {
    if (!input.isPublished(coordinate.lessonOrdinal, coordinate.sessionOrdinal)) break;
    result.push(coordinate);
    coordinate = nextCoordinate(coordinate);
  }
  return Object.freeze(result);
}

export function isLearningV2BulkAudioNetworkEligibleV1(
  network: LearningV2AudioPrefetchNetworkV1,
): boolean {
  return network.type === "wifi" &&
    network.isConnected === true &&
    network.isInternetReachable === true &&
    network.isConnectionExpensive === false;
}

export function isLearningV2UrgentAudioNetworkEligibleV1(
  network: LearningV2AudioPrefetchNetworkV1,
): boolean {
  return network.isConnected === true && network.isInternetReachable === true;
}
