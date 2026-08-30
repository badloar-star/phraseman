import { hashCanonicalBody } from "../../policies/decision_registry";
import { LEARNING_V2_ENGLISH_CHAPTER_BLUEPRINTS_V1 } from "./chapter_blueprints_en_v1";
import { LEARNING_V2_ENGLISH_EXACT_SESSION_PACKETS_V1 } from "./exact_session_packets_en_v1";
import { LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V1 } from "./grammar_operations_en_v1";
import {
  LEARNING_V2_ENGLISH_LEXICAL_RETRIEVAL_EDGES_V1,
  LEARNING_V2_ENGLISH_LEXICAL_SENSES_V1,
} from "./lexical_senses_en_v1";
import { LEARNING_V2_ENGLISH_GRAMMAR_PREREQUISITE_DAG_V1 } from "./prerequisite_dag_en_v1";
import {
  LEARNING_V2_ENGLISH_CAN_DO_COVERAGE_MATRIX_V1,
  LEARNING_V2_ENGLISH_GRAMMAR_COVERAGE_MATRIX_V1,
  LEARNING_V2_ENGLISH_LEXICAL_COVERAGE_MATRIX_V1,
} from "./coverage_matrices_en_v1";

const body = Object.freeze({
  schemaVersion: "learning-v2-english-course-blueprint.v1" as const,
  targetLanguage: "en" as const,
  interfaceLocaleAuthority: "eight-locales-required-at-learner-authoring" as const,
  lessonCount: 32 as const,
  chapterCount: LEARNING_V2_ENGLISH_CHAPTER_BLUEPRINTS_V1.length,
  sessionPacketCount: LEARNING_V2_ENGLISH_EXACT_SESSION_PACKETS_V1.length,
  grammarOperations: LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V1,
  grammarPrerequisiteDag: LEARNING_V2_ENGLISH_GRAMMAR_PREREQUISITE_DAG_V1,
  lexicalSenses: LEARNING_V2_ENGLISH_LEXICAL_SENSES_V1,
  lexicalRetrievalEdges: LEARNING_V2_ENGLISH_LEXICAL_RETRIEVAL_EDGES_V1,
  chapters: LEARNING_V2_ENGLISH_CHAPTER_BLUEPRINTS_V1,
  sessionPackets: LEARNING_V2_ENGLISH_EXACT_SESSION_PACKETS_V1,
  coverageMatrices: Object.freeze({
    grammar: LEARNING_V2_ENGLISH_GRAMMAR_COVERAGE_MATRIX_V1,
    lexical: LEARNING_V2_ENGLISH_LEXICAL_COVERAGE_MATRIX_V1,
    canDo: LEARNING_V2_ENGLISH_CAN_DO_COVERAGE_MATRIX_V1,
  }),
});

export const LEARNING_V2_ENGLISH_COURSE_BLUEPRINT_V1 = Object.freeze({
  ...body,
  blueprintFingerprint: hashCanonicalBody(body),
  ownerApproval: "APPROVED" as const,
});
