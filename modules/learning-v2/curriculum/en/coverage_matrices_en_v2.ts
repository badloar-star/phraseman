import { LEARNING_V2_ENGLISH_EXACT_SESSION_PACKETS_V2 } from "./exact_session_packets_en_v2";
import { LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V2 } from "./grammar_operations_en_v2";
import {
  LEARNING_V2_ENGLISH_LEXICAL_RETRIEVAL_EDGES_V2,
  LEARNING_V2_ENGLISH_LEXICAL_SENSES_V2,
} from "./lexical_senses_en_v2";

export type LearningV2EnglishGrammarCoverageRowV2 = Readonly<{
  operationId: string;
  introductionSessionId: string;
  guidedPracticeSessionIds: readonly string[];
  productionSessionIds: readonly string[];
  independentEvidenceSessionIds: readonly string[];
}>;

export type LearningV2EnglishLexicalCoverageRowV2 = Readonly<{
  senseId: string;
  introductionSessionId: string;
  groundedContactActivityIds: readonly string[];
  futureRetrievalSessionIds: readonly string[];
}>;

const unique = (values: readonly string[]): readonly string[] => Object.freeze([...new Set(values)]);

const sessionIdFromAbsoluteOrdinal = (absoluteOrdinal: number): string => {
  const lessonOrdinal = Math.floor((absoluteOrdinal - 1) / 56) + 1;
  const sessionOrdinal = ((absoluteOrdinal - 1) % 56) + 1;
  return `lesson-${String(lessonOrdinal).padStart(2, "0")}:session:${String(sessionOrdinal).padStart(2, "0")}`;
};

export const LEARNING_V2_ENGLISH_GRAMMAR_COVERAGE_MATRIX_V2: readonly LearningV2EnglishGrammarCoverageRowV2[] = Object.freeze(
  LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V2.map((operation) => {
    const introduction = LEARNING_V2_ENGLISH_EXACT_SESSION_PACKETS_V2.find(
      (packet) => packet.grammarOperationIds.includes(operation.id),
    );
    const reviewPackets = LEARNING_V2_ENGLISH_EXACT_SESSION_PACKETS_V2.filter(
      (packet) => packet.reviewOperationIds.includes(operation.id),
    );
    if (!introduction) throw new Error(`learning_v2_operation_introduction_missing:${operation.id}`);
    return Object.freeze({
      operationId: operation.id,
      introductionSessionId: introduction.sessionId,
      guidedPracticeSessionIds: unique(
        reviewPackets
          .filter((packet) => !["spoken_production", "checkpoint"].includes(packet.role))
          .map((packet) => packet.sessionId),
      ),
      productionSessionIds: unique(
        reviewPackets
          .filter((packet) => packet.role === "spoken_production")
          .map((packet) => packet.sessionId),
      ),
      independentEvidenceSessionIds: unique(
        reviewPackets
          .filter((packet) => packet.role === "checkpoint" || packet.activityPlan.some((activity) => activity.independentEvidence))
          .map((packet) => packet.sessionId),
      ),
    });
  }),
);

export const LEARNING_V2_ENGLISH_LEXICAL_COVERAGE_MATRIX_V2: readonly LearningV2EnglishLexicalCoverageRowV2[] = Object.freeze(
  LEARNING_V2_ENGLISH_LEXICAL_SENSES_V2.map((sense) => {
    const introductionSessionId = sessionIdFromAbsoluteOrdinal(sense.introductionAbsoluteSessionOrdinal);
    const introductionPacket = LEARNING_V2_ENGLISH_EXACT_SESSION_PACKETS_V2.find(
      (packet) => packet.sessionId === introductionSessionId,
    );
    if (!introductionPacket) throw new Error(`learning_v2_lexical_introduction_packet_missing:${sense.id}`);
    const groundedContactActivityIds = introductionPacket.activityPlan
      .filter((activity) => !activity.scored && activity.targetLexicalSenseIds.includes(sense.id))
      .map((activity) => `${introductionPacket.sessionId}:activity:${String(activity.slot).padStart(2, "0")}`);
    return Object.freeze({
      senseId: sense.id,
      introductionSessionId,
      groundedContactActivityIds: Object.freeze(groundedContactActivityIds),
      futureRetrievalSessionIds: unique(
        LEARNING_V2_ENGLISH_LEXICAL_RETRIEVAL_EDGES_V2
          .filter((edge) => edge.senseId === sense.id)
          .map((edge) => sessionIdFromAbsoluteOrdinal(edge.targetAbsoluteSessionOrdinal)),
      ),
    });
  }),
);

export const LEARNING_V2_ENGLISH_COVERAGE_MATRICES_V2 = Object.freeze({
  grammar: LEARNING_V2_ENGLISH_GRAMMAR_COVERAGE_MATRIX_V2,
  lexical: LEARNING_V2_ENGLISH_LEXICAL_COVERAGE_MATRIX_V2,
});
