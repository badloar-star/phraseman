import { LEARNING_V2_ENGLISH_CHAPTER_BLUEPRINTS_V1 } from "./chapter_blueprints_en_v1";
import { LEARNING_V2_ENGLISH_EXACT_SESSION_PACKETS_V1 } from "./exact_session_packets_en_v1";
import { LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V1 } from "./grammar_operations_en_v1";
import { LEARNING_V2_ENGLISH_LEXICAL_SENSES_V1 } from "./lexical_senses_en_v1";

export const LEARNING_V2_ENGLISH_GRAMMAR_COVERAGE_MATRIX_V1 = Object.freeze(
  LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V1.map((operation) => {
    const introductionPacket = LEARNING_V2_ENGLISH_EXACT_SESSION_PACKETS_V1.find(
      (packet) => packet.grammarOperationId === operation.id,
    );
    return Object.freeze({
      grammarOperationId: operation.id,
      introductionSessionId: introductionPacket?.sessionId ?? null,
      reviewSessionIds: Object.freeze(LEARNING_V2_ENGLISH_EXACT_SESSION_PACKETS_V1
        .filter((packet) => packet.reviewConstructIds.includes(operation.id))
        .map((packet) => packet.sessionId)),
    });
  }),
);

export const LEARNING_V2_ENGLISH_LEXICAL_COVERAGE_MATRIX_V1 = Object.freeze(
  LEARNING_V2_ENGLISH_LEXICAL_SENSES_V1.map((sense) => {
    const introductionPacket = LEARNING_V2_ENGLISH_EXACT_SESSION_PACKETS_V1.find(
      (packet) => packet.newLexicalSenseIds.includes(sense.id),
    );
    return Object.freeze({
      lexicalSenseId: sense.id,
      introductionSessionId: introductionPacket?.sessionId ?? null,
      retrievalSessionIds: Object.freeze(LEARNING_V2_ENGLISH_EXACT_SESSION_PACKETS_V1
        .filter((packet) => packet.retrievalLexicalSenseIds.includes(sense.id))
        .map((packet) => packet.sessionId)),
    });
  }),
);

export const LEARNING_V2_ENGLISH_CAN_DO_COVERAGE_MATRIX_V1 = Object.freeze(
  LEARNING_V2_ENGLISH_CHAPTER_BLUEPRINTS_V1.map((chapter) => {
    const sessions = LEARNING_V2_ENGLISH_EXACT_SESSION_PACKETS_V1.filter(
      (packet) => packet.lessonOrdinal === chapter.lessonOrdinal && packet.chapterOrdinal === chapter.chapterOrdinal,
    );
    return Object.freeze({
      chapterId: chapter.chapterId,
      primaryCanDoStep: chapter.primaryCanDoStep,
      sessionIds: Object.freeze(sessions.map((packet) => packet.sessionId)),
      independentProbeSessionId: sessions.find(
        (packet) => packet.role === "checkpoint" || packet.role === "final_exam",
      )?.sessionId ?? null,
    });
  }),
);
