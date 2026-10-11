export type LearningV2EnglishLexicalDensityPacketV2 = Readonly<{
  sessionId: string;
  lessonOrdinal: number;
  sessionWithinChapter: number;
  newLexicalSenseIds: readonly string[];
  retrievalLexicalSenseIds: readonly string[];
}>;

/**
 * Canonical English lexical-density policy.
 *
 * Lesson 4 has an owner-approved one-to-five-sense delta in every session,
 * including its seven checkpoints. Earlier and later checkpoints retain the
 * established retrieval-only rule. A non-checkpoint may deliberately perform
 * retrieval work without introducing another sense, but it may not be empty.
 */
export function learningV2EnglishLexicalDensityFindingsForPacketV2(
  packet: LearningV2EnglishLexicalDensityPacketV2,
): readonly string[] {
  if (packet.newLexicalSenseIds.length > 5) {
    return [`new_lexicon_above_five:${packet.sessionId}`];
  }

  if (packet.lessonOrdinal === 4) {
    return packet.newLexicalSenseIds.length >= 1
      ? []
      : [`lesson_four_new_lexicon_required:${packet.sessionId}`];
  }

  const isCheckpoint = packet.sessionWithinChapter === 8;
  if (isCheckpoint && packet.newLexicalSenseIds.length > 0) {
    return [`checkpoint_new_lexicon_forbidden:${packet.sessionId}`];
  }

  if (
    !isCheckpoint &&
    packet.newLexicalSenseIds.length === 0 &&
    packet.retrievalLexicalSenseIds.length === 0
  ) {
    return [`noncheckpoint_lexical_work_missing:${packet.sessionId}`];
  }

  return [];
}
